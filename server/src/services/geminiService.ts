import { Subject, Exam, Task, StudyPlan } from '../db/dbAdapter';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface GeneratedPlan {
  startDate: string;
  endDate: string;
  schedule: Array<{
    date: string;
    slots: Array<{
      subjectId: string;
      subjectName: string;
      color: string;
      topic: string;
      duration: number; // minutes
      type: 'study' | 'revision' | 'buffer';
    }>;
  }>;
  prioritizedSubjects: string[];
  revisionStrategy: string;
}

class GeminiService {
  private ai: GoogleGenerativeAI | null = null;
  private isMock = true;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.ai = new GoogleGenerativeAI(apiKey);
        this.isMock = false;
        console.log('Gemini AI Client initialized successfully.');
      } catch (err) {
        console.error('Failed to initialize Gemini Client. Falling back to Mock AI.', err);
        this.isMock = true;
      }
    } else {
      console.log('Gemini API Key missing. Running in Mock AI fallback mode.');
      this.isMock = true;
    }
  }

  // Helper to extract JSON block from markdown strings
  private extractJSON(text: string): any {
    try {
      // Find JSON block markdown format (```json ... ```)
      const regex = /```json\s*([\s\S]*?)\s*```/;
      const match = text.match(regex);
      const jsonStr = match ? match[1] : text;
      return JSON.parse(jsonStr.trim());
    } catch (err) {
      console.error('Failed to parse JSON from AI response. Raw response:', text);
      throw new Error('AI response was not in valid JSON format.');
    }
  }

  // ==================== GENERATE STUDY TIMETABLE ====================
  async generateStudyPlan(
    subjects: Subject[],
    exams: Exam[],
    config: {
      dailyHours: number;
      weakSubjects: string[];
      preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night';
      breakDuration: number;
      startDate: string;
      endDate: string;
    }
  ): Promise<GeneratedPlan> {
    if (this.isMock) {
      return this.mockStudyPlan(subjects, exams, config);
    }

    try {
      const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are an expert academic advisor. Generate a highly optimized study plan for a student.
        
        Subjects:
        ${JSON.stringify(subjects.map(s => ({ id: s.id, name: s.name, difficulty: s.difficulty_level, credits: s.credits, priority: s.priority })))}
        
        Exams:
        ${JSON.stringify(exams.map(e => ({ subjectId: e.subject_id, examDate: e.exam_date, weightage: e.weightage })))}
        
        Student Parameters:
        - Start Date: ${config.startDate}
        - End Date: ${config.endDate}
        - Available Study Hours Per Day: ${config.dailyHours}
        - Weak Subjects (need extra focus): ${config.weakSubjects.join(', ') || 'None'}
        - Preferred Study Time: ${config.preferredStudyTime}
        - Break Duration: ${config.breakDuration} minutes
        
        Instructions:
        1. Schedule study sessions between the Start Date and End Date.
        2. Prioritize study hours based on exam date proximity, exam weight, subject priority, credits, and weak subjects.
        3. Dedicate 20% of study time for "revision" sessions, especially close to exams.
        4. Allocate the last 2 days before any exam as "buffer/revision" days dedicated exclusively to that exam's subject.
        5. For each scheduled day, provide a list of time slots. Each slot needs subjectId, subjectName, topic, duration (in minutes, usually 45-120 mins depending on dailyHours), and session type ("study" or "revision" or "buffer").
        6. Keep session slots reasonable (e.g. if daily hours is 4 hours, split into 2-3 sessions).
        
        Return ONLY a JSON object in the following format (no other text, no markdown wrappers except standard json code block):
        {
          "startDate": "YYYY-MM-DD",
          "endDate": "YYYY-MM-DD",
          "schedule": [
            {
              "date": "YYYY-MM-DD",
              "slots": [
                {
                  "subjectId": "subject_id_here",
                  "subjectName": "Subject Name",
                  "color": "color_code_matching_subject",
                  "topic": "Topic or Unit description to study",
                  "duration": 90,
                  "type": "study"
                }
              ]
            }
          ],
          "prioritizedSubjects": ["Subject Name 1", "Subject Name 2"],
          "revisionStrategy": "Text description of the AI recommended revision strategy"
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const plan = this.extractJSON(text);

      // Map colors back to plans if missing
      plan.schedule.forEach((day: any) => {
        day.slots.forEach((slot: any) => {
          const matchingSubject = subjects.find(s => s.id === slot.subjectId || s.name === slot.subjectName);
          slot.color = matchingSubject ? matchingSubject.color : '#6366f1';
          if (matchingSubject && !slot.subjectId) slot.subjectId = matchingSubject.id;
        });
      });

      return plan;
    } catch (err) {
      console.error('Gemini generateStudyPlan error, falling back to mock.', err);
      return this.mockStudyPlan(subjects, exams, config);
    }
  }

  // ==================== GENERATE QUIZ FROM UPLOADED NOTES ====================
  async generateQuiz(notesText: string, numberOfQuestions = 5): Promise<QuizQuestion[]> {
    if (this.isMock || !notesText.trim()) {
      return this.mockQuiz(notesText, numberOfQuestions);
    }

    try {
      const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are an educator. Generate a multiple-choice quiz of exactly ${numberOfQuestions} questions based on the following notes.
        
        Notes:
        ${notesText.substring(0, 8000)}
        
        Instructions:
        1. Formulate clear, educational questions testing understanding of concepts inside the notes.
        2. For each question, provide 4 options.
        3. Identify the correct answer by its index (0, 1, 2, or 3).
        4. Add a short explanation explaining why that option is correct.
        
        Return ONLY a JSON array in this format (no other text):
        [
          {
            "question": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswerIndex": 1,
            "explanation": "Why Option B is correct."
          }
        ]
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return this.extractJSON(text);
    } catch (err) {
      console.error('Gemini generateQuiz error, falling back to mock.', err);
      return this.mockQuiz(notesText, numberOfQuestions);
    }
  }

  // ==================== SUMMARIZE SYLLABUS / EXTRACT UNITS ====================
  async extractSyllabusUnits(syllabusText: string): Promise<string[]> {
    if (this.isMock || !syllabusText.trim()) {
      return this.mockSyllabusUnits(syllabusText);
    }

    try {
      const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are a syllabus parser. Analyze the text below and extract a list of major chapters, units, or modules.
        
        Syllabus Text:
        ${syllabusText.substring(0, 10000)}
        
        Instructions:
        Extract between 5 to 12 distinct unit or chapter titles. Keep them short, clean and professional.
        
        Return ONLY a JSON array of strings in this format:
        [
          "Unit 1: Introduction to Mechanics",
          "Unit 2: Kinematics of Particles"
        ]
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return this.extractJSON(text);
    } catch (err) {
      console.error('Gemini extractSyllabusUnits error, falling back to mock.', err);
      return this.mockSyllabusUnits(syllabusText);
    }
  }

  // ==================== ASK CHAT ASSISTANT ====================
  async askAssistant(
    message: string,
    history: Array<{ role: 'user' | 'model'; parts: string }>,
    contextData?: { subjects: Subject[]; exams: Exam[]; recentTasks: Task[] }
  ): Promise<string> {
    if (this.isMock) {
      return this.mockAssistantReply(message, contextData);
    }

    try {
      const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Build system prompt based on dashboard context
      const systemPrompt = `
        You are "Aegis", an advanced AI academic coach and study planner assistant for college students.
        Your goals are:
        - Explain complex academic concepts clearly and simply.
        - Suggest efficient study techniques (like Active Recall, Spaced Repetition, Pomodoro, Feynman Technique).
        - Help prioritize study schedules and suggest realistic revision goals.
        - Motivate students who are feeling stressed, burned out, or lagging.
        - Answer concisely using nice markdown formatting (bullet points, bold text).
        
        Student Context:
        - Currently studying: ${JSON.stringify(contextData?.subjects.map(s => s.name) || [])}
        - Upcoming exams: ${JSON.stringify(contextData?.exams.map(e => ({ name: e.name, date: e.exam_date })) || [])}
        - Task checklist status: ${JSON.stringify(contextData?.recentTasks.slice(0, 5).map(t => ({ title: t.title, status: t.status })) || [])}
      `;

      const chatSession = model.startChat({
        history: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: "Understood. I am Aegis, your AI study assistant. Ready to help!" }] },
          ...history.map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.parts }]
          }))
        ]
      });

      const response = await chatSession.sendMessage(message);
      return response.response.text();
    } catch (err) {
      console.error('Gemini askAssistant error, falling back to mock.', err);
      return this.mockAssistantReply(message, contextData);
    }
  }

  // ==================== ADAPTIVE RESCHEDULING ====================
  async adaptiveReschedule(
    currentPlan: StudyPlan,
    missedTasks: Task[],
    availableDaysLeft: number
  ): Promise<any> {
    // Generates a revised schedule shifts for missed items
    if (this.isMock) {
      const updatedSchedule = [...currentPlan.schedule];
      // For each missed task, find the first available slot in the future and prepend/insert
      missedTasks.forEach(task => {
        // Find tomorrow or subsequent days and add a slot
        if (updatedSchedule.length > 0) {
          const firstDaySlots = updatedSchedule[0].slots;
          const alreadyExists = firstDaySlots.some((s: any) => s.topic.includes(task.title));
          if (!alreadyExists) {
            firstDaySlots.unshift({
              subjectId: task.subject_id,
              subjectName: 'Rescheduled: ' + task.title,
              color: '#ef4444',
              topic: `Missed Review: ${task.title} (AI Shifted)`,
              duration: task.duration_minutes || 60,
              type: 'study'
            });
          }
        }
      });
      return updatedSchedule;
    }

    try {
      const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        A student has missed several critical tasks. Please reschedule them intelligently within their study calendar.
        
        Current Schedule (next few days):
        ${JSON.stringify(currentPlan.schedule.slice(0, 5))}
        
        Missed Tasks to integrate:
        ${JSON.stringify(missedTasks.map(t => ({ title: t.title, subjectId: t.subject_id, duration: t.duration_minutes })))}
        
        Instructions:
        1. Fit the missed tasks into the upcoming daily schedules without overloading study hours.
        2. If necessary, replace generic revision slots with these specific missed topics.
        3. Return ONLY a revised array of the schedule objects (same slots schema).
        
        Format output strictly as JSON array:
        [
          {
            "date": "YYYY-MM-DD",
            "slots": [
              {
                "subjectId": "...",
                "subjectName": "...",
                "color": "...",
                "topic": "...",
                "duration": 60,
                "type": "..."
              }
            ]
          }
        ]
      `;
      const result = await model.generateContent(prompt);
      return this.extractJSON(result.response.text());
    } catch (err) {
      console.error('Gemini adaptiveReschedule error, falling back to mock logic.');
      return currentPlan.schedule;
    }
  }

  // ==================== MOCK FALLBACK IMPLEMENTATIONS ====================

  private mockStudyPlan(subjects: Subject[], exams: Exam[], config: any): GeneratedPlan {
    const schedule: GeneratedPlan['schedule'] = [];
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const dateDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    // Determine weak subjects first
    const weakSet = new Set(config.weakSubjects || []);

    // Create schedule for each day
    for (let i = 0; i < dateDiff; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      // Schedule slots
      const slots: any[] = [];
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const hoursToStudy = isWeekend ? config.dailyHours + 1 : Math.max(1, config.dailyHours);

      // Divide hours into 60-90 min slots
      let allocatedHours = 0;
      let subjectIndex = i; // Rotate subjects day-to-day

      while (allocatedHours < hoursToStudy && subjects.length > 0) {
        const sub = subjects[subjectIndex % subjects.length];
        const duration = Math.min(90, (hoursToStudy - allocatedHours) * 60);

        // Check if there's an exam for this subject soon (within next 3 days)
        const closeExam = exams.find(e => {
          const exDate = new Date(e.exam_date);
          const daysLeft = Math.ceil((exDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
          return e.subject_id === sub.id && daysLeft >= 0 && daysLeft <= 3;
        });

        let type: 'study' | 'revision' | 'buffer' = 'study';
        let topic = `Chapter ${Math.floor(i / subjects.length) + 1} core concepts`;

        if (closeExam) {
          type = 'buffer';
          topic = `EXAM REHEARSAL: ${closeExam.name} Past Papers & Intensive Review`;
        } else if (weakSet.has(sub.id) || weakSet.has(sub.name)) {
          type = 'study';
          topic = `Deep Dive: Key weaknesses in ${sub.name}`;
        } else if (i % 3 === 0) {
          type = 'revision';
          topic = `Spaced Repetition: Active Recall for Unit ${Math.floor(i / subjects.length) + 1}`;
        }

        slots.push({
          subjectId: sub.id,
          subjectName: sub.name,
          color: sub.color,
          topic,
          duration,
          type
        });

        allocatedHours += duration / 60;
        subjectIndex++;
      }

      schedule.push({
        date: dateString,
        slots
      });
    }

    return {
      startDate: config.startDate,
      endDate: config.endDate,
      schedule,
      prioritizedSubjects: subjects.map(s => s.name).slice(0, 2),
      revisionStrategy: "Spaced Repetition. Focus 1.5x study hours on highlighted weak subjects. Use Pomodoro intervals for hard subjects."
    };
  }

  private mockQuiz(notesText: string, count: number): QuizQuestion[] {
    const genericQuestions: QuizQuestion[] = [
      {
        question: "Which of the following describes the Feynman Technique?",
        options: [
          "Re-reading textbooks multiple times.",
          "Explaining a concept in simple terms as if teaching it to a child.",
          "Studying for 25 minutes followed by a 5 minute break.",
          "Creating colorful mind-maps for memorization."
        ],
        correctAnswerIndex: 1,
        explanation: "The Feynman Technique focuses on active explanation to identify gaps in your own understanding."
      },
      {
        question: "How does Spaced Repetition optimize memory retention?",
        options: [
          "By cramming all study material into a single 12-hour session.",
          "By reviewing information at increasing intervals to combat the forgetting curve.",
          "By writing notes word-for-word from lectures.",
          "By listening to classical music while studying."
        ],
        correctAnswerIndex: 1,
        explanation: "Spaced Repetition exploits the psychological spacing effect, prompting reviews right before you are likely to forget."
      },
      {
        question: "In the Pomodoro Technique, what is a standard long break frequency?",
        options: [
          "After every single study interval.",
          "After completing 4 pomodoros (study cycles).",
          "Only once at the end of the day.",
          "Every 30 minutes."
        ],
        correctAnswerIndex: 1,
        explanation: "A standard Pomodoro cycle suggests a 15-30 minute long break after every four 25-minute study sessions."
      },
      {
        question: "What is Active Recall?",
        options: [
          "Passively highlight key terms in your syllabus.",
          "Actively testing your brain to retrieve information rather than just reading it.",
          "Memorizing text by writing it out 10 times.",
          "Reviewing notes right before sleeping."
        ],
        correctAnswerIndex: 1,
        explanation: "Active Recall forces the brain to retrieve information from memory, strengthening neural connections."
      },
      {
        question: "What is the primary benefit of adding 'Buffer Days' to a study schedule?",
        options: [
          "To allow students to skip studying entirely.",
          "To absorb delays from difficult topics, unexpected events, or rest without ruining the plan.",
          "To study new chapters at the last minute.",
          "To write assignments."
        ],
        correctAnswerIndex: 1,
        explanation: "Buffer days create a safety margin, preventing a cascade of delayed tasks when life events or tough concepts slow progress."
      }
    ];

    // Slice to count
    return genericQuestions.slice(0, count);
  }

  private mockSyllabusUnits(text: string): string[] {
    return [
      "Unit 1: Foundations & Key Terminology",
      "Unit 2: Core Theoretical Frameworks",
      "Unit 3: Practical Applications & Methodology",
      "Unit 4: Advanced Systems Analysis",
      "Unit 5: Capstone Case Studies & Revision"
    ];
  }

  private mockAssistantReply(message: string, context?: any): string {
    const msg = message.toLowerCase();
    if (msg.includes('spaced repetition') || msg.includes('revision')) {
      return `### Spaced Repetition Guide 📚\n\nSpaced Repetition is a highly efficient learning technique where you review material at increasing intervals (e.g., Day 1, Day 3, Day 7, Day 14, Day 30) to interrupt the **Forgetting Curve**.\n\n**AI Recommendation for your subjects:**\n- Review easy topics at longer intervals.\n- Flag hard subjects (like ${context?.subjects[0]?.name || 'your major subject'}) and schedule reviews every 2 days.\n- Use **Active Recall** (quizzes, flashcards) during these revision slots rather than passive re-reading.`;
    }
    if (msg.includes('pomodoro') || msg.includes('timer')) {
      return `### The Pomodoro Technique ⏱️\n\nTo make the most of your study sessions, use our **Pomodoro Timer**:\n\n1. **Choose a task** (e.g., draft introduction for research paper).\n2. **Set the timer to 25 minutes** (1 Pomodoro).\n3. **Work with intense focus** until the buzzer sounds.\n4. **Take a 5-minute break** to walk around, hydrate, or stretch.\n5. **After 4 rounds**, take a longer **15-30 minute break**.\n\n*Tip: Try the 50/10 mode in our Pomodoro panel if you prefer longer, deep-work sessions!*`;
    }
    if (msg.includes('motivate') || msg.includes('motivation') || msg.includes('stress') || msg.includes('tired')) {
      return `### You've Got This! 💪✨\n\nRemember, **progress is progress**, no matter how small. College can be overwhelming, but breaking your syllabus down into bite-sized units is the key to conquering it.\n\n**A quick boost for today:**\n- You have upcoming tasks to check off. Checking off just **one task** triggers dopamine that helps you finish the next.\n- Keep your streak alive! You're building habits that will serve you long after this semester.\n- Go take a 5-minute walk, drink a glass of water, and tackle your next 25-minute Pomodoro!`;
    }
    if (msg.includes('feynman') || msg.includes('explain')) {
      return `### The Feynman Technique 🧠\n\nNamed after physicist Richard Feynman, this technique is the ultimate check for deep understanding:\n\n1. **Write down** the name of the concept on a blank sheet.\n2. **Explain it in simple language** as if you were teaching it to a 10-year-old child.\n3. **Identify gaps** in your explanation (where you get stuck or start using complex jargon).\n4. **Go back to the source material** to fill in those gaps until you can explain it effortlessly.`;
    }

    return `Hello! I'm **Aegis**, your AI Study Assistant. 🎓\n\nI can help you with:\n- 💡 **Explaining difficult concepts** (e.g., "Explain Feynman technique" or "How does Spaced Repetition work?")\n- 📝 **Generating practice quizzes** (e.g., "Give me a study quiz")\n- ⏱️ **Optimal Study Habits** (e.g., "Tell me about Pomodoro cycle")\n- 🔥 **Motivation & Tips** when you feel stuck or tired.\n\nFeel free to ask any academic question!`;
  }
}

export const gemini = new GeminiService();

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
  private _isMock = true;

  private get isMock(): boolean {
    this.initAI();
    return this._isMock;
  }

  private initAI() {
    if (this.ai) return;

    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`[Diagnostic] GEMINI_API_KEY loaded: ${!!apiKey}`);

    if (apiKey) {
      try {
        this.ai = new GoogleGenerativeAI(apiKey);
        this._isMock = false;
        console.log('Gemini AI Client initialized successfully.');
      } catch (err) {
        console.error('Failed to initialize Gemini Client. Falling back to Mock AI.', err);
        this._isMock = true;
      }
    } else {
      console.log('Gemini API Key missing. Running in Mock AI fallback mode.');
      this._isMock = true;
    }
  }

  constructor() {
    this.initAI();
  }

  getAIClient(): GoogleGenerativeAI | null {
    this.initAI();
    return this.ai;
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
    contextData?: any
  ): Promise<string> {
    if (this.isMock) {
      return this.mockAssistantReply(message, contextData);
    }

    try {
      const systemPrompt = `You are Aegis, an AI Study Assistant.
Your job is to help students understand subjects, create study plans, generate quizzes, explain difficult concepts, recommend study techniques, and provide motivation.

IMPORTANT:
- Answer the user's CURRENT question directly.
- Do not repeat the welcome message after the conversation has started.
- Do not give generic responses when the user has asked a specific question.
- Remember the previous conversation context.
- Give concise but useful student-friendly answers.
- Use headings, numbered lists, examples, and tables when helpful.
- If the user asks for study methods, explain the methods with how and when to use them.
- If the user asks for a quiz, generate questions instead of explaining what you can do.
- If the user asks for a study plan, create an actual study plan based on the information provided.
- Only show a greeting/welcome message for the initial empty chat.

Student Context:
- Currently studying subjects: ${JSON.stringify(contextData?.subjects?.map((s: any) => s.name) || [])}
- Upcoming exams: ${JSON.stringify(contextData?.exams?.map((e: any) => ({ name: e.name, date: e.exam_date })) || [])}
- Task checklist status: ${JSON.stringify(contextData?.recentTasks?.slice(0, 5).map((t: any) => ({ title: t.title, status: t.status })) || [])}
- Predicted GPA / Grade: ${contextData?.predictedGpa || 'N/A'} (${contextData?.predictedGrade || 'N/A'})
- Automatically detected weak subjects: ${JSON.stringify(contextData?.weakTopics || [])}
- Total hours studied this week: ${contextData?.studyHoursCount || 0} hours`;

      const model = this.ai!.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        systemInstruction: systemPrompt
      });

      const chatSession = model.startChat({
        history: history.map(h => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.parts }]
        }))
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

  // ==================== AI PERFORMANCE PREDICTION ====================
  async predictPerformance(
    subjects: Subject[],
    exams: Exam[],
    tasks: Task[],
    progressLogs: any[]
  ): Promise<{ predictedGpa: number; grade: string; confidence: number; interpretation: string; factors: Array<{ name: string; impact: 'positive' | 'negative'; description: string }> }> {
    if (this.isMock) {
      return this.mockPredictPerformance(subjects, exams, tasks, progressLogs);
    }
    try {
      const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are an educational data analyst. Predict a college student's academic GPA (0.0 to 4.0 scale) and letter grade based on their database activity.
        
        Subjects (with class grade):
        ${JSON.stringify(subjects.map(s => ({ name: s.name, credits: s.credits, grade: s.current_grade })))}
        
        Exams (with scored grades):
        ${JSON.stringify(exams.map(e => ({ name: e.name, weight: e.weightage, score: e.score })))}
        
        Tasks Checklist:
        ${JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, actualDuration: t.actual_duration_minutes, plannedDuration: t.duration_minutes })))}
        
        Study Logs (daily hours, productivity):
        ${JSON.stringify(progressLogs.slice(-10))}

        Instructions:
        1. Perform a predictive analysis.
        2. Output a predicted GPA between 0.0 and 4.0.
        3. Convert GPA to an overall letter grade (A+, A, B+, B, C+, C, D, F).
        4. Give a prediction confidence percentage (0-100%).
        5. Provide a short interpretation of the student's trajectory.
        6. Identify 3-4 key factors (consistency, task completions, exam scores, focus hours) and categorise them as positive or negative impacts.
        
        Return ONLY a JSON object in this format:
        {
          "predictedGpa": 3.6,
          "grade": "A-",
          "confidence": 85,
          "interpretation": "A short summary...",
          "factors": [
            { "name": "Factor Title", "impact": "positive", "description": "Details..." }
          ]
        }
      `;
      const result = await model.generateContent(prompt);
      return this.extractJSON(result.response.text());
    } catch (err) {
      console.error('Gemini predictPerformance error, falling back to mock.', err);
      return this.mockPredictPerformance(subjects, exams, tasks, progressLogs);
    }
  }

  // ==================== AI WEAK TOPIC DETECTION ====================
  async detectWeakTopics(
    subjects: Subject[],
    exams: Exam[],
    tasks: Task[],
    progressLogs: any[]
  ): Promise<Array<{ subjectId: string; subjectName: string; score: number; completedTaskRatio: number; reason: string; recommendedFirstSteps: string[] }>> {
    if (this.isMock) {
      return this.mockDetectWeakTopics(subjects, exams, tasks, progressLogs);
    }
    try {
      const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are a learning diagnostics bot. Identify which subjects or topics the student is struggling with based on their stats.
        
        Subjects:
        ${JSON.stringify(subjects.map(s => ({ id: s.id, name: s.name, grade: s.current_grade, priority: s.priority })))}
        
        Exams:
        ${JSON.stringify(exams.map(e => ({ subjectId: e.subject_id, name: e.name, score: e.score })))}
        
        Tasks Checklist:
        ${JSON.stringify(tasks.map(t => ({ subjectId: t.subject_id, status: t.status })))}
        
        Instructions:
        1. Compare performance across all subjects.
        2. Detect weak areas where exam scores are < 75%, class grades are < 75%, or task completion rates are < 50%.
        3. For each weak subject, calculate a normalized score/health percentage.
        4. Specify the exact reason (e.g. low quiz scores, missed checklist deadlines).
        5. Offer 2 concrete learning recommendations (Feynman teaching, active quizzes, review specific topics).
        
        Return ONLY a JSON array of objects:
        [
          {
            "subjectId": "...",
            "subjectName": "...",
            "score": 64,
            "completedTaskRatio": 0.35,
            "reason": "Explain why...",
            "recommendedFirstSteps": ["Step 1...", "Step 2..."]
          }
        ]
      `;
      const result = await model.generateContent(prompt);
      return this.extractJSON(result.response.text());
    } catch (err) {
      console.error('Gemini detectWeakTopics error, falling back.', err);
      return this.mockDetectWeakTopics(subjects, exams, tasks, progressLogs);
    }
  }

  // ==================== AI PERSONALIZED RECOMMENDATIONS ====================
  async getRecommendations(
    subjects: Subject[],
    exams: Exam[],
    tasks: Task[],
    progressLogs: any[]
  ): Promise<Array<{ type: string; title: string; priority: 'low' | 'medium' | 'high'; description: string; topic?: string; subjectId?: string }>> {
    if (this.isMock) {
      return this.mockGetRecommendations(subjects, exams, tasks, progressLogs);
    }
    try {
      const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are a study recommendation engine. Suggest the next 3 study actions for the student.
        
        Subjects:
        ${JSON.stringify(subjects.map(s => ({ id: s.id, name: s.name, grade: s.current_grade, difficulty: s.difficulty_level })))}
        
        Exams:
        ${JSON.stringify(exams.map(e => ({ name: e.name, date: e.exam_date, weight: e.weightage, score: e.score })))}
        
        Tasks Checklist:
        ${JSON.stringify(tasks.map(t => ({ title: t.title, status: t.status, dueDate: t.due_date, subjectId: t.subject_id })))}
        
        Instructions:
        Select the most critical items to study next, based on:
        - Proximity of exams (if an exam is in < 5 days, it is high priority).
        - Low classroom/exam grades (focus on weak areas).
        - Lagging checklist tasks.
        - Recommend specific Pomodoro intervals, revision slots, or concept explanations.
        
        Return ONLY a JSON array in this format:
        [
          {
            "type": "exam_prep" | "task_checklist" | "weakness_review" | "pomodoro_focus",
            "title": "Short title",
            "priority": "high" | "medium" | "low",
            "description": "Actionable instructions...",
            "topic": "Topic/Chapter name",
            "subjectId": "subject_id_or_empty"
          }
        ]
      `;
      const result = await model.generateContent(prompt);
      return this.extractJSON(result.response.text());
    } catch (err) {
      console.error('Gemini getRecommendations error, falling back.', err);
      return this.mockGetRecommendations(subjects, exams, tasks, progressLogs);
    }
  }

  // ==================== AI DIFFICULTY ESTIMATION ====================
  async estimateDifficulty(
    subjects: Subject[],
    tasks: Task[],
    exams: Exam[]
  ): Promise<Array<{ subjectId: string; subjectName: string; estimatedDifficulty: 'easy' | 'medium' | 'hard'; confidence: number; explanation: string }>> {
    if (this.isMock) {
      return this.mockEstimateDifficulty(subjects, tasks, exams);
    }
    try {
      const model = this.ai!.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        You are a cognitive load estimator. Assess the subjective difficulty of subjects for this student.
        
        Subjects:
        ${JSON.stringify(subjects.map(s => ({ id: s.id, name: s.name, initialDifficulty: s.difficulty_level })))}
        
        Tasks (specifically check planned duration vs actual duration):
        ${JSON.stringify(tasks.map(t => ({ subjectId: t.subject_id, planned: t.duration_minutes, actual: t.actual_duration_minutes })))}
        
        Exams (scores):
        ${JSON.stringify(exams.map(e => ({ subjectId: e.subject_id, score: e.score })))}
        
        Instructions:
        1. If actual duration is significantly higher than planned (>20%), the student is struggling, indicating high difficulty.
        2. If exam scores/grades are low (<70%), it is difficult for them.
        3. Output an estimated difficulty ('easy' | 'medium' | 'hard') with confidence (0-100) and a brief reason.
        
        Return ONLY a JSON array of objects:
        [
          {
            "subjectId": "...",
            "subjectName": "...",
            "estimatedDifficulty": "hard",
            "confidence": 78,
            "explanation": "Brief description..."
          }
        ]
      `;
      const result = await model.generateContent(prompt);
      return this.extractJSON(result.response.text());
    } catch (err) {
      console.error('Gemini estimateDifficulty error, falling back.', err);
      return this.mockEstimateDifficulty(subjects, tasks, exams);
    }
  }

  // ==================== MOCK FALLBACK IMPLEMENTATIONS ====================

  private mockStudyPlan(subjects: Subject[], exams: Exam[], config: any): GeneratedPlan {
    const schedule: GeneratedPlan['schedule'] = [];
    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const dateDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    // Calculate priority weights dynamically for study time allocation optimization!
    const subjectWeights = subjects.map(sub => {
      let weight = sub.credits * 1.5; // weight from credits
      
      // weight from priority
      if (sub.priority === 'high') weight += 3;
      if (sub.priority === 'medium') weight += 1.5;
      
      // weight from classroom grade (lower grade = higher priority study)
      if (sub.current_grade !== undefined && sub.current_grade !== null) {
        if (sub.current_grade < 70) weight += 4;
        else if (sub.current_grade < 80) weight += 2;
        else if (sub.current_grade > 90) weight -= 1; // self-paced
      }
      
      // Check if there is an exam close by
      const subExams = exams.filter(e => e.subject_id === sub.id);
      let closestDays = 999;
      subExams.forEach(e => {
        const diff = Math.ceil((new Date(e.exam_date).getTime() - start.getTime()) / (1000 * 3600 * 24));
        if (diff >= 0 && diff < closestDays) {
          closestDays = diff;
        }
      });
      
      if (closestDays <= 3) weight += 6;
      else if (closestDays <= 7) weight += 3;
      
      return {
        subject: sub,
        weight: Math.max(1, weight)
      };
    });

    // Create schedule for each day
    for (let i = 0; i < dateDiff; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      // Schedule slots
      const slots: any[] = [];
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const hoursToStudy = isWeekend ? config.dailyHours + 1 : Math.max(1, config.dailyHours);

      // Distribute slots based on priority weights
      let allocatedMinutes = 0;
      const totalMinutes = hoursToStudy * 60;
      
      // Sort subjects for this day to prioritize higher weight items
      const daySubjects = [...subjectWeights]
        .sort((a, b) => b.weight - a.weight)
        .map(sw => {
          // Adjust weight dynamically based on exam distance from current slot date
          let activeWeight = sw.weight;
          const subExams = exams.filter(e => e.subject_id === sw.subject.id);
          subExams.forEach(e => {
            const diff = Math.ceil((new Date(e.exam_date).getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
            if (diff >= 0 && diff <= 2) activeWeight += 8; // last-minute prep boost
          });
          return { ...sw, activeWeight };
        })
        .sort((a, b) => b.activeWeight - a.activeWeight);

      let subIdx = 0;
      while (allocatedMinutes < totalMinutes && subIdx < daySubjects.length) {
        const { subject: sub, activeWeight } = daySubjects[subIdx];
        
        // Calculate dynamic duration proportion
        const proportion = activeWeight / daySubjects.reduce((s, d) => s + d.activeWeight, 0);
        let duration = Math.round(totalMinutes * proportion);
        
        // Clamp duration to 45-120 minute ranges
        duration = Math.max(45, Math.min(120, duration));
        if (allocatedMinutes + duration > totalMinutes) {
          duration = totalMinutes - allocatedMinutes;
        }
        
        if (duration < 30) {
          break; // too short to record
        }

        // Check close exam
        const closeExam = exams.find(e => {
          const exDate = new Date(e.exam_date);
          const daysLeft = Math.ceil((exDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
          return e.subject_id === sub.id && daysLeft >= 0 && daysLeft <= 3;
        });

        let type: 'study' | 'revision' | 'buffer' = 'study';
        let topic = `Unit review and syllabus checklist practice`;

        if (closeExam) {
          type = 'buffer';
          topic = `EXAM CRAM SESSION: Solve past papers for ${closeExam.name}`;
        } else if (sub.current_grade && sub.current_grade < 75) {
          type = 'study';
          topic = `Targeted Revision: Weak areas and active recall exercise`;
        } else if (i % 2 === 0) {
          type = 'revision';
          topic = `Spaced Repetition: Active review of previous chapters`;
        }

        slots.push({
          subjectId: sub.id,
          subjectName: sub.name,
          color: sub.color,
          topic,
          duration,
          type
        });

        allocatedMinutes += duration;
        subIdx++;
      }

      schedule.push({
        date: dateString,
        slots
      });
    }

    // Identify top prioritized subjects based on weights
    const prioritizedSubjects = [...subjectWeights]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2)
      .map(sw => sw.subject.name);

    return {
      startDate: config.startDate,
      endDate: config.endDate,
      schedule,
      prioritizedSubjects,
      revisionStrategy: `Dynamic time allocation based on academic load. Allocated extra focus on ${prioritizedSubjects.join(' and ')} due to low scores, upcoming exams, or high credit values.`
    };
  }

  private mockPredictPerformance(subjects: Subject[], exams: Exam[], tasks: Task[], progressLogs: any[]) {
    // 1. Calculate base score from classroom grades & exam scores
    let scoreSum = 0;
    let scoreCount = 0;
    
    subjects.forEach(s => {
      if (s.current_grade !== undefined && s.current_grade !== null) {
        scoreSum += s.current_grade;
        scoreCount++;
      }
    });
    
    exams.forEach(e => {
      if (e.score !== undefined && e.score !== null) {
        scoreSum += e.score;
        scoreCount++;
      }
    });
    
    let baseScore = scoreCount > 0 ? (scoreSum / scoreCount) : 80; // default 80%

    // 2. Adjust based on completed checklist tasks
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const taskCompletionRatio = totalTasks > 0 ? (completedTasks / totalTasks) : 0.75;
    
    // If completion is high, boost score; if low, penalize
    baseScore += (taskCompletionRatio - 0.7) * 15;

    // 3. Adjust based on study hours consistency
    const totalHours = progressLogs.reduce((sum, log) => sum + (log.study_hours || 0), 0);
    const avgHours = progressLogs.length > 0 ? (totalHours / progressLogs.length) : 3;
    baseScore += (avgHours - 3) * 2.5;

    // Clamp score to 40 - 100
    baseScore = Math.max(40, Math.min(100, baseScore));

    // Convert to GPA & Letter Grade
    let predictedGpa = 2.0;
    let grade = 'C';
    let interpretation = 'Need to improve study habits.';
    
    if (baseScore >= 90) {
      predictedGpa = 3.8 + ((baseScore - 90) / 10) * 0.2;
      grade = 'A';
      interpretation = 'Excellent performance! Student is highly consistent and scoring top marks.';
    } else if (baseScore >= 80) {
      predictedGpa = 3.0 + ((baseScore - 80) / 10) * 0.8;
      grade = 'B';
      interpretation = 'Good progression. Solid study consistency, keeping on top of core targets.';
    } else if (baseScore >= 70) {
      predictedGpa = 2.5 + ((baseScore - 70) / 10) * 0.5;
      grade = 'C+';
      interpretation = 'Average performance. Consider intensifying focus checklist coverage.';
    } else {
      predictedGpa = 1.0 + ((baseScore - 40) / 30) * 1.5;
      grade = 'D';
      interpretation = 'High risk. Critical exam scores and missed study checklist items.';
    }

    const factors: Array<{ name: string; impact: 'positive' | 'negative'; description: string }> = [
      {
        name: 'Checklist Task Completion',
        impact: taskCompletionRatio >= 0.6 ? 'positive' : 'negative',
        description: `You have completed ${Math.round(taskCompletionRatio * 100)}% of your scheduled focus tasks.`
      },
      {
        name: 'Exam Performance History',
        impact: (exams.filter(e => e.score && e.score >= 75).length / Math.max(1, exams.length)) >= 0.5 ? 'positive' : 'negative',
        description: `Class and quiz test records show an average of ${Math.round(baseScore)}% across assessments.`
      },
      {
        name: 'Weekly Study Focus',
        impact: avgHours >= 3 ? 'positive' : 'negative',
        description: `Averaging ${avgHours.toFixed(1)} study hours per day.`
      }
    ];

    return {
      predictedGpa: parseFloat(predictedGpa.toFixed(2)),
      grade,
      confidence: Math.round(75 + (scoreCount > 0 ? 15 : 0)),
      interpretation,
      factors
    };
  }

  private mockDetectWeakTopics(subjects: Subject[], exams: Exam[], tasks: Task[], progressLogs: any[]) {
    const weakList: any[] = [];
    
    subjects.forEach(sub => {
      // Calculate scores for this subject
      let subScoreSum = 0;
      let count = 0;
      
      if (sub.current_grade !== undefined && sub.current_grade !== null) {
        subScoreSum += sub.current_grade;
        count++;
      }
      
      const subExams = exams.filter(e => e.subject_id === sub.id && e.score !== undefined);
      subExams.forEach(e => {
        subScoreSum += e.score!;
        count++;
      });
      
      const avgScore = count > 0 ? (subScoreSum / count) : 80;

      // Task ratio
      const subTasks = tasks.filter(t => t.subject_id === sub.id);
      const subCompleted = subTasks.filter(t => t.status === 'completed').length;
      const taskRatio = subTasks.length > 0 ? (subCompleted / subTasks.length) : 1;

      // Flag if scores are < 75% or tasks completed < 50%
      if (avgScore < 75 || taskRatio < 0.6) {
        weakList.push({
          subjectId: sub.id,
          subjectName: sub.name,
          score: Math.round(avgScore),
          completedTaskRatio: taskRatio,
          reason: avgScore < 75 
            ? `Your exam or classroom grades average is ${Math.round(avgScore)}% which is below your target.`
            : `You have completed only ${Math.round(taskRatio * 100)}% of revision items for this course.`,
          recommendedFirstSteps: [
            `Utilize the Feynman Technique: Explain the core concept of ${sub.name} in simple terms.`,
            `Conduct an active recall session: Ask the AI tutor for a quiz on this subject.`,
            `Increase Pomodoro sprint slots by 1.5x for upcoming review slots.`
          ]
        });
      }
    });

    return weakList;
  }

  private mockGetRecommendations(subjects: Subject[], exams: Exam[], tasks: Task[], progressLogs: any[]) {
    const recommendations: any[] = [];
    const today = new Date();

    // 1. Check for upcoming exams (within 7 days)
    exams.forEach(exam => {
      const examDate = new Date(exam.exam_date);
      const diffDays = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays >= 0 && diffDays <= 7) {
        const sub = subjects.find(s => s.id === exam.subject_id);
        recommendations.push({
          type: 'exam_prep',
          title: `Intensive Review: ${exam.name}`,
          priority: 'high',
          description: `Your exam is in ${diffDays === 0 ? 'TODAY' : diffDays === 1 ? 'tomorrow' : `${diffDays} days`}. Prioritize active recall, mock papers, and rest.`,
          topic: `Exam prep for ${sub?.name || 'Subject'}`,
          subjectId: exam.subject_id
        });
      }
    });

    // 2. Add recommendations for weak subjects
    const weakTopics = this.mockDetectWeakTopics(subjects, exams, tasks, progressLogs);
    weakTopics.forEach(weak => {
      recommendations.push({
        type: 'weakness_review',
        title: `Boost Weak Area: ${weak.subjectName}`,
        priority: 'medium',
        description: `Current average score is ${weak.score}%. Dedicate your next study session to units and checklist items under this course.`,
        topic: 'Concept revision',
        subjectId: weak.subjectId
      });
    });

    // 3. Pomodoro focus suggestion
    if (progressLogs.length > 0) {
      const totalHours = progressLogs.reduce((sum, log) => sum + (log.study_hours || 0), 0);
      if (totalHours < 4) {
        recommendations.push({
          type: 'pomodoro_focus',
          title: 'Start a 25-Min study sprint',
          priority: 'medium',
          description: 'Your study consistency is slightly below average this week. Start a quick Pomodoro focus sprint now!',
        });
      }
    }

    // Default recommendation if empty
    if (recommendations.length === 0 && subjects.length > 0) {
      recommendations.push({
        type: 'pomodoro_focus',
        title: `Progress onward in ${subjects[0].name}`,
        priority: 'low',
        description: 'You are doing great! Keep your streak alive by working on your next target units.',
        subjectId: subjects[0].id
      });
    }

    return recommendations.slice(0, 3);
  }

  private mockEstimateDifficulty(subjects: Subject[], tasks: Task[], exams: Exam[]) {
    return subjects.map(sub => {
      const subTasks = tasks.filter(t => t.subject_id === sub.id && t.status === 'completed');
      
      let durationDiffSum = 0;
      let count = 0;
      
      subTasks.forEach(t => {
        if (t.actual_duration_minutes && t.duration_minutes) {
          durationDiffSum += (t.actual_duration_minutes / t.duration_minutes);
          count++;
        }
      });
      
      const avgDurationRatio = count > 0 ? (durationDiffSum / count) : 1.0;
      
      // Calculate exam averages
      const subExams = exams.filter(e => e.subject_id === sub.id && e.score !== undefined);
      let examSum = 0;
      subExams.forEach(e => { examSum += e.score!; });
      const avgExamScore = subExams.length > 0 ? (examSum / subExams.length) : 80;

      let estimatedDifficulty: 'easy' | 'medium' | 'hard' = sub.difficulty_level;
      let explanation = `Currently matching your self-reported difficulty. Keep logging tasks to refine this.`;
      let confidence = 50;

      if (count > 0 || subExams.length > 0) {
        confidence = Math.round(60 + Math.min(30, count * 5));
        
        if (avgDurationRatio > 1.25 || avgExamScore < 70) {
          estimatedDifficulty = 'hard';
          explanation = `AI observed you take longer than planned (+${Math.round((avgDurationRatio - 1) * 100)}% time) to complete items and average scores are low.`;
        } else if (avgDurationRatio < 0.85 && avgExamScore > 85) {
          estimatedDifficulty = 'easy';
          explanation = `AI observed you finish tasks ${Math.round((1 - avgDurationRatio) * 100)}% faster and maintain high scores.`;
        } else {
          estimatedDifficulty = 'medium';
          explanation = `Task completion times align with schedules, maintaining stable scores.`;
        }
      }

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        estimatedDifficulty,
        confidence,
        explanation
      };
    });
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
    
    // Check if the user asks for study planning methods
    if (msg.includes('study planning methods') || msg.includes('study planning method') || msg.includes('study method') || msg.includes('study technique') || msg.includes('planning methods') || msg.includes('methods of study')) {
      return `### Top Study Planning & Productivity Methods 📚✨

Here are the most effective study planning methods to structure your academic workload:

1. **Pomodoro Technique ⏱️**
   - **How to use**: Focus on a single task for 25 minutes, then take a 5-minute break. After 4 cycles, take a longer 15-30 minute break.
   - **When to use**: Ideal for overcoming procrastination, starting a session, or tasks requiring high focus.

2. **Spaced Repetition 📅**
   - **How to use**: Review material at increasing intervals (e.g., Day 1, Day 3, Day 7, Day 14, Day 30) to interrupt the forgetting curve.
   - **When to use**: Perfect for memorizing terms, vocabulary, or preparing for cumulative exams.

3. **Active Recall 🧠**
   - **How to use**: Actively test your memory (flashcards, closed-book summaries, or quizzes) rather than passively re-reading.
   - **When to use**: Use this for all review phases to verify actual comprehension.

4. **Feynman Technique 🗣️**
   - **How to use**: Explain a concept in simple language as if teaching it to a child. Identify gaps in your explanation and review the material to fill them.
   - **When to use**: Great for complex theories, mathematical concepts, or deep understanding.

5. **Time Blocking 🧱**
   - **How to use**: Divide your day into dedicated blocks of time, assigning specific tasks or subjects to each block.
   - **When to use**: Excellent for balancing multiple courses, classes, and extracurriculars.

6. **SMART Goals 🎯**
   - **How to use**: Define objectives that are **S**pecific, **M**easurable, **A**chievable, **R**elevant, and **T**ime-bound (e.g., "Complete 3 Calculus review exercises in 1 hour").
   - **When to use**: Use this when writing your task checklist for the day.

7. **Priority Matrix (Eisenhower Matrix) 📊**
   - **How to use**: Categorize tasks into four quadrants based on Urgency and Importance: Do First, Schedule, Delegate, or Eliminate.
   - **When to use**: Best for task prioritization when feeling overwhelmed.`;
    }

    if (msg.includes('spaced repetition') || msg.includes('forgetting curve') || msg.includes('revision')) {
      return `### Spaced Repetition Guide 📚

Spaced Repetition is a highly efficient learning technique where you review material at increasing intervals (e.g., Day 1, Day 3, Day 7, Day 14, Day 30) to interrupt the **Forgetting Curve**.

**How to implement it:**
- Review easy topics at longer intervals.
- Flag hard subjects (like ${context?.subjects?.[0]?.name || 'your major subject'}) and schedule reviews every 2 days.
- Use **Active Recall** (quizzes, flashcards) during these revision slots rather than passive re-reading.`;
    }

    if (msg.includes('pomodoro') || msg.includes('timer') || msg.includes('sprint')) {
      return `### The Pomodoro Technique ⏱️

To make the most of your study sessions, use our **Pomodoro Timer**:

1. **Choose a task** (e.g., draft introduction for research paper).
2. **Set the timer to 25 minutes** (1 Pomodoro).
3. **Work with intense focus** until the buzzer sounds.
4. **Take a 5-minute break** to walk around, hydrate, or stretch.
5. **After 4 rounds**, take a longer **15-30 minute break**.

*Tip: Try the 50/10 mode in our Pomodoro panel if you prefer longer, deep-work sessions!*`;
    }

    if (msg.includes('feynman') || msg.includes('explain technique') || msg.includes('teaching technique')) {
      return `### The Feynman Technique 🧠

Named after physicist Richard Feynman, this technique is the ultimate check for deep understanding:

1. **Write down** the name of the concept on a blank sheet.
2. **Explain it in simple language** as if you were teaching it to a 10-year-old child.
3. **Identify gaps** in your explanation (where you get stuck or start using complex jargon).
4. **Go back to the source material** to fill in those gaps until you can explain it effortlessly.`;
    }

    if (msg.includes('time blocking') || msg.includes('time block')) {
      return `### Time Blocking Method 🧱

Time blocking allocates fixed temporal chunks to specific goals:
1. **Estimate Effort**: List tasks and estimate their durations.
2. **Block Calendar**: Map these durations as solid slots in your daily schedule.
3. **Protect the Block**: Turn off social media notifications and focus strictly on the block's assignment.`;
    }

    if (msg.includes('smart goal') || msg.includes('smart goals')) {
      return `### SMART Goals Framework 🎯

Ensure your checklist targets are:
- **Specific**: Clear and unambiguous.
- **Measurable**: Trackable progress.
- **Achievable**: Realistic for your skill level.
- **Relevant**: Aligns with upcoming exam requirements.
- **Time-bound**: Has a defined end time.

*Example*: "Study Calculus Unit 2 for 45 minutes and solve 5 practice questions."`;
    }

    if (msg.includes('priority matrix') || msg.includes('eisenhower')) {
      return `### The Priority Matrix (Eisenhower Matrix) 📊

Organize your targets into 4 quadrants:
1. **Urgent & Important**: Do immediately (e.g., Exam prep for next-day test).
2. **Not Urgent & Important**: Schedule on calendar (e.g., Long-term study units).
3. **Urgent & Not Important**: Delegate or automate.
4. **Not Urgent & Not Important**: Eliminate (e.g., Distractions).`;
    }

    // Check if the user asks for a quiz
    if (msg.includes('quiz') || msg.includes('test') || msg.includes('question') || msg.includes('questions')) {
      const subjectName = context?.subjects?.[0]?.name || "General Science";
      return `### Active Recall Quiz: ${subjectName} 📝

Here is a quick diagnostic quiz to test your memory:

**Question 1**: What is the primary difference between *Active Recall* and *Passive Review*?
**Question 2**: How does the *Forgetting Curve* change when you review a concept multiple times?
**Question 3**: What quadrant in the *Eisenhower Matrix* should long-term study slots belong to?

*Reply with your answers and I will grade them and explain the concepts!*`;
    }

    // Check if the user asks for a study plan
    if (msg.includes('study plan') || msg.includes('schedule') || msg.includes('timetable') || msg.includes('calendar')) {
      const subNames = context?.subjects?.map((s: any) => s.name) || ["Calculus", "Physics"];
      return `### Customized AI Study Plan 📅

Based on your active course load, here is a structured 3-day revision timetable:

| Day | Focus Subject | Session Duration | Recommended Technique |
| :--- | :--- | :--- | :--- |
| **Day 1** | ${subNames[0] || 'Primary Subject'} | 90 Minutes | Feynman Explanation & Unit Review |
| **Day 2** | ${subNames[1] || 'Secondary Subject'} | 60 Minutes | Pomodoro Sprint & Active Recall Quiz |
| **Day 3** | ${subNames[0] || 'Primary Subject'} | 90 Minutes | Solving Past Papers & Weakness Review |

Would you like me to adjust the durations or shift topics?`;
    }

    if (msg.includes('motivate') || msg.includes('motivation') || msg.includes('stress') || msg.includes('tired') || msg.includes('burnout')) {
      return `### You've Got This! 💪✨

Remember, **progress is progress**, no matter how small. College can be overwhelming, but breaking your syllabus down into bite-sized units is the key to conquering it.

**A quick boost for today:**
- You have upcoming tasks to check off. Checking off just **one task** triggers dopamine that helps you finish the next.
- Keep your streak alive! You're building habits that will serve you long after this semester.
- Go take a 5-minute walk, drink a glass of water, and tackle your next 25-minute Pomodoro!`;
    }

    // If query refers to specific subjects logged by the student
    if (context?.subjects?.length > 0) {
      for (const sub of context.subjects) {
        if (msg.includes(sub.name.toLowerCase())) {
          return `### Course Focus: ${sub.name} 📚

Here is the AI diagnostic summary for ${sub.name}:
- **Credits**: ${sub.credits} credits (Priority: ${sub.priority})
- **Current Grade**: ${sub.current_grade !== undefined ? `${sub.current_grade}%` : 'Not logged'}
- **AI Recommendation**: Focus on reviewing key topics using **Active Recall** and take a quick practice quiz to identify weak areas.

Would you like me to explain a specific unit or generate questions for ${sub.name}?`;
        }
      }
    }

    // If user question is unclear, ask a clarification question instead of showing welcome message
    return `I want to make sure I give you the most relevant help. Could you please clarify your question?

I can:
- 💡 Explain complex concepts or specific topics in your subjects.
- ⏱️ Detail study methods like Pomodoro, Spaced Repetition, or Time Blocking.
- 📝 Generate a custom quiz for your active courses.
- 📅 Map out a study plan/schedule.

Which of these would you like to do?`;
  }
}

export const gemini = new GeminiService();

import { db, User, Subject, Exam, Task, StudyPlan, ProgressLog } from '../db/dbAdapter';
import { gemini } from './geminiService';
import { GoogleGenerativeAI, FunctionDeclaration, FunctionDeclarationSchemaType } from '@google/generative-ai';

export interface AIAgentResponse {
  success: boolean;
  message: string;
  action: string;
  recommendations: Array<{
    type: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    topic?: string;
    subjectId?: string;
  }>;
  studyPlan?: any[];
  reasoning: string;
  steps?: string[]; // Log of tools executed during reasoning
}

class AIAgentService {
  constructor() {
    console.log('AIAgentService initialized.');
  }

  // Robust helper to extract JSON block from model responses
  private extractJSON(text: string): any {
    try {
      const regex = /```(?:json)?\s*([\s\S]*?)\s*```/;
      const match = text.match(regex);
      const jsonStr = match ? match[1] : text;
      return JSON.parse(jsonStr.trim());
    } catch (err) {
      try {
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        if (firstOpen !== -1 && lastClose > firstOpen) {
          return JSON.parse(text.substring(firstOpen, lastClose + 1));
        }
      } catch (nestedErr) {
        // ignore and fallback
      }
      return {
        success: true,
        message: text,
        action: 'general_advice',
        recommendations: [],
        reasoning: 'Direct response generated from AI agent.'
      };
    }
  }

  // Offline fallback when GEMINI_API_KEY is not configured
  private async handleOfflineAgentRequest(userId: string, message: string): Promise<AIAgentResponse> {
    const subjects = await db.getSubjects(userId);
    const exams = await db.getExams(userId);
    const tasks = await db.getTasks(userId);
    const logs = await db.getProgressLogs(userId);

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const weakSubjects = subjects.filter(s => s.difficulty_level === 'hard' || s.priority === 'high');
    const upcomingExams = exams.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());

    const stepsLog = [
      'Checked API key status: GEMINI_API_KEY is not configured in .env',
      'Operating in Offline Diagnostic Mode',
      `Loaded ${subjects.length} subjects, ${exams.length} exams, ${tasks.length} checklist items from local database`,
      'Synthesized intelligent recommendations based on active student records'
    ];

    const recommendations: AIAgentResponse['recommendations'] = [];

    if (weakSubjects.length > 0) {
      const primaryWeak = weakSubjects[0];
      recommendations.push({
        type: 'weakness_review',
        title: `Focus on ${primaryWeak.name}`,
        priority: 'high',
        description: `This subject is marked as high difficulty. Allocate a 45-minute active recall session today.`,
        subjectId: primaryWeak.id
      });
    }

    if (upcomingExams.length > 0) {
      const nextExam = upcomingExams[0];
      recommendations.push({
        type: 'exam_prep',
        title: `Prepare for ${nextExam.name}`,
        priority: 'high',
        description: `Exam is scheduled for ${nextExam.exam_date}. Review core formula sheets and past papers.`,
        subjectId: nextExam.subject_id
      });
    }

    if (pendingTasks.length > 0) {
      const firstTask = pendingTasks[0];
      recommendations.push({
        type: 'task_checklist',
        title: `Pending: ${firstTask.title}`,
        priority: 'medium',
        description: `Due on ${firstTask.due_date}. Finish this to maintain your study streak!`
      });
    }

    const noticeBanner = `💡 **Note: Running in Offline Mode (GEMINI_API_KEY not configured)**\n\nTo activate live autonomous Gemini AI reasoning with real-time tool execution:\n1. Get a free Gemini API key from **Google AI Studio** (https://aistudio.google.com/).\n2. Open your project \`.env\` file and set: \`GEMINI_API_KEY=your_key_here\`\n3. Restart your server.\n\n---\n\n`;

    let adviceNarrative = `Hello! Based on your current records, you have **${subjects.length} enrolled subjects**, **${pendingTasks.length} pending tasks**, and **${upcomingExams.length} upcoming exams**.\n\n`;

    if (weakSubjects.length > 0) {
      adviceNarrative += `🎯 **Priority Focus**: I recommend dedicating your next study sprint to **${weakSubjects.map(s => s.name).join(', ')}** to boost your mastery.\n`;
    }
    if (upcomingExams.length > 0) {
      adviceNarrative += `📅 **Upcoming Deadline**: Your nearest exam is **${upcomingExams[0].name}** on **${upcomingExams[0].exam_date}**.\n`;
    }

    return {
      success: true,
      message: `${noticeBanner}${adviceNarrative}`,
      action: 'offline_diagnostics',
      recommendations,
      reasoning: 'Synthesized diagnostic recommendations using local student database records because GEMINI_API_KEY is omitted.',
      steps: stepsLog
    };
  }

  // Main entrypoint for processing student queries
  async processRequest(userId: string, message: string): Promise<AIAgentResponse> {
    const aiClient = gemini.getAIClient();
    if (!aiClient) {
      return this.handleOfflineAgentRequest(userId, message);
    }


    const stepsLog: string[] = [];
    const recommendationsAcc: AIAgentResponse['recommendations'] = [];

    // Define function declarations for Gemini Tools
    const functionDeclarations: FunctionDeclaration[] = [
      {
        name: 'getStudentProfile',
        description: 'Retrieves the authenticated student profile details including name, XP, and streak.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'getSubjects',
        description: 'Retrieves the list of subjects enrolled by the student (names, credits, grades, difficulty).',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'getPerformance',
        description: 'Retrieves the student progress logs, total focus hours, and task completion rates.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'getTasks',
        description: 'Retrieves the checklist of tasks for the student including pending and completed study items.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'getCurrentStudyPlan',
        description: 'Retrieves the current active study plan details and day-by-day timetable schedule.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'getUpcomingExams',
        description: 'Retrieves upcoming exams and deadlines registered for the student.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'identifyWeakTopics',
        description: 'Analyzes student records and returns weak subjects/topics requiring focus.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {}
        }
      },
      {
        name: 'generateStudyPlan',
        description: 'Generates a new study plan and corresponding calendar tasks. Saves to database.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            startDate: { type: FunctionDeclarationSchemaType.STRING, description: 'Start date of the study calendar (YYYY-MM-DD)' },
            endDate: { type: FunctionDeclarationSchemaType.STRING, description: 'End date of the study calendar (YYYY-MM-DD)' },
            dailyHours: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Focus hours per day' },
            weakSubjects: {
              type: FunctionDeclarationSchemaType.ARRAY,
              items: { type: FunctionDeclarationSchemaType.STRING, properties: {} },
              description: 'List of subject names that are weak'
            },
            preferredStudyTime: { type: FunctionDeclarationSchemaType.STRING, enum: ['morning', 'afternoon', 'evening', 'night'], description: 'Preferred time of day to study' },
            breakDuration: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Break duration in minutes' }
          },
          required: ['startDate', 'endDate', 'dailyHours']
        }
      },
      {
        name: 'updateStudyPlan',
        description: 'Updates an existing active study plan schedule slots.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            planId: { type: FunctionDeclarationSchemaType.STRING, description: 'The unique ID of the study plan to modify' },
            schedule: {
              type: FunctionDeclarationSchemaType.ARRAY,
              description: 'The updated day-by-day schedule array containing date slots',
              items: {
                type: FunctionDeclarationSchemaType.OBJECT,
                properties: {}
              }
            }
          },
          required: ['planId', 'schedule']
        }
      },
      {
        name: 'createStudyTask',
        description: 'Creates a new study or revision task for the student. Saves to database.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            subjectId: { type: FunctionDeclarationSchemaType.STRING, description: 'Database ID of the associated subject' },
            title: { type: FunctionDeclarationSchemaType.STRING, description: 'Task title details' },
            due_date: { type: FunctionDeclarationSchemaType.STRING, description: 'Due date (YYYY-MM-DD)' },
            type: { type: FunctionDeclarationSchemaType.STRING, enum: ['study', 'revision', 'exam', 'task'] },
            priority: { type: FunctionDeclarationSchemaType.STRING, enum: ['low', 'medium', 'high'] },
            duration_minutes: { type: FunctionDeclarationSchemaType.NUMBER, description: 'Duration of the study task' }
          },
          required: ['subjectId', 'title', 'due_date', 'type', 'priority', 'duration_minutes']
        }
      },
      {
        name: 'createRecommendation',
        description: 'Generates a custom study recommendation returned in the final payload to the user.',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            type: { type: FunctionDeclarationSchemaType.STRING, description: 'Type: exam_prep, weakness_review, pomodoro_focus, task_checklist' },
            title: { type: FunctionDeclarationSchemaType.STRING, description: 'Recommendation header' },
            priority: { type: FunctionDeclarationSchemaType.STRING, enum: ['low', 'medium', 'high'] },
            description: { type: FunctionDeclarationSchemaType.STRING, description: 'Detailed instruction steps' },
            topic: { type: FunctionDeclarationSchemaType.STRING, description: 'Topic name' },
            subjectId: { type: FunctionDeclarationSchemaType.STRING, description: 'Associated subject ID' }
          },
          required: ['type', 'title', 'priority', 'description']
        }
      }
    ];

    try {
      const model = aiClient.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ functionDeclarations }],
        systemInstruction: `You are a real AI Study Planner Agent. You help students manage their study plans, tasks, performance, and schedules.
You have access to a set of backend tools to fetch student data, identify weaknesses, schedule study plans, update schedules, and log custom recommendations.
When you receive a student query, you must dynamically decide which tools to execute to answer the request accurately.
Always execute actions using actual student data rather than hardcoded or fake recommendations.

If a student asks:
- "What should I study today?" -> Check their subjects, tasks, current study plan, and upcoming exams. Decided appropriate study targets.
- "I scored low in DBMS. What should I study?" -> Identify weak topics, inspect subjects, and generate specific recommendations or tasks.
- "I have 3 hours today. Create my study plan." -> Call generateStudyPlan using today's date as start, +7 days as end, with daily hours set to 3.
- "I missed yesterday's study plan." -> Get the current study plan, identify missed/pending tasks, reschedule them using tools.
- "I have an exam next week. Create a revision plan." -> Check exams, generate a relevant plan.

At the end of your tool invocations, return a JSON response block in the following structure.
DO NOT return any other text outside the JSON code block.
\`\`\`json
{
  "success": true,
  "message": "A student-facing narrative summary of what you did and your advice.",
  "action": "The primary action executed (e.g. weakness_review, plan_generated, plan_updated, task_created, dashboard_info).",
  "recommendations": [
    {
      "type": "exam_prep",
      "title": "Solve DBMS Practice Questions",
      "priority": "high",
      "description": "DBMS exam is in 5 days. Spend 45 minutes on relational algebra queries.",
      "topic": "Relational Algebra",
      "subjectId": "abc-123"
    }
  ],
  "studyPlan": [] // Include the active study plan schedule (day-by-day) if created/updated/inspected.
  "reasoning": "An explanation of why you made these decisions, referencing active student metrics."
}
\`\`\`
`
      });

      // Maintain chat contents history for the agent execution loop
      const contents: any[] = [
        { role: 'user', parts: [{ text: message }] }
      ];

      let runLoop = true;
      let iterations = 0;
      const MAX_ITERATIONS = 8; // Avoid infinite loops

      while (runLoop && iterations < MAX_ITERATIONS) {
        iterations++;
        const result = await model.generateContent({ contents });
        const response = result.response;

        // Check if Gemini requested function execution
        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          // Push model message to history
          contents.push({
            role: 'model',
            parts: [{ functionCalls }]
          });

          // Process each function call sequentially
          for (const call of functionCalls) {
            stepsLog.push(`Called backend tool: ${call.name}`);
            let toolResult: any = { success: true };

            try {
              const args: any = call.args || {};
              switch (call.name) {
                case 'getStudentProfile':
                  toolResult = await db.getUser(userId);
                  break;
                case 'getSubjects':
                  toolResult = await db.getSubjects(userId);
                  break;
                case 'getPerformance': {
                  const logs = await db.getProgressLogs(userId);
                  const tasks = await db.getTasks(userId);
                  const total = tasks.length;
                  const completed = tasks.filter(t => t.status === 'completed').length;
                  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
                  toolResult = { logs, totalTasks: total, completedTasks: completed, completionRate };
                  break;
                }
                case 'getTasks':
                  toolResult = await db.getTasks(userId);
                  break;
                case 'getCurrentStudyPlan': {
                  const plans = await db.getStudyPlans(userId);
                  toolResult = plans.length > 0 ? plans[plans.length - 1] : null;
                  break;
                }
                case 'getUpcomingExams':
                  toolResult = await db.getExams(userId);
                  break;
                case 'identifyWeakTopics': {
                  const subjects = await db.getSubjects(userId);
                  const exams = await db.getExams(userId);
                  const tasks = await db.getTasks(userId);
                  const logs = await db.getProgressLogs(userId);
                  toolResult = await gemini.detectWeakTopics(subjects, exams, tasks, logs);
                  break;
                }
                case 'generateStudyPlan': {
                  const subjects = await db.getSubjects(userId);
                  const exams = await db.getExams(userId);
                  const generated = await gemini.generateStudyPlan(subjects, exams, {
                    dailyHours: args.dailyHours,
                    weakSubjects: args.weakSubjects || [],
                    preferredStudyTime: args.preferredStudyTime || 'afternoon',
                    breakDuration: args.breakDuration || 10,
                    startDate: args.startDate,
                    endDate: args.endDate
                  });

                  // Save generated plan to database
                  const studyPlan = await db.addStudyPlan(userId, {
                    start_date: args.startDate,
                    end_date: args.endDate,
                    config: {
                      dailyHours: args.dailyHours,
                      weakSubjects: args.weakSubjects || [],
                      preferredStudyTime: args.preferredStudyTime || 'afternoon',
                      breakDuration: args.breakDuration || 10
                    },
                    schedule: generated.schedule
                  });

                  // Add related tasks to DB
                  for (const day of generated.schedule) {
                    for (const slot of day.slots) {
                      let targetSubjectId = slot.subjectId;
                      if (!targetSubjectId || !subjects.some(s => s.id === targetSubjectId)) {
                        const matched = subjects.find(s => s.name.toLowerCase() === (slot.subjectName || '').toLowerCase());
                        targetSubjectId = matched ? matched.id : subjects[0].id;
                      }

                      await db.addTask(userId, {
                        subject_id: targetSubjectId,
                        title: `${slot.type.toUpperCase()}: ${slot.subjectName} - ${slot.topic}`,
                        status: 'pending',
                        due_date: day.date,
                        type: slot.type === 'revision' ? 'revision' : (slot.type === 'buffer' ? 'exam' : 'study'),
                        priority: slot.type === 'buffer' ? 'high' : 'medium',
                        duration_minutes: slot.duration,
                        recurring: false
                      });
                    }
                  }
                  toolResult = studyPlan;
                  break;
                }
                case 'updateStudyPlan': {
                  // Security validation: verify the study plan belongs to the authenticated user
                  const plans = await db.getStudyPlans(userId);
                  const hasPlan = plans.some((p: any) => p.id === args.planId);
                  if (!hasPlan) {
                    throw new Error('Unauthorized study plan modification attempt.');
                  }

                  const dbData: any = db;
                  if (dbData.isLocal) {
                    const localDb = dbData.getLocalDB();
                    const planIdx = localDb.studyPlans.findIndex((p: any) => p.id === args.planId);
                    if (planIdx !== -1) {
                      localDb.studyPlans[planIdx].schedule = args.schedule;
                      dbData.saveLocalDB(localDb);
                    }
                  } else {
                    await dbData.supabase!
                      .from('study_plans')
                      .update({ schedule: args.schedule })
                      .eq('id', args.planId)
                      .eq('user_id', userId);
                  }
                  toolResult = { success: true, planId: args.planId };
                  break;
                }
                case 'createStudyTask': {
                  // Security validation: verify the associated subject belongs to the authenticated user
                  const subjects = await db.getSubjects(userId);
                  const hasSubject = subjects.some((s: any) => s.id === args.subjectId);
                  if (!hasSubject) {
                    throw new Error('Unauthorized task creation attempt on foreign subject.');
                  }

                  toolResult = await db.addTask(userId, {
                    subject_id: args.subjectId,
                    title: args.title,
                    status: 'pending',
                    due_date: args.due_date,
                    type: args.type,
                    priority: args.priority,
                    duration_minutes: args.duration_minutes,
                    recurring: false
                  });
                  break;
                }
                case 'createRecommendation': {
                  recommendationsAcc.push({
                    type: args.type,
                    title: args.title,
                    priority: args.priority,
                    description: args.description,
                    topic: args.topic,
                    subjectId: args.subjectId
                  });
                  toolResult = { success: true };
                  break;
                }
              }
            } catch (err: any) {
              console.error(`Error executing agent tool ${call.name}:`, err);
              toolResult = { success: false, error: err.message };
            }

            // Push function response to contents
            contents.push({
              role: 'function',
              parts: [{
                functionResponse: {
                  name: call.name,
                  response: toolResult
                }
              }]
            });
          }
        } else {
          // No more function calls, we have the final reasoning message
          runLoop = false;
          const rawText = response.text();
          const finalJSON = this.extractJSON(rawText);

          // Append any recommendations created dynamically via tools
          if (recommendationsAcc.length > 0) {
            finalJSON.recommendations = [...(finalJSON.recommendations || []), ...recommendationsAcc];
          }

          // Inject reasoning steps log
          finalJSON.steps = stepsLog;
          return finalJSON;
        }
      }

      throw new Error('AI Agent exceeded maximum reasoning steps.');
    } catch (err: any) {
      console.error('Real AIAgentService error:', err);
      return {
        success: false,
        message: `AI Agent failed to resolve request. ${err.message || 'Check logs.'}`,
        action: 'error',
        recommendations: [],
        reasoning: 'An error occurred during generative AI execution.'
      };
    }
  }
}

export const aiAgent = new AIAgentService();

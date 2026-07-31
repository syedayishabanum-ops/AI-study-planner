# Aegis AI Study Planner 🎓✨

A modern, full-stack, AI-powered Study Planner web application tailored for college students. Aegis helps students organize course syllabi, log exams, schedule study hours, track habits with Pomodoro sprints, review analytics, and request academic support via a Gemini AI chatbot.

## 🚀 Key Features

*   **Optimized AI Timetables**: Generates personalized daily and weekly study blocks based on credits, exam proximity, and student weaknesses.
*   **PDF Syllabus Extraction**: Upload syllabus PDF documents, and Aegis parses and loads unit checklists automatically.
*   **Active Recall Chatbot**: Chat with **Aegis** to explain hard topics, suggest study techniques (Feynman, Spaced Repetition), or generate custom quizzes.
*   **Gamified Pomodoro Focus**: 25/5 and 50/10 focus intervals. Earn XP, level up, and unlock performance badges.
*   **Interactive Calendar Grid**: Drag-and-drop study sessions to adapt schedules, with quick AI rescheduling for overdue checklist items.
*   **Rich Analytics**: Visually review effort distributions, hours studied, and productivity trends using custom graphs.
*   **Frosted Glassmorphism UI**: Beautiful premium styling with dark/light mode toggle support.

---

## 🛠️ Stack & Architecture

*   **Frontend**: React, TypeScript, Tailwind CSS v4, Vite, Recharts, FullCalendar
*   **Backend**: Node.js, Express, TypeScript, `pdf-parse`
*   **Database**: Supabase Client (automatically falls back to a **local JSON database engine** if credentials are omitted)
*   **AI Engine**: Gemini Pro API (automatically falls back to **simulated mock responses** if keys are omitted)

---

## ⚙️ Setup & Installation

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** installed.

### 2. Configure Environments
Create a `.env` file in the project root directory (a pre-configured template is already generated for you).

```env
PORT=5000
JWT_SECRET=super_secret_ai_study_planner_key_12345

# Optional: Supabase Credentials (If empty, uses local JSON fallback)
SUPABASE_URL=
SUPABASE_KEY=

# Optional: Gemini API Key (If empty, uses simulated AI tutor fallback)
GEMINI_API_KEY=
```

### 3. Install Dependencies
Run the workspace installer in the root folder:
```bash
npm run install:all
```

### 4. Run Development Servers
Start both the React client dev server and Express backend concurrently:
```bash
npm run dev
```
*   Frontend: [http://localhost:5173](http://localhost:5173)
*   Backend API: [http://localhost:5000](http://localhost:5000)

---

## 💎 Offline / Fallback Resiliency
Aegis runs instantly out-of-the-box:
1.  **JSON Database**: Stored locally in `server/data/local_db.json`. Real database updates, cascading subject deletions, and session logging persist across restarts.
2.  **Mock AI Advisor**: Simulates prompt schedule outputs, syllabus extractions, spaced repetition advice, and quiz generation if no `GEMINI_API_KEY` is present.

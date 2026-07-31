import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useStudyPlan } from '../context/StudyPlanContext';
import { Sparkles, RefreshCw, Calendar as CalendarIcon, Info } from 'lucide-react';

export const Calendar: React.FC = () => {
  const { tasks, subjects, updateTaskDate, rescheduleMissedTasks, studyPlans, isLoading } = useStudyPlan();

  const activePlan = studyPlans[studyPlans.length - 1];

  // Map tasks list to FullCalendar Event Format
  const events = tasks.map(task => {
    const matchingSubject = subjects.find(s => s.id === task.subject_id);
    const color = matchingSubject ? matchingSubject.color : '#6366f1';
    
    return {
      id: task.id,
      title: task.title,
      start: task.due_date,
      allDay: true,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: {
        status: task.status,
        priority: task.priority,
        type: task.type
      }
    };
  });

  // Handle Drag-and-Drop date shift
  const handleEventDrop = async (info: any) => {
    const taskId = info.event.id;
    const newDate = info.event.startStr; // Returns YYYY-MM-DD
    
    try {
      await updateTaskDate(taskId, newDate);
    } catch (err) {
      info.revert();
      console.error(err);
    }
  };

  const handleReschedule = async () => {
    if (!activePlan) return;
    const confirm = window.confirm("Aegis will scan your pending/overdue checklist tasks and distribute them onto upcoming buffer spaces. Proceed?");
    if (!confirm) return;
    
    try {
      await rescheduleMissedTasks(activePlan.id);
      alert("AI rescheduled successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/10 pb-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">Interactive Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">
            Drag study blocks to reschedule them. Use AI to reorganize delayed checklists.
          </p>
        </div>
        
        {activePlan && (
          <button
            onClick={handleReschedule}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Reschedule Overdue (AI)
          </button>
        )}
      </div>

      {/* Info Warning */}
      <div className="p-4 rounded-xl bg-gray-950/20 border border-gray-850 flex items-start gap-3">
        <Info size={16} className="text-indigo-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-400 leading-relaxed">
          💡 **Interactive Schedule:** Simply drag and drop study blocks directly on the calendar grid below. The corresponding checklists on your dashboard will update their target deadlines automatically.
        </p>
      </div>

      {/* Calendar Grid Container */}
      <div className="glass-panel p-6 rounded-2xl bg-gray-950/10">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          editable={true}
          selectable={true}
          events={events}
          eventDrop={handleEventDrop}
          eventClick={(info) => {
            const priority = info.event.extendedProps.priority;
            const status = info.event.extendedProps.status;
            const type = info.event.extendedProps.type;
            alert(`Task Details:\nTitle: ${info.event.title}\nType: ${type}\nPriority: ${priority}\nStatus: ${status}`);
          }}
          height="auto"
        />
      </div>
    </div>
  );
};

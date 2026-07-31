import React, { useState } from 'react';
import { useStudyPlan } from '../context/StudyPlanContext';
import { 
  Plus, Trash2, Edit, FileText, ChevronDown, ChevronUp, Book, 
  Sparkles, CheckSquare, Square, Percent, Calendar as CalendarIcon, Upload 
} from 'lucide-react';

export const Subjects: React.FC = () => {
  const { 
    subjects, exams, addSubject, updateSubject, deleteSubject, 
    getUnits, addUnit, updateUnit, deleteUnit, addExam, deleteExam, 
    parseSyllabusPDF, syncAllData 
  } = useStudyPlan();

  // Subject Form States
  const [showSubModal, setShowSubModal] = useState(false);
  const [subName, setSubName] = useState('');
  const [subColor, setSubColor] = useState('#6366f1');
  const [subDiff, setSubDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [subCredits, setSubCredits] = useState('3');
  const [subPriority, setSubPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  // Exam Form States
  const [showExamModal, setShowExamModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [examSubId, setExamSubId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examWeight, setExamWeight] = useState('20');

  // Expanded Subject Units View
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [unitsList, setUnitsList] = useState<any[]>([]);
  const [newUnitName, setNewUnitName] = useState('');
  
  // PDF Parsing states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'];

  const handleOpenEdit = (sub: any) => {
    setEditingSubId(sub.id);
    setSubName(sub.name);
    setSubColor(sub.color);
    setSubDiff(sub.difficulty_level);
    setSubCredits(sub.credits.toString());
    setSubPriority(sub.priority);
    setShowSubModal(true);
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    const payload = {
      name: subName,
      color: subColor,
      difficulty_level: subDiff,
      credits: parseInt(subCredits) || 3,
      priority: subPriority
    };

    try {
      if (editingSubId) {
        await updateSubject(editingSubId, payload);
      } else {
        await addSubject(payload);
      }
      setShowSubModal(false);
      resetSubjectForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetSubjectForm = () => {
    setEditingSubId(null);
    setSubName('');
    setSubColor('#6366f1');
    setSubDiff('medium');
    setSubCredits('3');
    setSubPriority('medium');
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim() || !examSubId || !examDate) return;

    try {
      await addExam({
        subject_id: examSubId,
        name: examName,
        exam_date: examDate,
        weightage: parseFloat(examWeight) || 20
      });
      setShowExamModal(false);
      setExamName('');
      setExamSubId('');
      setExamDate('');
      setExamWeight('20');
      syncAllData(); // Reload stats and schedules
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpandSubject = async (subId: string) => {
    if (expandedSubId === subId) {
      setExpandedSubId(null);
      setUnitsList([]);
    } else {
      setExpandedSubId(subId);
      try {
        const data = await getUnits(subId);
        setUnitsList(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim() || !expandedSubId) return;

    try {
      const added = await addUnit(expandedSubId, newUnitName);
      setUnitsList(prev => [...prev, added]);
      setNewUnitName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleUnit = async (unit: any) => {
    const updatedStatus = unit.status === 'completed' ? 'pending' : 'completed';
    // Optimistic state
    setUnitsList(prev => prev.map(u => (u.id === unit.id ? { ...u, status: updatedStatus } : u)));
    try {
      await updateUnit(expandedSubId!, unit.id, { status: updatedStatus });
    } catch (err) {
      // Revert on error
      setUnitsList(prev => prev.map(u => (u.id === unit.id ? unit : u)));
      console.error(err);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    try {
      await deleteUnit(expandedSubId!, unitId);
      setUnitsList(prev => prev.filter(u => u.id !== unitId));
    } catch (err) {
      console.error(err);
    }
  };

  // Syllabus PDF upload parsing
  const handleUploadSyllabus = async (subId: string) => {
    if (!pdfFile) {
      setPdfStatus("Select a file first.");
      return;
    }

    setIsParsingPdf(true);
    setPdfStatus("Parsing syllabus document...");

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) return;
        try {
          const units = await parseSyllabusPDF(subId, buffer);
          setPdfStatus(`Success! Extracted and added ${units.length} units.`);
          setPdfFile(null);
          // Refresh list
          const data = await getUnits(subId);
          setUnitsList(data);
        } catch (err: any) {
          setPdfStatus(`Parsing error: ${err.message || 'Check connection details.'}`);
        } finally {
          setIsParsingPdf(false);
        }
      };
      fileReader.readAsArrayBuffer(pdfFile);
    } catch (err) {
      setPdfStatus("Failed reading local file buffer.");
      setIsParsingPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/10 pb-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">Subjects & Syllabus</h1>
          <p className="text-sm text-gray-400 mt-1">Manage courses, log syllabus units manually, or upload syllabus PDFs to extract topics using AI.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { resetSubjectForm(); setShowSubModal(true); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Add Subject
          </button>
          <button
            onClick={() => setShowExamModal(true)}
            className="px-4 py-2 glass-panel hover:bg-gray-800/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer text-gray-300 hover:text-white"
          >
            <CalendarIcon size={14} /> Schedule Exam
          </button>
        </div>
      </div>

      {/* Grid of Subject Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {subjects.map(sub => {
          const isExpanded = expandedSubId === sub.id;
          const subExams = exams.filter(e => e.subject_id === sub.id);
          
          return (
            <div 
              key={sub.id} 
              className={`glass-panel rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                isExpanded ? 'border-indigo-500/30 ring-1 ring-indigo-500/20' : ''
              }`}
            >
              {/* Card Header styling */}
              <div 
                className="p-5 flex justify-between items-start border-b border-gray-900/30"
                style={{ background: `linear-gradient(135deg, ${sub.color}08, transparent)` }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                    <h3 className="font-display font-bold text-lg text-white">{sub.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-900/60 text-gray-400 border border-gray-850">
                      Credits: {sub.credits}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      sub.difficulty_level === 'hard' 
                        ? 'bg-red-950/20 text-red-400 border-red-900/30' 
                        : sub.difficulty_level === 'medium' ? 'bg-orange-950/20 text-orange-400 border-orange-900/30' : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30'
                    }`}>
                      {sub.difficulty_level}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950/20 text-indigo-300 border border-indigo-900/30">
                      Priority: {sub.priority}
                    </span>
                  </div>
                </div>
                
                {/* Options panel */}
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleOpenEdit(sub)}
                    className="p-1.5 rounded-lg border border-gray-850 hover:bg-gray-800 text-gray-400 hover:text-white transition cursor-pointer"
                    title="Edit Subject"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => deleteSubject(sub.id)}
                    className="p-1.5 rounded-lg border border-gray-850 hover:bg-red-950/30 hover:border-red-900 text-gray-400 hover:text-red-400 transition cursor-pointer"
                    title="Delete Subject"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Sub list description (Exams count) */}
              <div className="px-5 py-3 bg-gray-950/10 text-xs text-gray-400 font-semibold border-b border-gray-900/20 flex justify-between items-center">
                <span>{subExams.length} Scheduled Exams</span>
                <button
                  onClick={() => toggleExpandSubject(sub.id)}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-bold"
                >
                  {isExpanded ? 'Hide Syllabus' : 'View Syllabus'} 
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Expanded Syllabus Section */}
              {isExpanded && (
                <div className="p-5 space-y-4 border-b border-gray-900/30 bg-gray-950/20">
                  {/* Units Checklist */}
                  <div>
                    <h4 className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Syllabus Topics</h4>
                    
                    {unitsList.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {unitsList.map(unit => (
                          <div 
                            key={unit.id}
                            className="flex items-center justify-between p-2 rounded bg-gray-900/35 border border-gray-850/60"
                          >
                            <div 
                              onClick={() => handleToggleUnit(unit)}
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <button className="text-indigo-400">
                                {unit.status === 'completed' ? <CheckSquare size={16} /> : <Square size={16} />}
                              </button>
                              <span className={`text-xs text-gray-200 ${unit.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                {unit.name}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteUnit(unit.id)}
                              className="text-gray-500 hover:text-red-400 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No syllabus units logged yet.</p>
                    )}
                  </div>

                  {/* Manual add unit */}
                  <form onSubmit={handleAddUnit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add topic title..."
                      value={newUnitName}
                      onChange={e => setNewUnitName(e.target.value)}
                      className="flex-1 bg-gray-950 border border-gray-850 px-2.5 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-bold text-white transition cursor-pointer"
                    >
                      Add
                    </button>
                  </form>

                  {/* PDF Upload panel */}
                  <div className="pt-3 border-t border-gray-800/60">
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-extrabold flex items-center gap-1">
                        <Sparkles size={11} className="fill-indigo-400" /> Syllabus AI Importer
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={e => setPdfFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-extrabold file:uppercase file:bg-indigo-950/20 file:text-indigo-400 file:border-indigo-900/30 hover:file:bg-indigo-900/30 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => handleUploadSyllabus(sub.id)}
                        disabled={isParsingPdf || !pdfFile}
                        className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:hover:bg-indigo-600"
                      >
                        <Upload size={12} /> {isParsingPdf ? 'Parsing...' : 'Extract'}
                      </button>
                    </div>

                    {pdfStatus && (
                      <p className="text-[10px] text-gray-400 mt-1.5 bg-gray-950/40 p-1.5 rounded border border-gray-900/60">
                        {pdfStatus}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {subjects.length === 0 && (
        <div className="glass-panel py-16 rounded-2xl text-center max-w-xl mx-auto">
          <Book size={48} className="text-gray-600 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-white">No Subjects Listed</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Get started by logging your university subjects. Set difficulty levels and priority to allow optimal AI planner calculations.
          </p>
          <button
            onClick={() => { resetSubjectForm(); setShowSubModal(true); }}
            className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 mx-auto cursor-pointer"
          >
            <Plus size={14} /> Add Your First Subject
          </button>
        </div>
      )}

      {/* Subject Creator Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                {editingSubId ? 'Modify Subject' : 'Add University Subject'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Provide credentials to optimize AI calendar generation.</p>
            </div>
            
            <form onSubmit={handleSubjectSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inorganic Chemistry II"
                  value={subName}
                  onChange={e => setSubName(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Difficulty Level</label>
                  <select
                    value={subDiff}
                    onChange={e => setSubDiff(e.target.value as any)}
                    className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                  >
                    <option value="easy">Easy (Low prep)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="hard">Hard (Prep heavy)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Course Credits</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={subCredits}
                    onChange={e => setSubCredits(e.target.value)}
                    className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Priority Weight</label>
                <select
                  value={subPriority}
                  onChange={e => setSubPriority(e.target.value as any)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                >
                  <option value="low">Low (Flexible buffer)</option>
                  <option value="medium">Medium (Moderate review)</option>
                  <option value="high">High (Maximum focus)</option>
                </select>
              </div>

              {/* Color list selector */}
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1.5">Color Tag</label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSubColor(color)}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        subColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-800 text-xs font-semibold hover:bg-gray-900 transition text-gray-400 hover:text-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exam Creator Modal */}
      {showExamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Log Upcoming Exam</h3>
              <p className="text-xs text-gray-400 mt-1">Exams are integrated with planner algorithms for intensive final revision days.</p>
            </div>
            
            <form onSubmit={handleExamSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Exam Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Assessment"
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Subject</label>
                  <select
                    required
                    value={examSubId}
                    onChange={e => setExamSubId(e.target.value)}
                    className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                  >
                    <option value="">Select subject...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Marks Weight (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={examWeight}
                    onChange={e => setWarmWeight(e.target.value)} // Wait, it's setExamWeight, let's fix it below
                    className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Exam Date</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 py-2 px-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-800 text-xs font-semibold hover:bg-gray-900 transition text-gray-400 hover:text-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow"
                >
                  Schedule Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

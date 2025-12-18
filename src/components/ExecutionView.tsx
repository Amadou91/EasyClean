import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { Check, Clock, ArrowLeft, RotateCw, SkipForward } from 'lucide-react';

interface ExecutionViewProps {
  inventory: Task[];
  setInventory: React.Dispatch<React.SetStateAction<Task[]>>;
  onBack: () => void;
  timeWindow: number;
  activeZone: string | null;
}

const PriorityBadge = ({ priority }: { priority: number }) => {
    const styles: Record<number, string> = {
        1: "bg-rose-50 text-rose-700 border-rose-200",
        2: "bg-amber-50 text-amber-700 border-amber-200",
        3: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${styles[priority] || styles[3]}`}>
            P{priority}
        </span>
    );
};

export const ExecutionView: React.FC<ExecutionViewProps> = ({ 
  inventory, setInventory, onBack, timeWindow, activeZone 
}) => {
  const [sessionTasks, setSessionTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [noTasksFound, setNoTasksFound] = useState(false);

  useEffect(() => {
    let pending = inventory.filter(t => t.status === 'pending');
    
    if (activeZone) {
        pending = pending.filter(t => t.zone === activeZone);
    }
    
    const sorted = pending.sort((a, b) => {
        const aIsBlocked = inventory.some(i => i.id === a.dependency && i.status !== 'completed');
        const bIsBlocked = inventory.some(i => i.id === b.dependency && i.status !== 'completed');
        
        if (aIsBlocked && !bIsBlocked) return 1;
        if (!aIsBlocked && bIsBlocked) return -1;
        
        if (a.priority !== b.priority) {
            return (a.priority || 2) - (b.priority || 2);
        }
        return a.duration - b.duration; 
    });

    let accumulatedTime = 0;
    const queue: Task[] = [];
    
    for (const task of sorted) {
        if (task.dependency) {
             const dep = inventory.find(i => i.id === task.dependency);
             if(dep && dep.status !== 'completed') continue;
        }

        if (accumulatedTime + task.duration <= timeWindow) {
            queue.push(task);
            accumulatedTime += task.duration;
        }
    }
    
    if (queue.length === 0 && pending.length > 0 && timeWindow < 9999) {
          setNoTasksFound(true);
    }

    setSessionTasks(queue);
    setCurrentTaskIndex(0);
  }, [inventory, timeWindow, activeZone]);

  const handleComplete = () => {
    const task = sessionTasks[currentTaskIndex];
    if (!task) return;
    setInventory(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', lastCompleted: Date.now() } : t));
    setCurrentTaskIndex(prev => Math.min(prev + 1, sessionTasks.length));
  };

  const handleSwap = () => {
    const currentTask = sessionTasks[currentTaskIndex];
    if (!currentTask) return;

    const candidates = inventory.filter(t => 
        t.status === 'pending' && 
        !sessionTasks.find(st => st.id === t.id) &&
        !inventory.some(i => i.id === t.dependency && i.status !== 'completed')
    );

    if (candidates.length === 0) {
        alert("No other available tasks to swap with!");
        return;
    }

    candidates.sort((a, b) => {
        const diffA = Math.abs(a.duration - currentTask.duration);
        const diffB = Math.abs(b.duration - currentTask.duration);
        return diffA - diffB;
    });

    const replacement = candidates[0];
    const newSession = [...sessionTasks];
    newSession[currentTaskIndex] = replacement;
    setSessionTasks(newSession);
  };

  const handleSkip = () => {
       setCurrentTaskIndex(prev => Math.min(prev + 1, sessionTasks.length));
  };

  const currentTask = sessionTasks[currentTaskIndex];
  
  if (sessionTasks.length === 0) {
       return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in zoom-in-95">
              <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center border border-stone-300 shadow-sm">
                   {noTasksFound ? <Clock className="w-10 h-10 text-stone-400" /> : <Check className="w-10 h-10 text-stone-400" />}
              </div>
              <div>
                  <h3 className="text-3xl font-serif text-stone-900 mb-2">
                      {noTasksFound ? "Time Limit Reached" : (activeZone ? `${activeZone} Clear!` : "All Caught Up!")}
                  </h3>
                  <p className="text-stone-600 max-w-xs mx-auto text-sm leading-relaxed">
                      {noTasksFound 
                          ? "Remaining tasks take longer than your selected time." 
                          : "No pending tasks match your criteria. Relax!"}
                  </p>
              </div>
              <button onClick={onBack} className="px-6 py-3 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-full font-bold transition-all">Return to Dashboard</button>
          </div>
       )
  }
  
  if (!currentTask) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in zoom-in-95">
              <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200 shadow-lg animate-bounce">
                   <Check className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                  <h3 className="text-3xl font-serif text-stone-900 mb-2">Session Complete</h3>
                  <p className="text-stone-600 max-w-xs mx-auto text-sm leading-relaxed">
                      Wonderful! You've finished all assigned tasks for this block.
                  </p>
              </div>
              <button onClick={onBack} className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-full font-bold transition-all shadow-lg shadow-teal-200">Back to Home</button>
          </div>
      );
  }

  return (
      <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-8">
              <button onClick={onBack} className="text-stone-600 hover:text-stone-900 text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white transition-colors">
                  <ArrowLeft className="w-4 h-4" /> End Session
              </button>
              <div className="text-xs font-bold text-teal-600 uppercase tracking-widest bg-teal-50 border border-teal-200 px-4 py-2 rounded-full shadow-sm">
                  Step {currentTaskIndex + 1} <span className="text-teal-400">/</span> {sessionTasks.length}
              </div>
          </div>

          <div className="flex-1">
              <div className="card-panel rounded-[2rem] overflow-hidden shadow-xl bg-white border-t-8 border-t-teal-500">
                   <div className="p-10 space-y-8">
                      <div className="flex justify-between items-start">
                          <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest border border-stone-300 px-3 py-1 rounded-full">
                                      {currentTask.zone}
                                  </span>
                                  <PriorityBadge priority={currentTask.priority || 2} />
                                  {currentTask.recurrence > 0 && (
                                      <div className="text-[10px] text-teal-600 flex items-center gap-1 bg-teal-50 px-3 py-1 rounded-full font-bold border border-teal-200">
                                          <RotateCw className="w-3 h-3" /> {currentTask.recurrence}d
                                      </div>
                                  )}
                              </div>
                              <h2 className="text-4xl font-serif text-stone-900 leading-tight">
                                  {currentTask.label}
                              </h2>
                          </div>
                          <div className="bg-teal-50 px-5 py-3 rounded-2xl text-xl font-bold text-teal-700 border border-teal-200 flex items-center gap-2 shadow-sm">
                              <Clock className="w-6 h-6 text-teal-500" />
                              {currentTask.duration}m
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 pt-4">
                          <button 
                            onClick={handleComplete}
                            className="text-lg py-5 w-full rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                          >
                              <Check className="w-6 h-6" /> Mark Complete
                          </button>
                          
                          {activeZone ? (
                              <button onClick={handleSkip} className="w-full py-4 text-stone-600 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                  <SkipForward className="w-4 h-4" /> Skip Task
                              </button>
                          ) : (
                              <div className="grid grid-cols-2 gap-4">
                                  <button onClick={handleSwap} className="py-4 text-stone-600 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                      <RotateCw className="w-4 h-4" /> Swap Task
                                  </button>
                                  <button onClick={handleSkip} className="py-4 text-stone-600 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                      <SkipForward className="w-4 h-4" /> Skip Task
                                  </button>
                              </div>
                          )}
                      </div>
                   </div>
              </div>

              <div className="mt-10">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4 ml-2">Up Next</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {sessionTasks.slice(currentTaskIndex + 1).map((t) => (
                          <div key={t.id} className="flex justify-between items-center p-5 rounded-2xl bg-white border border-stone-200 shadow-sm text-sm text-stone-700 hover:border-teal-300 transition-colors">
                              <span className="truncate flex-1 font-medium">{t.label}</span>
                              <div className="flex items-center gap-3">
                                  {t.recurrence > 0 && <RotateCw className="w-3 h-3 text-teal-400" />}
                                  <PriorityBadge priority={t.priority || 2} />
                                  <span className="font-mono text-xs text-stone-500 w-8 text-right">{t.duration}m</span>
                              </div>
                          </div>
                      ))}
                      {sessionTasks.slice(currentTaskIndex + 1).length === 0 && (
                          <div className="text-sm text-stone-500 italic text-center py-6 bg-white/50 rounded-2xl border border-dashed border-stone-300">No further tasks in queue.</div>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );
};
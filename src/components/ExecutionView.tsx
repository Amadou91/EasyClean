import React, { useState, useEffect, useMemo } from 'react';
import { Task } from '../types';
import { Check, Clock, ArrowLeft, RotateCw, SkipForward, Lock } from 'lucide-react';

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

  // Helper to determine duration color styles
  const getDurationStyles = (duration: number) => {
    if (duration <= 15) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (duration <= 30) return "bg-teal-50 text-teal-700 border-teal-200";
    if (duration <= 45) return "bg-amber-50 text-amber-700 border-amber-200";
    if (duration <= 60) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

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

  const eligibleNextTasks = sessionTasks.slice(currentTaskIndex + 1);

  const conditionalNextTasks = useMemo(() => {
    if (!currentTask) return [];

    return inventory
      .filter(t => {
        const matchesZone = !activeZone || t.zone === activeZone;
        const isBlockedByCurrent = t.dependency === currentTask.id;
        const notAlreadyQueued = !eligibleNextTasks.find(nt => nt.id === t.id);

        return (
          t.status === 'pending' &&
          matchesZone &&
          isBlockedByCurrent &&
          notAlreadyQueued
        );
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return (a.priority || 2) - (b.priority || 2);
        }
        return a.duration - b.duration;
      });
  }, [inventory, currentTask, activeZone, eligibleNextTasks]);
  
    if (sessionTasks.length === 0) {
         return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in-95">
                <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center border border-[color:var(--border)] shadow-lg shadow-emerald-100">
                     {noTasksFound ? <Clock className="w-10 h-10 text-emerald-700" /> : <Check className="w-10 h-10 text-emerald-700" />}
                </div>
                <div>
                    <h3 className="text-3xl font-serif text-stone-900 mb-2">
                        {noTasksFound ? "Time Limit Reached" : (activeZone ? `${activeZone} Clear!` : "All Caught Up!")}
                    </h3>
                    <p className="text-stone-600 max-w-xs mx-auto text-sm leading-relaxed">
                        {noTasksFound
                            ? "Remaining tasks take longer than your selected time."
                            : "No pending tasks match your criteria. Take a breath."}
                    </p>
                </div>
                <button onClick={onBack} className="px-6 py-3 bg-white hover:bg-emerald-50 text-stone-800 border border-[color:var(--border)] rounded-full font-bold transition-all shadow-md shadow-emerald-100">Return to Dashboard</button>
            </div>
         )
    }
  
  if (!currentTask) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in-95">
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
        <div className="flex flex-col min-h-full animate-in slide-in-from-right duration-300 overflow-hidden">
            <div className="flex justify-between items-center mb-6 sm:mb-8 flex-shrink-0">
                <button onClick={onBack} className="text-stone-700 hover:text-stone-900 text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-[color:var(--border)] hover:bg-white transition-colors shadow-sm">
                    <ArrowLeft className="w-4 h-4" /> End Session
                </button>
                <div className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-[0.28em] bg-emerald-50 border border-[color:var(--border)] px-4 py-2 rounded-full shadow-sm">
                    Step {currentTaskIndex + 1} <span className="text-emerald-400">/</span> {sessionTasks.length}
                </div>
            </div>

            <div className="space-y-8 pb-6">
                <div className="card-panel rounded-[2rem] overflow-hidden shadow-xl bg-white border-t-8 border-t-emerald-500 flex-shrink-0">
                     <div className="p-6 sm:p-10 space-y-6 sm:y-8">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-stone-600 uppercase tracking-[0.28em] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-1 rounded-full">
                                        {currentTask.zone}
                                    </span>
                                    <PriorityBadge priority={currentTask.priority || 2} />
                                    {currentTask.recurrence > 0 && (
                                        <div className="text-[10px] text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full font-bold border border-[color:var(--border)]">
                                            <RotateCw className="w-3 h-3" /> {currentTask.recurrence}d
                                        </div>
                                    )}
                                </div>
                              <h2 className="text-2xl sm:text-4xl font-serif text-stone-900 leading-tight">
                                  {currentTask.label}
                              </h2>
                          </div>
                          <div className={`px-4 py-2 sm:px-5 sm:py-3 rounded-2xl text-lg sm:text-xl font-bold border flex items-center gap-2 shadow-sm ${getDurationStyles(currentTask.duration)}`}>
                              <Clock className="w-5 h-5 sm:w-6 sm:h-6 opacity-70" />
                              {currentTask.duration}m
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:gap-4 pt-2">
                            <button
                              onClick={handleComplete}
                              className="text-base sm:text-lg py-4 sm:py-5 w-full rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xl shadow-emerald-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5 sm:w-6 sm:h-6" /> Mark Complete
                            </button>

                            {activeZone ? (
                                <button onClick={handleSkip} className="w-full py-3 sm:py-4 text-stone-700 bg-white hover:bg-[color:var(--surface-muted)] border border-[color:var(--border)] rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                    <SkipForward className="w-4 h-4" /> Skip Task
                                </button>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <button onClick={handleSwap} className="py-3 sm:py-4 text-stone-700 bg-white hover:bg-[color:var(--surface-muted)] border border-[color:var(--border)] rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                        <RotateCw className="w-4 h-4" /> Swap
                                    </button>
                                    <button onClick={handleSkip} className="py-3 sm:py-4 text-stone-700 bg-white hover:bg-[color:var(--surface-muted)] border border-[color:var(--border)] rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                        <SkipForward className="w-4 h-4" /> Skip
                                    </button>
                                </div>
                            )}
                      </div>
                   </div>
              </div>

                <div>
                    <h4 className="text-[10px] font-bold text-stone-600 uppercase tracking-[0.28em] mb-4 ml-2">Up Next</h4>
                    <div className="space-y-3">
                        {eligibleNextTasks.map((t) => (
                            <div key={t.id} className="flex justify-between items-center p-4 sm:p-5 rounded-2xl bg-white/90 border border-[color:var(--border)] shadow-sm text-sm text-stone-800 hover:border-emerald-300 transition-colors">
                                <span className="truncate flex-1 font-medium">{t.label}</span>
                                <div className="flex items-center gap-3">
                                    {t.recurrence > 0 && <RotateCw className="w-3 h-3 text-emerald-400" />}
                                    <PriorityBadge priority={t.priority || 2} />
                                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border w-12 text-center ${getDurationStyles(t.duration)}`}>
                                        {t.duration}m
                                    </span>
                                </div>
                            </div>
                        ))}

                        {conditionalNextTasks.map((t) => (
                            <div
                                key={t.id}
                                className="flex justify-between items-start p-4 sm:p-5 rounded-2xl bg-white/60 border border-dashed border-emerald-300/70 shadow-sm text-sm text-stone-600 backdrop-blur transition-colors"
                            >
                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                                        <Lock className="w-3.5 h-3.5" /> Unlocks next
                                    </div>
                                    <span className="truncate font-semibold text-stone-800">{t.label}</span>
                                    <p className="text-[12px] text-stone-500">Becomes next after this task.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {t.recurrence > 0 && <RotateCw className="w-3 h-3 text-emerald-400" />}
                                    <PriorityBadge priority={t.priority || 2} />
                                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border w-12 text-center ${getDurationStyles(t.duration)}`}>
                                        {t.duration}m
                                    </span>
                                </div>
                            </div>
                        ))}

                        {eligibleNextTasks.length === 0 && conditionalNextTasks.length === 0 && (
                            <div className="text-sm text-stone-500 italic text-center py-6 bg-white/70 rounded-2xl border border-dashed border-[color:var(--border)]">No further tasks in queue.</div>
                        )}
                    </div>
                </div>
          </div>
      </div>
  );
};
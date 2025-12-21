import React, { useMemo, useState } from 'react';
import { Task } from '../types';
import { Clock, Check, Play, Edit, Zap } from 'lucide-react';

interface DashboardViewProps {
  inventory: Task[];
  onSwitchView: (view: 'dashboard' | 'execute' | 'inventory') => void;
  onFilterZone: (zone: string) => void;
  selectedTime: number;
  setSelectedTime: (time: number) => void;
  onTackleArea: (zone: string) => void;
}

const Countdown = () => {
    // State for target date, defaulting to NYE logic if nothing saved
    const [targetDate, setTargetDate] = useState<Date>(() => {
        try {
            const saved = localStorage.getItem('easyCleanTargetDate');
            if (saved) return new Date(saved);
        } catch {
            // Ignore storage errors
        }
        
        const today = new Date();
        const currentYear = today.getFullYear();
        let nye = new Date(currentYear, 11, 31);
        if (today.getMonth() === 11 && today.getDate() > 31) {
            nye = new Date(currentYear + 1, 11, 31);
        }
        return nye;
    });

    const [isHovering, setIsHovering] = useState(false);

    const today = new Date();
    const diffTime = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, diffTime);

    const handleEditDate = () => {
        const currentStr = targetDate.toISOString().split('T')[0];
        const newDateStr = prompt("Set target date (YYYY-MM-DD):", currentStr);
        if (newDateStr) {
            const newDate = new Date(newDateStr);
            if (!isNaN(newDate.getTime())) {
                setTargetDate(newDate);
                localStorage.setItem('easyCleanTargetDate', newDate.toISOString());
            } else {
                alert("Invalid date format.");
            }
        }
    };

    return (
        <div 
            className="flex flex-col items-end cursor-pointer group relative select-none"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={handleEditDate}
            title="Click to change target date"
        >
            <div className="flex items-center gap-2">
                <div className={`transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
                     <Edit className="w-4 h-4 text-stone-400" />
                </div>
                <span className="text-4xl font-serif text-teal-900">{daysLeft}</span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">
                Days Left
            </span>
        </div>
    );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  inventory, onSwitchView, onFilterZone, selectedTime, setSelectedTime, onTackleArea
}) => {
  const totalTasks = inventory.length;
  const completedTasks = inventory.filter(t => t.status === 'completed').length;
  const operationalPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
  const zones = [...new Set(inventory.map(t => t.zone))];

  const [viewMode, setViewMode] = useState<'rooms' | 'tasks'>('rooms');

  const groupedTasks = useMemo(() =>
      zones.map(zone => ({
          zone,
          tasks: inventory.filter(t => t.zone === zone)
      })).filter(group => group.tasks.length > 0)
  , [inventory, zones]);

  const getPriorityStyle = (priority: number) => {
      switch (priority) {
          case 3:
              return 'text-rose-700 bg-rose-50 border-rose-100';
          case 2:
              return 'text-amber-700 bg-amber-50 border-amber-100';
          default:
              return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      }
  };

  // Helper to determine button color based on duration
  const getTimeColor = (val: number, isSelected: boolean) => {
      if (isSelected) {
          if (val <= 15) return 'bg-emerald-500 text-white shadow-emerald-200';
          if (val <= 30) return 'bg-teal-600 text-white shadow-teal-200';
          if (val <= 45) return 'bg-amber-500 text-white shadow-amber-200';
          if (val <= 60) return 'bg-orange-500 text-white shadow-orange-200';
          return 'bg-rose-500 text-white shadow-rose-200'; // For 'All' or > 60
      }
      // Default / Unselected state
      return 'bg-white text-stone-600 border border-stone-200 hover:border-teal-300 hover:text-teal-700';
  };

  return (
    <div className="min-h-full space-y-9 animate-in fade-in pb-10 scroll-panels">
        {/* Status Card */}
        <div className="card-panel p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-white/90 via-white to-emerald-50/60 border-[color:var(--border)] shadow-[0_25px_70px_-40px_rgba(12,74,57,0.65)]">
            <div className="space-y-3">
                <div className="text-xs uppercase tracking-[0.3em] font-bold text-stone-500">Overall Progress</div>
                <div className="flex items-end gap-3">
                    <div className="text-5xl font-serif text-stone-900 leading-none">{operationalPercent}%</div>
                    <span className="text-lg text-stone-500 font-semibold">tidied</span>
                </div>
                <div className="h-3.5 w-64 bg-[color:var(--surface-muted)] rounded-full overflow-hidden shadow-inner border border-[color:var(--border)]">
                    <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-teal-700 h-full transition-all duration-1000 rounded-full" style={{ width: `${operationalPercent}%` }}></div>
                </div>
                <p className="text-sm text-stone-600 max-w-xl leading-relaxed">Keep a steady cadence—short bursts compound into a beautifully calm home.</p>
            </div>
            <div className="flex-shrink-0">
                <Countdown />
            </div>
        </div>

        {/* Execution Panel */}
        <div className="card-panel p-8 rounded-3xl bg-white/95 border-[color:var(--border)]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="flex-1">
                    <label className="text-xs text-stone-600 uppercase font-bold mb-4 flex items-center gap-2 tracking-[0.3em]">
                        <Clock className="w-4 h-4 text-teal-600" /> How much time do you have?
                    </label>
                    <div className="flex gap-3 overflow-x-auto py-2 px-1 -mx-1 no-scrollbar">
                        {[15, 30, 45, 60, 9999].map((val) => (
                            <button
                                key={val}
                                onClick={() => setSelectedTime(val)}
                                className={`py-2.5 px-6 rounded-full text-sm font-bold transition-all whitespace-nowrap duration-200 shadow-sm ${
                                    getTimeColor(val, selectedTime === val)
                                } ${selectedTime === val ? 'scale-[1.03]' : 'hover:scale-[1.02]'}`}
                            >
                                {val === 9999 ? 'All' : `${val}m`}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="md:w-auto w-full">
                    <button
                        onClick={() => onSwitchView('execute')}
                        className="w-full md:w-auto px-10 py-4 text-base rounded-full font-bold flex items-center gap-2 justify-center transition-all active:scale-[0.98] bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 hover:shadow-[0_20px_55px_-28px_rgba(12,74,57,0.9)] text-white shadow-lg"
                    >
                        <Zap className="w-5 h-5 fill-current" /> Start Cleaning
                    </button>
                </div>
            </div>
        </div>

        {/* Zone Lst */}
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between px-2">
                <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-serif text-stone-900 text-2xl">Your Rooms</h3>
                    <div
                        className="inline-flex items-center bg-[color:var(--surface-muted)] border border-[color:var(--border)] rounded-full p-1 shadow-inner"
                        role="group"
                        aria-label="Toggle between rooms and tasks"
                    >
                        <button
                            type="button"
                            onClick={() => setViewMode('rooms')}
                            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${viewMode === 'rooms' ? 'bg-white shadow-sm text-teal-900' : 'text-stone-600 hover:text-teal-800'}`}
                            aria-pressed={viewMode === 'rooms'}
                        >
                            Your Rooms
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('tasks')}
                            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${viewMode === 'tasks' ? 'bg-white shadow-sm text-teal-900' : 'text-stone-600 hover:text-teal-800'}`}
                            aria-pressed={viewMode === 'tasks'}
                        >
                            Your Tasks
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => onFilterZone('All')}
                    className="text-xs font-bold text-teal-800 hover:text-teal-900 bg-emerald-50 hover:bg-emerald-100 px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 shadow-sm border border-[color:var(--border)]"
                >
                    <Edit className="w-3 h-3" /> Edit Tasks
                </button>
            </div>
            <div className="relative">
                {viewMode === 'rooms' && (
                    <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 animate-in fade-in duration-300">
                        {zones.length === 0 && (
                            <div className="text-sm text-stone-500 italic p-10 text-center bg-white/50 rounded-3xl border border-dashed border-stone-300 col-span-full">
                                No areas defined yet. Add tasks to create your spaces.
                            </div>
                        )}
                        {zones.map(zone => {
                            const zoneTasks = inventory.filter(t => t.zone === zone);
                            const done = zoneTasks.filter(t => t.status === 'completed').length;
                            const total = zoneTasks.length;
                            const pct = total > 0 ? Math.round((done/total)*100) : 0;
                            const isComplete = pct === 100 && total > 0;

                            return (
                                <div
                                    key={zone}
                                    className="card-panel p-6 rounded-3xl flex flex-col justify-between transition-all group border-l-0 card-hover cursor-pointer relative overflow-hidden bg-white/95"
                                    onClick={() => onFilterZone(zone)}
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-inner transition-colors ${isComplete ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-[color:var(--surface-muted)] text-stone-600 border border-[color:var(--border)]'}`}>
                                                {isComplete ? <Check className="w-6 h-6" /> : zone.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-serif font-bold text-stone-900 text-lg leading-tight">{zone}</div>
                                                <div className="text-xs text-stone-500 font-semibold mt-1 uppercase tracking-[0.24em]">{done}/{total} Done</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full bg-[color:var(--surface-muted)] h-1.5 rounded-full overflow-hidden mb-6 border border-[color:var(--border)]">
                                        <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-stone-300'}`} style={{width: `${pct}%`}}></div>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onTackleArea(zone); }}
                                        className="w-full py-2.5 text-[11px] font-bold text-stone-700 hover:text-teal-800 bg-white hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-[0.24em] border border-[color:var(--border)] shadow-sm"
                                    >
                                        <Play className="w-3 h-3" /> Tackle Area
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
                {viewMode === 'tasks' && (
                    <div className="card-panel p-5 sm:p-6 rounded-3xl bg-white/95 border-[color:var(--border)] space-y-6 animate-in fade-in duration-300">
                        {groupedTasks.length === 0 && (
                            <div className="text-sm text-stone-500 italic p-6 text-center bg-white/70 rounded-2xl border border-dashed border-stone-300">
                                No tasks available yet. Add tasks to see them grouped by room.
                            </div>
                        )}
                        {groupedTasks.map(({ zone, tasks }) => (
                            <div key={zone} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="font-serif text-lg text-stone-900">{zone}</div>
                                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-[0.24em]">{tasks.length} Tasks</span>
                                </div>
                                <div className="space-y-3">
                                    {tasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="flex items-start justify-between gap-4 p-3 rounded-2xl bg-white/80 border border-[color:var(--border)] shadow-[0_10px_30px_-24px_rgba(12,74,57,0.55)]"
                                        >
                                            <div className="space-y-1">
                                                <div className="font-semibold text-stone-800 leading-tight">{task.label}</div>
                                                <div className="text-xs text-stone-500 flex items-center gap-1 font-semibold">
                                                    <Clock className="w-3 h-3 text-emerald-600" />
                                                    {task.duration} min
                                                </div>
                                            </div>
                                            <span className={`text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${getPriorityStyle(task.priority)}`}>
                                                Priority {task.priority}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
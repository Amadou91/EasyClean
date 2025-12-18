import React from 'react';
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
    const today = new Date();
    const currentYear = today.getFullYear();
    let nye = new Date(currentYear, 11, 31);
    if (today.getMonth() === 11 && today.getDate() > 31) {
        nye = new Date(currentYear + 1, 11, 31);
    }
    const diffTime = Math.abs(nye.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    return (
        <div className="flex flex-col items-end">
            <span className="text-4xl font-serif text-teal-900">{diffDays}</span>
            <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Days Left</span>
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

  return (
    <div className="h-full overflow-y-auto space-y-8 animate-in fade-in pb-10 pr-2">
        {/* Status Card */}
        <div className="card-panel p-8 rounded-3xl flex justify-between items-center bg-white/80">
            <div>
                <div className="text-stone-500 text-xs uppercase tracking-widest font-bold mb-2">Overall Progress</div>
                <div className="text-5xl font-serif text-stone-800 mb-4">{operationalPercent}% <span className="text-2xl text-stone-400 font-sans font-light">Tidied</span></div>
                <div className="h-4 w-56 bg-white rounded-full overflow-hidden shadow-inner border border-stone-200">
                    <div className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full transition-all duration-1000 rounded-full" style={{ width: `${operationalPercent}%` }}></div>
                </div>
            </div>
            <Countdown />
        </div>

        {/* Execution Panel */}
        <div className="card-panel p-8 rounded-3xl bg-white/90 border-teal-100">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="flex-1">
                    <label className="text-xs text-stone-600 uppercase font-bold mb-4 flex items-center gap-2 tracking-widest">
                        <Clock className="w-4 h-4 text-teal-600" /> How much time do you have?
                    </label>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {[15, 30, 45, 60, 9999].map((val) => (
                            <button
                                key={val}
                                onClick={() => setSelectedTime(val)}
                                className={`py-2 px-6 rounded-full text-sm font-bold transition-all whitespace-nowrap transform duration-200 shadow-sm ${
                                    selectedTime === val 
                                    ? 'bg-teal-600 text-white shadow-teal-200 scale-105' 
                                    : 'bg-white text-stone-600 border border-stone-200 hover:border-teal-300 hover:text-teal-700'
                                }`}
                            >
                                {val === 9999 ? 'All' : `${val}m`}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="md:w-auto w-full">
                    <button 
                        onClick={() => onSwitchView('execute')} 
                        className="w-full md:w-auto px-10 py-4 text-base rounded-full font-bold flex items-center gap-2 justify-center transition-all active:scale-95 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg shadow-emerald-100 hover:shadow-emerald-200"
                    >
                        <Zap className="w-5 h-5 fill-current" /> Start Session
                    </button>
                </div>
            </div>
        </div>

        {/* Zone List */}
        <div className="space-y-6">
            <div className="flex justify-between items-end px-2">
                <h3 className="font-serif text-stone-800 text-2xl">Your Spaces</h3>
                <button 
                    onClick={() => onSwitchView('inventory')} 
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 shadow-sm border border-teal-100"
                >
                    <Edit className="w-3 h-3" /> Edit Tasks
                </button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
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
                            className="card-panel p-6 rounded-3xl flex flex-col justify-between transition-all group border-l-0 card-hover cursor-pointer relative overflow-hidden"
                            onClick={() => onFilterZone(zone)}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-sm transition-colors ${isComplete ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                                        {isComplete ? <Check className="w-6 h-6" /> : zone.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-serif font-bold text-stone-800 text-lg leading-tight">{zone}</div>
                                        <div className="text-xs text-stone-500 font-medium mt-1 uppercase tracking-wide">{done}/{total} Done</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mb-6">
                                <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-stone-300'}`} style={{width: `${pct}%`}}></div>
                            </div>

                            <button 
                                onClick={(e) => { e.stopPropagation(); onTackleArea(zone); }}
                                className="w-full py-2.5 text-[11px] font-bold text-stone-600 hover:text-teal-700 bg-stone-50 hover:bg-teal-50 rounded-xl flex items-center justify-center gap-2 transition-colors uppercase tracking-widest border border-stone-200"
                            >
                                <Play className="w-3 h-3" /> Tackle Area
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    </div>
  );
};
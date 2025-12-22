import { useState } from 'react';
import { useInventory } from './hooks/useInventory';
import { DashboardView } from './components/DashboardView';
import { ExecutionView } from './components/ExecutionView';
import { InventoryView } from './components/InventoryView';
import { LoginView } from './components/LoginView';
import { Home, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Level } from './types';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'execute' | 'inventory'>('dashboard');
  const [filterZone, setFilterZone] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(30);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<Level | null>(null); // New State
  
  const {
    inventory,
    zones, // Now Zone[]
    addTask,
    deleteTask,
    addZone, 
    deleteZone,
    user,
    loading,
    updateTask,
    exportData,
    importData
  } = useInventory();

  if (loading) {
      return (
          <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#f1f8f5_0,#f7f9fb_35%,#eef4f6_100%)] flex items-center justify-center">
              <div className="animate-pulse text-teal-700 font-serif text-xl tracking-tight">Loading EasyClean...</div>
          </div>
      );
  }

  if (!user) {
      return <LoginView />;
  }

  const handleLogout = async () => {
      await supabase.auth.signOut();
  };

  return (
    <div className="app-shell h-[100dvh] w-full flex flex-col overflow-hidden">

      <div className="flex-shrink-0 w-full flex justify-center pt-5">
        <div className="glass-panel w-full max-w-6xl flex justify-between items-center px-5 py-4 rounded-3xl">
            <div className="flex items-center gap-3">
                <button
                    className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2 sm:p-2.5 rounded-2xl shadow-lg shadow-emerald-200 border border-white/50"
                    onClick={() => setView('dashboard')}
                    aria-label="Go to dashboard"
                >
                    <Home className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <h1
                    className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-500 tracking-tight font-serif cursor-pointer"
                    onClick={() => setView('dashboard')}
                >
                    EasyClean
                </h1>
            </div>
            <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-[color:var(--border)] text-[13px] font-semibold text-stone-700 shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
                    {user.email}
                </div>
                <button onClick={handleLogout} className="text-stone-500 hover:text-red-600 transition-all p-2 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-[color:var(--border)]" title="Sign Out">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full overflow-y-auto relative overscroll-contain pwa-scroll-area mt-4 pb-6">
          <div className="w-full max-w-6xl mx-auto min-h-full px-2 sm:px-4">
            {view === 'dashboard' && (
                <DashboardView
                  inventory={inventory}
                  zones={zones}
                  onSwitchView={setView}
                  onFilterZone={(z) => { setFilterZone(z); setView('inventory'); }}
                  selectedTime={selectedTime}
                  setSelectedTime={setSelectedTime}
                  onTackleArea={(zone) => {
                      setSelectedTime(9999);
                      setActiveZone(zone);
                      setActiveLevel(null);
                      setView('execute');
                  }}
                  onStartExecution={(level) => {
                      setActiveLevel(level); // Set the level filter
                      setActiveZone(null);
                      setView('execute');
                  }}
                />
            )}
            {view === 'execute' && (
                <ExecutionView
                  inventory={inventory}
                  zones={zones} // Pass zones so execution view knows levels
                  onBack={() => { setView('dashboard'); setActiveZone(null); setActiveLevel(null); }}
                  timeWindow={selectedTime}
                  activeZone={activeZone}
                  activeLevel={activeLevel} // Pass the active level
                  onUpdateTask={updateTask}
                />
            )}
            {view === 'inventory' && (
                <InventoryView 
                    inventory={inventory} 
                    onAddTask={addTask} 
                    onDeleteTask={deleteTask} 
                    onAddZone={addZone}
                    onDeleteZone={deleteZone}
                    onUpdateTask={updateTask}
                    onExport={exportData}
                    onImport={importData}
                    availableZones={zones} // Now Zone[]
                    onBack={() => setView('dashboard')} 
                    initialFilter={filterZone} 
                />
            )}
          </div>
      </div>
    </div>
  );
}
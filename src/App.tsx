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
  const [sessionLevel, setSessionLevel] = useState<Level | null>(null);
  const [showLevelPrompt, setShowLevelPrompt] = useState(false);
  
  const {
    inventory,
    zones,
    addTask,
    deleteTask,
    addZone, 
    deleteZone,
    user,
    loading,
    updateTask,
    exportData,
    importData,
    updateZoneLevel
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

  const handleStartSession = () => {
      setActiveZone(null);

      const uniqueLevels = Array.from(new Set(zones.map(z => z.level)));

      if (uniqueLevels.length === 0) {
          setSessionLevel('Lower Level');
          setView('execute');
          return;
      }

      if (uniqueLevels.length === 1) {
          setSessionLevel(uniqueLevels[0]);
          setView('execute');
          return;
      }

      setShowLevelPrompt(true);
  };

  const handleSelectLevel = (level: Level) => {
      setSessionLevel(level);
      setShowLevelPrompt(false);
      setView('execute');
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

      {/* SCROLL CONTAINER
         FIX: This is now 'w-full' (Full Width).
         It captures scroll gestures across the entire screen width.
      */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto relative overscroll-contain pwa-scroll-area mt-4 pb-6">

          {/* CONTENT WRAPPER
             The 'max-w-6xl' constraint is moved INSIDE the scroll view.
             Added 'min-h-full' to ensure views that need height can stretch.
          */}
          <div className="w-full max-w-6xl mx-auto min-h-full px-2 sm:px-4">
            {view === 'dashboard' && (
                <DashboardView
                inventory={inventory}
                onFilterZone={(z) => { setFilterZone(z); setView('inventory'); }}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                onTackleArea={(zone) => {
                    setSelectedTime(9999);
                    const matchedRoom = zones.find(r => r.name === zone);
                    setSessionLevel(matchedRoom?.level ?? 'Lower Level');
                    setActiveZone(zone);
                    setView('execute');
                }}
                onStartSession={handleStartSession}
                />
            )}
      {view === 'execute' && (
          <ExecutionView
              inventory={inventory}
                onBack={() => { setView('dashboard'); setActiveZone(null); setSessionLevel(null); }}
                timeWindow={selectedTime}
                activeZone={activeZone}
                onUpdateTask={updateTask}
                rooms={zones}
                activeLevel={sessionLevel}
            />
        )}
            {view === 'inventory' && (
                <InventoryView
                    inventory={inventory}
                    onAddTask={addTask}
                    onDeleteTask={deleteTask}
                    onAddZone={addZone}
                    onDeleteZone={deleteZone}
                    onUpdateZoneLevel={updateZoneLevel}
                    onUpdateTask={updateTask}
                    onExport={exportData}
                    onImport={importData}
                    availableZones={zones}
                    onBack={() => setView('dashboard')}
                    initialFilter={filterZone}
                />
            )}
          </div>
      </div>

      {showLevelPrompt && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
              <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 border border-stone-100 animate-in zoom-in-95">
                  <div className="space-y-1">
                      <p className="text-xs font-bold uppercase tracking-[0.26em] text-stone-500">Pick a Level</p>
                      <h3 className="text-2xl font-serif text-stone-900">Where are you cleaning?</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <button
                          onClick={() => handleSelectLevel('Upper Level')}
                          className="py-3 rounded-2xl font-bold bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200 active:scale-95"
                      >
                          Upstairs
                      </button>
                      <button
                          onClick={() => handleSelectLevel('Lower Level')}
                          className="py-3 rounded-2xl font-bold bg-white border border-[color:var(--border)] hover:border-emerald-300 text-stone-800 shadow-sm active:scale-95"
                      >
                          Downstairs
                      </button>
                  </div>
                  <button onClick={() => setShowLevelPrompt(false)} className="w-full text-sm text-stone-500 hover:text-stone-800 font-semibold py-2" aria-label="Cancel level selection">Cancel</button>
              </div>
          </div>
      )}
    </div>
  );
}
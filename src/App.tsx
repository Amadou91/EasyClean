import { useState } from 'react';
import { useInventory } from './hooks/useInventory';
import { DashboardView } from './components/DashboardView';
import { ExecutionView } from './components/ExecutionView';
import { InventoryView } from './components/InventoryView';
import { LoginView } from './components/LoginView';
import { Home, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'execute' | 'inventory'>('dashboard');
  const [filterZone, setFilterZone] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(30);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  
  const { 
    inventory, 
    setInventory,
    zones, 
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
          <div className="min-h-screen bg-stone-50 flex items-center justify-center">
              <div className="animate-pulse text-teal-600 font-serif text-xl">Loading EasyClean...</div>
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
    /* Use h-[100dvh] and overflow-hidden to lock the app to the viewport for PWA */
    <div className="h-[100dvh] w-screen flex flex-col items-center p-4 sm:p-6 bg-gradient-to-br from-stone-50 to-emerald-50/30 overflow-hidden">
      <div className="w-full max-w-4xl flex flex-col h-full overflow-hidden">
        
        <div className="flex justify-between items-center mb-4 sm:mb-8 pb-4 border-b border-emerald-100/50 flex-shrink-0">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center gap-3 tracking-tight font-serif cursor-pointer" onClick={() => setView('dashboard')}>
                    <span className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-1.5 sm:p-2 rounded-xl shadow-lg shadow-emerald-200">
                        <Home className="w-5 h-5 sm:w-6 sm:h-6" />
                    </span>
                    EasyClean
                </h1>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-xs text-stone-400 font-medium hidden sm:block">
                    {user.email}
                </div>
                <button onClick={handleLogout} className="text-stone-400 hover:text-red-500 transition-colors p-2 hover:bg-white rounded-xl hover:shadow-sm" title="Sign Out">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* This container manages the internal scrolling for each view */}
        <div className="flex-1 overflow-hidden relative">
          {view === 'dashboard' && (
            <DashboardView 
              inventory={inventory}
              onSwitchView={setView}
              onFilterZone={(z) => { setFilterZone(z); setView('inventory'); }}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              onTackleArea={(zone) => { setActiveZone(zone); setView('execute'); }}
            />
          )}
          {view === 'execute' && (
            <ExecutionView 
                inventory={inventory} 
                setInventory={setInventory}
                onBack={() => { setView('dashboard'); setActiveZone(null); }} 
                timeWindow={selectedTime}
                activeZone={activeZone}
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
                availableZones={zones} 
                onBack={() => setView('dashboard')} 
                initialFilter={filterZone} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
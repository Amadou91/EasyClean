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
    updateTask, 
    deleteTask, 
    addZone, 
    user,
    loading
  } = useInventory();

  // 1. Loading State
  if (loading) {
      return (
          <div className="min-h-screen bg-stone-50 flex items-center justify-center">
              <div className="animate-pulse text-teal-600 font-serif text-xl">Loading EasyClean...</div>
          </div>
      );
  }

  // 2. Auth State - Show Login if no user
  if (!user) {
      return <LoginView />;
  }

  // 3. Main App (Authenticated)
  const handleLogout = async () => {
      await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 to-emerald-50/30">
      <div className="w-full max-w-4xl flex flex-col h-[90vh] sm:h-[800px]">
        
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-emerald-100/50">
            <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center gap-3 tracking-tight font-serif cursor-pointer" onClick={() => setView('dashboard')}>
                    <span className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white p-2 rounded-xl shadow-lg shadow-emerald-200">
                        <Home className="w-6 h-6" />
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
                setInventory={setInventory}
                onAddTask={addTask} 
                onDeleteTask={deleteTask} 
                onAddZone={addZone} 
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
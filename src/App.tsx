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
    /* FIX: Removed 'items-center' and 'py-4'. 
       We now let the shell be full width and handle spacing internally.
    */
    <div className="app-shell h-[100dvh] w-full flex flex-col bg-gradient-to-br from-stone-50 to-emerald-50/30 overflow-hidden">
      
      {/* HEADER SECTION
         Now a full-width flex container that centers the actual header content.
         Added 'pt-4' here to replace the 'py-4' removed from the parent.
      */}
      <div className="flex-shrink-0 w-full flex justify-center border-b border-emerald-100/50 pt-4">
        <div className="w-full max-w-6xl flex justify-between items-center pb-4">
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
      </div>

      {/* SCROLL CONTAINER
         FIX: This is now 'w-full' (Full Width).
         It captures scroll gestures across the entire screen width.
      */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto relative overscroll-contain pwa-scroll-area">
          
          {/* CONTENT WRAPPER
             The 'max-w-6xl' constraint is moved INSIDE the scroll view.
             Added 'min-h-full' to ensure views that need height can stretch.
          */}
          <div className="w-full max-w-6xl mx-auto min-h-full">
            {view === 'dashboard' && (
                <DashboardView 
                inventory={inventory}
                onSwitchView={setView}
                onFilterZone={(z) => { setFilterZone(z); setView('inventory'); }}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                onTackleArea={(zone) => {
                    setSelectedTime(9999);
                    setActiveZone(zone);
                    setView('execute');
                }}
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
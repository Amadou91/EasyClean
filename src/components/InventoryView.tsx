import React, { useState, useEffect } from 'react';
import { Task, Priority, Status } from '../types';
import { ArrowLeft, Trash, Plus, Repeat, Edit, Check } from 'lucide-react';

interface InventoryViewProps {
  inventory: Task[];
  setInventory: React.Dispatch<React.SetStateAction<Task[]>>;
  onBack: () => void;
  initialFilter?: string | null;
  availableZones: string[];
  onAddZone: (zone: string) => void;
  onAddTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
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

export const InventoryView: React.FC<InventoryViewProps> = ({ 
  inventory, setInventory, onBack, initialFilter, availableZones, onAddZone, onAddTask, onDeleteTask
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [filterZone, setFilterZone] = useState(initialFilter || 'All');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const defaultZone = availableZones.length > 0 ? availableZones[0] : '';
  const startZone = (initialFilter && initialFilter !== 'All') ? initialFilter : defaultZone;

  const [newItem, setNewItem] = useState({ 
      zone: startZone, 
      label: '', 
      duration: 10,
      priority: 2 as Priority,
      recurrence: 0
  });

  useEffect(() => {
      if (!editingId && filterZone !== 'All') {
          setNewItem(prev => ({ ...prev, zone: filterZone }));
      }
  }, [filterZone, editingId]);

  const displayedInventory = filterZone === 'All' 
      ? inventory 
      : inventory.filter(t => t.zone === filterZone);

  const handleSave = () => {
      if(!newItem.label || !newItem.zone) {
          alert("Please provide a task name and select a zone.");
          return;
      }

      if (editingId) {
          setInventory(prev => prev.map(t => t.id === editingId ? { ...t, ...newItem } : t));
          setEditingId(null);
      } else {
          const id = Math.random().toString(36).substr(2, 9);
          setInventory(prev => [...prev, {
              ...newItem,
              id,
              status: 'pending',
              dependency: null,
              lastCompleted: null
          }]);
      }
      
      setIsAdding(false);
      setNewItem({ 
          zone: newItem.zone,
          label: '', 
          duration: 10,
          priority: 2,
          recurrence: 0
      });
  };

  const handleEdit = (task: Task) => {
      setNewItem({
          zone: task.zone,
          label: task.label,
          duration: task.duration,
          priority: task.priority,
          recurrence: task.recurrence || 0
      });
      setEditingId(task.id);
      setIsAdding(true);
  };

  const handleCancelEdit = () => {
      setIsAdding(false);
      setEditingId(null);
      setNewItem({ 
          zone: filterZone !== 'All' ? filterZone : (availableZones[0] || ''), 
          label: '', 
          duration: 10,
          priority: 2,
          recurrence: 0
      });
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Are you sure you want to delete this task?")) {
          setInventory(prev => prev.filter(t => t.id !== id));
      }
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      setInventory(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as Status } : t));
  };

  const handleCreateZone = () => {
      if(newZoneName && !availableZones.includes(newZoneName)){
          onAddZone(newZoneName);
          setNewItem(prev => ({...prev, zone: newZoneName}));
          setIsAddingZone(false);
          setNewZoneName("");
      }
  };

  return (
      <div className="flex flex-col h-full animate-in fade-in">
          <div className="flex justify-between items-center mb-6">
              <button onClick={onBack} className="text-stone-600 hover:text-stone-900 text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h2 className="text-xl font-serif text-stone-900">Task Management</h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar px-1">
              <button 
                  onClick={() => setFilterZone('All')}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${filterZone === 'All' ? 'bg-teal-500 text-white shadow-md shadow-teal-200 scale-105' : 'bg-white text-stone-600 border border-stone-200 hover:border-teal-300'}`}
              >
                  All
              </button>
              {availableZones.map(z => (
                  <button 
                      key={z}
                      onClick={() => setFilterZone(z)}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filterZone === z ? 'bg-teal-500 text-white shadow-md shadow-teal-200 scale-105' : 'bg-white text-stone-600 border border-stone-200 hover:border-teal-300'}`}
                  >
                      {z}
                  </button>
              ))}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-24">
              {displayedInventory.length === 0 ? (
                  <div className="text-center py-12 text-stone-500 text-sm bg-white/50 rounded-2xl border border-dashed border-stone-300 mt-4">
                      No items found in this filter.
                  </div>
              ) : displayedInventory.map(task => (
                  <div key={task.id} className={`card-panel p-4 rounded-2xl flex justify-between items-center group transition-all card-hover ${task.status === 'completed' ? 'opacity-60 bg-white/60' : 'bg-white'}`}>
                      <div className="flex items-start gap-4 flex-1">
                          <div 
                              onClick={() => handleToggleStatus(task.id, task.status)}
                              className={`mt-0.5 w-6 h-6 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : 'border-stone-300 hover:border-teal-400 bg-white'}`}
                          >
                              {task.status === 'completed' && <Check className="w-4 h-4" />}
                          </div>

                          <div className="flex-1">
                              <div className={`font-bold text-sm text-stone-800 mb-1 ${task.status === 'completed' ? 'line-through text-stone-500' : ''}`}>
                                  {task.label}
                              </div>
                              <div className="flex gap-2 text-[10px] font-bold uppercase items-center">
                                  <span className="text-stone-500 bg-stone-100 px-2 py-0.5 rounded">{task.zone}</span>
                                  <PriorityBadge priority={task.priority || 2} />
                                  {task.recurrence > 0 && (
                                      <div className="text-teal-600 flex items-center gap-0.5 bg-teal-50 px-2 py-0.5 rounded border border-teal-100" title={`Repeats every ${task.recurrence} days`}>
                                          <Repeat className="w-3 h-3" />
                                          {task.recurrence}d
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                      <div className="flex items-center gap-3 pl-2">
                          <span className="text-xs font-mono font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded-md">{task.duration}m</span>
                          <button onClick={() => handleEdit(task)} className="text-stone-500 hover:text-teal-600 transition-colors p-2 hover:bg-teal-50 rounded-full">
                              <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDeleteTask(task.id)} className="text-stone-500 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full">
                              <Trash className="w-4 h-4" />
                          </button>
                      </div>
                  </div>
              ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 sm:relative sm:p-0">
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent h-24 -z-10 sm:hidden pointer-events-none"></div>

              {isAdding ? (
                  <div className="card-panel p-6 rounded-[2rem] shadow-2xl animate-enter space-y-5 border-t border-stone-200 bg-white relative z-10 ring-4 ring-emerald-50">
                      <div className="flex justify-between items-center mb-1">
                          <h3 className="text-xs font-black text-stone-500 uppercase tracking-widest">{editingId ? "Edit Task" : "New Task"}</h3>
                          <button onClick={handleCancelEdit} className="text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-full p-2 transition-colors">&times;</button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                          {isAddingZone ? (
                              <div className="flex gap-2 animate-enter">
                                  <input 
                                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all font-medium"
                                      placeholder="New Area Name"
                                      value={newZoneName}
                                      onChange={e => setNewZoneName(e.target.value)}
                                  />
                                  <button onClick={handleCreateZone} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-teal-200 shadow-lg">Save</button>
                                  <button onClick={() => setIsAddingZone(false)} className="px-3 text-stone-500 hover:text-stone-700 bg-stone-50 rounded-xl">&times;</button>
                              </div>
                          ) : (
                              <div className="flex gap-2">
                                  <select 
                                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-sm focus:border-emerald-400 outline-none font-medium appearance-none"
                                      value={newItem.zone || ""} 
                                      onChange={e => setNewItem({...newItem, zone: e.target.value})}
                                  >
                                      <option value="" disabled>Select Area</option>
                                      {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
                                  </select>
                                  <button onClick={() => setIsAddingZone(true)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl border border-stone-200 transition-colors" title="Add New Area">
                                      <Plus className="w-4 h-4" />
                                  </button>
                              </div>
                          )}
                      </div>

                      <input 
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-stone-500 font-medium"
                          placeholder="What needs to be done?"
                          value={newItem.label}
                          onChange={e => setNewItem({...newItem, label: e.target.value})}
                      />

                      <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl p-3 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                              <input 
                                  type="number" 
                                  className="bg-transparent text-stone-900 text-sm w-full outline-none font-bold"
                                  placeholder="Min"
                                  value={newItem.duration}
                                  onChange={e => setNewItem({...newItem, duration: parseInt(e.target.value)})}
                              />
                              <span className="text-xs text-stone-500 font-bold uppercase">min</span>
                          </div>
                          
                          <select 
                              className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-sm focus:border-emerald-400 outline-none font-medium"
                              value={newItem.priority}
                              onChange={e => setNewItem({...newItem, priority: parseInt(e.target.value) as Priority})}
                          >
                              <option value={1}>High Priority</option>
                              <option value={2}>Medium Priority</option>
                              <option value={3}>Low Priority</option>
                          </select>
                      </div>

                      <div className="flex items-center gap-3 mt-2 py-2 px-1">
                          <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer select-none hover:text-emerald-600 transition-colors font-bold">
                              <input type="checkbox" 
                                  checked={newItem.recurrence > 0} 
                                  onChange={e => setNewItem({...newItem, recurrence: e.target.checked ? 1 : 0})}
                                  className="w-5 h-5 rounded border-stone-300 text-emerald-500 focus:ring-emerald-400"
                              />
                              Repeat Task?
                          </label>
                          {newItem.recurrence > 0 && (
                              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 animate-enter">
                                   <span className="text-xs text-emerald-600 font-bold">Every</span>
                                   <input 
                                      type="number" 
                                      min="1"
                                      className="w-12 bg-white border border-emerald-200 rounded text-emerald-700 text-sm outline-none text-center font-bold py-1"
                                      value={newItem.recurrence}
                                      onChange={e => setNewItem({...newItem, recurrence: parseInt(e.target.value) || 1})}
                                   />
                                   <span className="text-xs text-emerald-600 font-bold">days</span>
                              </div>
                          )}
                      </div>

                      <button onClick={handleSave} className="w-full py-4 text-base rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all active:scale-95">{editingId ? "Update Task" : "Create Task"}</button>
                  </div>
              ) : (
                  <button onClick={() => setIsAdding(true)} className="w-full py-5 text-base rounded-[1.5rem] font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-xl shadow-emerald-200 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                      <Plus className="w-6 h-6" /> Add New Task
                  </button>
              )}
          </div>
      </div>
  );
};
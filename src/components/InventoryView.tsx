import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Task, Priority, Status, Zone, Level } from '../types';
import { ArrowLeft, Trash, Plus, Repeat, Edit, Check, X, AlertTriangle, Download, Upload, Link, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { getTaskImagePublicUrl } from '../lib/storage';

interface InventoryViewProps {
  inventory: Task[];
  onBack: () => void;
  initialFilter?: string | null;
  availableZones: Zone[];
  onAddZone: (zone: string, level: Level) => void;
  onDeleteZone: (zone: string) => void;
  onAddTask: (task: Task, imageFile?: File | null) => void;
  onUpdateTask: (id: string, updates: Partial<Task>, options?: { imageFile?: File | null; removeImage?: boolean }) => void;
  onDeleteTask: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
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

const getZoneColor = (zoneName: string, alpha = 1) => {
    if (!zoneName) return `rgba(120, 113, 108, ${alpha})`;
    let hash = 0;
    for (let i = 0; i < zoneName.length; i++) {
        hash = (hash * 31 + zoneName.charCodeAt(i)) % 360;
    }
    return `hsla(${hash}, 70%, 50%, ${alpha})`;
};

export const InventoryView: React.FC<InventoryViewProps> = ({ 
  inventory, onBack, initialFilter, availableZones, onAddZone, onDeleteZone, onAddTask, onUpdateTask, onDeleteTask, onExport, onImport
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneLevel, setNewZoneLevel] = useState<Level>('downstairs'); // New state for zone creation
  const [filterZone, setFilterZone] = useState(initialFilter || 'All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const lastZoneSelectionRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const defaultZoneName = availableZones.length > 0 ? availableZones[0].name : '';
  const startZone = (initialFilter && initialFilter !== 'All') ? initialFilter : defaultZoneName;

  const [newItem, setNewItem] = useState({
      zone: startZone,
      label: '',
      duration: 10,
      priority: 2 as Priority,
      recurrence: 0,
      dependency: null as string | null
  });

  const [isMobile, setIsMobile] = useState(false);

  // Dependency mapping logic...
  const dependencyOptions = useMemo(() => {
      const tasksByZone: Record<string, Task[]> = {};
      inventory
          .filter(t => t.id !== editingId)
          .forEach(task => {
              const zone = task.zone || 'Unassigned';
              if (!tasksByZone[zone]) {
                  tasksByZone[zone] = [];
              }
              tasksByZone[zone].push(task);
          });
      return Object.entries(tasksByZone)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([zone, tasks]) => ({
              zone,
              tasks: [...tasks].sort((a, b) => a.label.localeCompare(b.label))
          }));
  }, [inventory, editingId]);

  useEffect(() => {
      if (!isAdding) {
          setEditingId(null);
          setNewItem({
            zone: filterZone !== 'All' ? filterZone : (availableZones[0]?.name || ''),
            label: '',
            duration: 10,
            priority: 2,
            recurrence: 0,
            dependency: null
        });
        setNewItemImage(null);
        setImagePreview(null);
        setRemoveImage(false);
      }
  }, [isAdding, filterZone, availableZones]);

  useEffect(() => {
      const checkMobile = () => {
          if (typeof window !== 'undefined') {
              const pointerCoarse = window.matchMedia('(pointer: coarse)').matches;
              const smallViewport = window.matchMedia('(max-width: 768px)').matches;
              setIsMobile(pointerCoarse || smallViewport);
          }
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const displayedInventory = useMemo(() => {
      const tasks = filterZone === 'All'
          ? [...inventory]
          : inventory.filter(t => t.zone === filterZone);

      if (filterZone === 'All') {
          return tasks.sort((a, b) => {
              const priorityA = a.priority || 3;
              const priorityB = b.priority || 3;
              if (priorityA !== priorityB) return priorityA - priorityB;
              return a.duration - b.duration;
          });
      }
      return tasks;
  }, [filterZone, inventory]);

  const getDurationStyles = (duration: number) => {
    if (duration <= 15) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (duration <= 30) return "bg-teal-50 text-teal-700 border-teal-200";
    if (duration <= 45) return "bg-amber-50 text-amber-700 border-amber-200";
    if (duration <= 60) return "bg-orange-50 text-orange-700 border-orange-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const handleSave = () => {
      if(!newItem.label || !newItem.zone) {
          alert("Please provide a task name and select a zone.");
          return;
      }

      if (editingId) {
          onUpdateTask(editingId, newItem, { imageFile: newItemImage, removeImage });
          setEditingId(null);
      } else {
          const id = Math.random().toString(36).substr(2, 9);
          const taskToAdd: Task = {
              ...newItem,
              id,
              status: 'pending',
              dependency: newItem.dependency || null,
              lastCompleted: null,
              created_at: new Date().toISOString(),
              user_id: '' 
          } as Task;
          onAddTask(taskToAdd, newItemImage);
      }
      setIsAdding(false);
      setNewItemImage(null);
      setImagePreview(null);
      setRemoveImage(false);
  };

  const handleEdit = (task: Task) => {
      setNewItem({
          zone: task.zone,
          label: task.label,
          duration: task.duration,
          priority: task.priority,
          recurrence: task.recurrence || 0,
          dependency: task.dependency
      });
      setEditingId(task.id);
      setIsAdding(true);
      setImagePreview(getTaskImagePublicUrl(task.image_url));
      setRemoveImage(false);
      setNewItemImage(null);
  };

  const handleDeleteClick = (id: string) => { setDeletingId(id); };
  const confirmDelete = () => {
      if (deletingId) { onDeleteTask(deletingId); setDeletingId(null); }
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      onUpdateTask(id, { status: newStatus as Status });
  };

  const handleCreateZone = () => {
      if(newZoneName && !availableZones.some(z => z.name === newZoneName)){
          onAddZone(newZoneName, newZoneLevel);
          setNewItem(prev => ({...prev, zone: newZoneName}));
          setIsAddingZone(false);
          setNewZoneName("");
          setNewZoneLevel('downstairs'); // reset default
      }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setNewItemImage(file);
          setImagePreview(URL.createObjectURL(file));
          setRemoveImage(false);
      }
  };

  const clearSelectedImage = () => {
      setNewItemImage(null);
      setImagePreview(null);
      setRemoveImage(editingId ? true : false);
      if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onImport(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
      <div className="flex flex-col min-h-full animate-in fade-in relative">
          <div className="flex justify-between items-center mb-6 px-1">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-stone-700 hover:text-stone-900 text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-[color:var(--border)] hover:bg-white transition-colors shadow-sm">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h2 className="text-xl font-serif text-stone-900">Task Management</h2>
              </div>

              <div className="flex items-center gap-2">
                  <button onClick={onExport} className="text-stone-500 hover:text-emerald-700 transition-colors p-2 hover:bg-white rounded-xl border border-transparent hover:border-[color:var(--border)]" title="Export Tasks">
                      <Download className="w-5 h-5" />
                  </button>
                  <button onClick={handleImportClick} className="text-stone-500 hover:text-emerald-700 transition-colors p-2 hover:bg-white rounded-xl border border-transparent hover:border-[color:var(--border)]" title="Import Tasks">
                      <Upload className="w-5 h-5" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
              </div>
          </div>

          <div className="flex gap-2 overflow-x-auto overflow-y-visible pt-1 pb-4 mb-2 no-scrollbar px-1">
              <button
                  onClick={() => setFilterZone('All')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filterZone === 'All' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-105' : 'bg-white text-stone-700 border border-[color:var(--border)] hover:border-emerald-300'}`}
              >
                  All
              </button>
              {availableZones.map(z => (
                  <button
                      key={z.name}
                      onClick={() => {
                          setFilterZone(z.name);
                          lastZoneSelectionRef.current = Date.now();
                      }}
                      className={`group flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${filterZone === z.name ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-105 pr-2' : 'bg-white text-stone-700 border border-[color:var(--border)] hover:border-emerald-300'}`}
                  >
                      {z.name}
                      {filterZone === z.name && (
                        <span
                          onClick={(e) => {
                             e.stopPropagation();
                             if (Date.now() - lastZoneSelectionRef.current < 300) return;
                             onDeleteZone(z.name);
                             setFilterZone('All');
                          }}
                          className="ml-1 p-0.5 bg-emerald-600 rounded-full hover:bg-red-500 transition-colors cursor-pointer"
                          title={`Delete ${z.name}`}
                        >
                            <X className="w-3 h-3 text-white" />
                        </span>
                      )}
                  </button>
              ))}
          </div>

          <div className="scroll-panels space-y-3 pb-24 pt-4">
              {displayedInventory.length === 0 ? (
                  <div className="text-center py-12 text-stone-500 text-sm bg-white/70 rounded-2xl border border-dashed border-[color:var(--border)] mt-4">
                      No items found in this filter.
                  </div>
              ) : displayedInventory.map(task => {
                  const dependencyTask = task.dependency ? inventory.find(t => t.id === task.dependency) : null;
                  const imageUrl = getTaskImagePublicUrl(task.image_url);
                  return (
                    <div key={task.id} className={`card-panel p-4 rounded-2xl flex justify-between items-center group transition-all card-hover ${task.status === 'completed' ? 'opacity-75 bg-white/70' : 'bg-white/95'}`}>
                        <div className="flex items-start gap-4 flex-1">
                            <div
                                onClick={() => handleToggleStatus(task.id, task.status)}
                                className={`mt-0.5 w-6 h-6 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-emerald-600 border-emerald-600 text-white scale-110' : 'border-[color:var(--border)] hover:border-emerald-400 bg-white'}`}
                            >
                                {task.status === 'completed' && <Check className="w-4 h-4" />}
                            </div>

                            <div className="flex-1">
                                <div className={`font-bold text-sm text-stone-900 mb-1 ${task.status === 'completed' ? 'line-through text-stone-500' : ''}`}>
                                    {task.label}
                                </div>
                                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase items-center">
                                    <span className="text-stone-600 bg-[color:var(--surface-muted)] px-2 py-0.5 rounded border border-[color:var(--border)]">{task.zone}</span>
                                    <PriorityBadge priority={task.priority || 2} />
                                    {task.recurrence > 0 && (
                                        <div
                                            className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-[color:var(--border)]"
                                            title={`Reappears at 7:00 AM every ${task.recurrence} days`}
                                        >
                                            <Repeat className="w-3 h-3" />
                                            <span>{task.recurrence}d</span>
                                        </div>
                                    )}
                                    {dependencyTask && (
                                        <div className="flex items-center gap-1 text-stone-600 bg-[color:var(--surface-muted)] px-2 py-0.5 rounded border border-[color:var(--border)] truncate max-w-[150px]" title={`Depends on: ${dependencyTask.label}`}>
                                            <Link className="w-3 h-3" />
                                            <span className="truncate">{dependencyTask.label}</span>
                                        </div>
                                    )}
                                    {imageUrl && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setLightboxImage(imageUrl); }}
                                            className="relative group/image"
                                            title="View task photo"
                                        >
                                            <img src={imageUrl} alt="Task" className="w-10 h-10 rounded-lg object-cover border border-[color:var(--border)]" />
                                            <span className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                                <Maximize2 className="w-4 h-4 text-white" />
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pl-2">
                            <span className={`text-xs font-mono font-bold px-2 py-1 rounded-md border ${getDurationStyles(task.duration)}`}>
                                {task.duration}m
                            </span>
                            <button onClick={() => handleEdit(task)} className="text-stone-500 hover:text-emerald-700 transition-colors p-2 hover:bg-emerald-50 rounded-full" title="Edit">
                                <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteClick(task.id)} className="text-stone-500 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full" title="Delete">
                                <Trash className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                  );
              })}
          </div>

          <button 
            onClick={() => setIsAdding(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-full shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center z-40"
            title="Add New Task"
          >
            <Plus className="w-7 h-7" />
          </button>

          {isAdding && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-stone-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
                      <div className="flex justify-between items-center border-b border-stone-100 pb-4">
                          <div>
                              <h3 className="text-xl font-serif text-stone-900">{editingId ? "Edit Task" : "New Task"}</h3>
                              <p className="text-xs text-stone-500 mt-1">Fill in the details below</p>
                          </div>
                          <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-stone-800 bg-stone-50 hover:bg-stone-100 rounded-full p-2 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                      </div>
                      
                      <div className="space-y-5">
                          {/* Zone Selection with new "Add Zone" UI that supports Levels */}
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Zone / Area</label>
                              {isAddingZone ? (
                                  <div className="space-y-3 animate-in slide-in-from-left-2 duration-200 p-3 bg-stone-50 rounded-xl border border-stone-200">
                                      <input 
                                          className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-stone-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all font-medium"
                                          placeholder="Area Name (e.g. Master Bath)"
                                          value={newZoneName}
                                          onChange={e => setNewZoneName(e.target.value)}
                                          autoFocus
                                      />
                                      <div className="flex gap-2">
                                          <button 
                                            type="button"
                                            onClick={() => setNewZoneLevel('upstairs')}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${newZoneLevel === 'upstairs' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-stone-200 text-stone-600'}`}
                                          >
                                              Upstairs
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => setNewZoneLevel('downstairs')}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${newZoneLevel === 'downstairs' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-stone-200 text-stone-600'}`}
                                          >
                                              Downstairs
                                          </button>
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                          <button onClick={handleCreateZone} className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">Save Zone</button>
                                          <button onClick={() => setIsAddingZone(false)} className="px-3 text-stone-500 hover:text-stone-700 bg-white rounded-lg border border-stone-200">Cancel</button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex gap-2">
                                      <select 
                                          className="flex-1 bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-medium appearance-none cursor-pointer hover:bg-stone-100 transition-colors"
                                          value={newItem.zone || ""} 
                                          onChange={e => setNewItem({...newItem, zone: e.target.value})}
                                      >
                                          <option value="" disabled>Select Area</option>
                                          {availableZones.map(z => <option key={z.name} value={z.name}>{z.name}</option>)}
                                      </select>
                                      <button onClick={() => setIsAddingZone(true)} className="px-4 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl border border-stone-200 transition-colors" title="Add New Area">
                                          <Plus className="w-5 h-5" />
                                      </button>
                                  </div>
                              )}
                          </div>

                          <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Task Name</label>
                              <input
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all placeholder:text-stone-400 font-medium"
                                  placeholder="e.g. Wipe Kitchen Counters"
                                  value={newItem.label}
                                  onChange={e => setNewItem({...newItem, label: e.target.value})}
                              />
                          </div>

                          <div className="space-y-2">
                              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2">
                                  <ImageIcon className="w-4 h-4" /> Task Photo (optional)
                              </label>
                              <div className="flex items-center gap-3 flex-wrap">
                                  <button
                                      type="button"
                                      onClick={() => imageInputRef.current?.click()}
                                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-200 text-sm font-bold transition-colors"
                                  >
                                      {imagePreview ? 'Replace Image' : 'Upload Image'}
                                  </button>
                                  {imagePreview && (
                                      <div className="relative">
                                          <img src={imagePreview} alt="Task" className="w-16 h-16 object-cover rounded-lg border border-[color:var(--border)]" />
                                          <button
                                              type="button"
                                              onClick={clearSelectedImage}
                                              className="absolute -top-2 -right-2 bg-white border border-stone-200 rounded-full p-1 shadow-sm text-stone-500 hover:text-red-500"
                                              aria-label="Remove image"
                                          >
                                              <X className="w-3 h-3" />
                                          </button>
                                      </div>
                                  )}
                                  <input ref={imageInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                              </div>
                          </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Est. Time</label>
                                  {isMobile ? (
                                      <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                          <select
                                              className="flex-1 bg-transparent text-stone-900 text-sm font-bold outline-none appearance-none cursor-pointer py-1"
                                              value={newItem.duration}
                                              onChange={e => setNewItem({...newItem, duration: parseInt(e.target.value) || 1})}
                                          >
                                              {Array.from({ length: 60 }, (_, i) => i + 1).map((minute) => (
                                                  <option key={minute} value={minute}>{minute} min</option>
                                              ))}
                                          </select>
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl p-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                                          <input
                                              type="number"
                                              className="bg-transparent text-stone-900 text-sm w-full outline-none font-bold"
                                              placeholder="10"
                                              value={newItem.duration}
                                              min={1}
                                              onChange={e => setNewItem({...newItem, duration: parseInt(e.target.value) || 0})}
                                          />
                                          <span className="text-xs text-stone-500 font-bold uppercase">min</span>
                                      </div>
                                  )}
                              </div>

                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Priority</label>
                                  <select 
                                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-medium cursor-pointer"
                                      value={newItem.priority}
                                      onChange={e => setNewItem({...newItem, priority: parseInt(e.target.value) as Priority})}
                                  >
                                      <option value={1}>High (Urgent)</option>
                                      <option value={2}>Medium (Normal)</option>
                                      <option value={3}>Low (Casual)</option>
                                  </select>
                              </div>
                          </div>
                          
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Prerequisite (Dependency)</label>
                                <div className="relative">
                                    <Link className="w-4 h-4 absolute left-3 top-3.5 text-stone-400" />
                                    <select
                                        className="w-full pl-10 bg-stone-50 border border-stone-200 rounded-xl p-3 text-stone-900 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none font-medium cursor-pointer appearance-none"
                                        value={newItem.dependency || ""}
                                        onChange={e => setNewItem({...newItem, dependency: e.target.value || null})}
                                        style={newItem.dependency ? { backgroundColor: getZoneColor(inventory.find(t => t.id === newItem.dependency)?.zone || '', 0.08) } : undefined}
                                    >
                                        <option value="">None (No prerequisites)</option>
                                        {dependencyOptions.map(({ zone, tasks }) => (
                                            <optgroup key={zone} label={zone}>
                                                {tasks.map(task => (
                                                    <option
                                                        key={task.id}
                                                        value={task.id}
                                                        style={{ backgroundColor: getZoneColor(task.zone, 0.12) }}
                                                    >
                                                        {task.label}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                            </div>

                          <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer select-none font-bold">
                                      <input type="checkbox" 
                                          checked={newItem.recurrence > 0} 
                                          onChange={e => setNewItem({...newItem, recurrence: e.target.checked ? 1 : 0})}
                                          className="w-5 h-5 rounded border-stone-300 text-emerald-500 focus:ring-emerald-500"
                                      />
                                      Repeat Task?
                                  </label>
                              </div>
                              
                              {newItem.recurrence > 0 && (
                                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300 pl-7">
                                       <span className="text-xs text-stone-500 font-bold">Every</span>
                                       <input 
                                          type="number" 
                                          min="1"
                                          className="w-16 bg-white border border-stone-200 rounded-lg text-stone-900 text-sm outline-none text-center font-bold py-1 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                                          value={newItem.recurrence}
                                          onChange={e => setNewItem({...newItem, recurrence: parseInt(e.target.value) || 1})}
                                       />
                                       <span className="text-xs text-stone-500 font-bold">days (Reappears at 7 AM)</span>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="pt-2 flex gap-3">
                          <button onClick={() => setIsAdding(false)} className="flex-1 py-3 text-stone-600 font-bold bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
                              Cancel
                          </button>
                          <button onClick={handleSave} className="flex-[2] py-3 text-white font-bold bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-200 rounded-xl transition-all active:scale-95">
                              {editingId ? "Update Task" : "Create Task"}
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {lightboxImage && (
              <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
                  <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
                      <button className="absolute top-3 right-3 bg-white/90 rounded-full p-2 shadow-md border border-stone-200 hover:bg-stone-100" onClick={() => setLightboxImage(null)}>
                          <X className="w-5 h-5 text-stone-600" />
                      </button>
                      <img src={lightboxImage} alt="Task" className="w-full h-full max-h-[80vh] object-contain bg-black" />
                  </div>
              </div>
          )}

          {deletingId && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 text-center border border-stone-100">
                      <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                          <AlertTriangle className="w-8 h-8 text-red-500" />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-stone-900">Delete this task?</h3>
                          <p className="text-stone-500 mt-2 text-sm leading-relaxed">
                              Are you sure you want to remove this task? This action cannot be undone.
                          </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                          <button onClick={() => setDeletingId(null)} className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold transition-colors">Cancel</button>
                          <button onClick={confirmDelete} className="py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-100 transition-all active:scale-95">Delete</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};
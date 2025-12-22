import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Home, List, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Room, Task, Frequency } from '../types';

interface DashboardViewProps {
  user: any;
  onRoomSelect: (room: Room, tasks: Task[]) => void;
  inventoryCount: number;
}

export function DashboardView({ user, onRoomSelect, inventoryCount }: DashboardViewProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  
  // Form states
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomLevel, setNewRoomLevel] = useState<number>(1); // Changed to number
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskRoomId, setNewTaskRoomId] = useState('');
  const [newTaskFrequency, setNewTaskFrequency] = useState<Frequency>('weekly');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('user_id', user.id)
        .order('level', { ascending: true }) // Order by level
        .order('name', { ascending: true });

      if (roomsError) throw roomsError;
      setRooms(roomsData || []);

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id); // In a real app, you'd likely join with last session date here

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([{
          name: newRoomName,
          level: newRoomLevel,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      setRooms([...rooms, data]);
      setNewRoomName('');
      setNewRoomLevel(1);
      setShowAddRoom(false);
    } catch (error) {
      console.error('Error adding room:', error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskRoomId) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: newTaskTitle,
          room_id: newTaskRoomId,
          user_id: user.id,
          frequency: newTaskFrequency,
          is_forced: false
        }])
        .select()
        .single();

      if (error) throw error;
      setTasks([...tasks, data]);
      setNewTaskTitle('');
      setShowAddTask(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    // Safety Improvement: Explicit warning about data loss
    if (!confirm('WARNING: Deleting this room will delete ALL historic session data associated with it. This cannot be undone.\n\nAre you sure you want to proceed?')) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
      setRooms(rooms.filter(r => r.id !== roomId));
      setTasks(tasks.filter(t => t.room_id !== roomId));
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  // Group rooms by level for better UI organization
  const groupedRooms = rooms.reduce((acc, room) => {
    const level = room.level;
    if (!acc[level]) acc[level] = [];
    acc[level].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading your space...</div>;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-4 pb-24">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Home</h1>
        <p className="text-gray-500">
            {tasks.length} tasks across {rooms.length} rooms
            {inventoryCount > 0 && ` • ${inventoryCount} inventory items`}
        </p>
      </header>

      <div className="space-y-6">
        {Object.entries(groupedRooms).map(([level, levelRooms]) => (
           <div key={level}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 ml-1">
                 {Number(level) === 0 ? 'Ground Floor' : `Level ${level}`}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {levelRooms.map(room => {
                  const roomTasks = tasks.filter(t => t.room_id === room.id);
                  return (
                    <div 
                      key={room.id}
                      onClick={() => onRoomSelect(room, roomTasks)}
                      className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                          <Home className="w-5 h-5" />
                        </div>
                        <button 
                          onClick={(e) => handleDeleteRoom(e, room.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">{room.name}</h3>
                      <p className="text-sm text-gray-500">{roomTasks.length} tasks configured</p>
                    </div>
                  );
                })}
              </div>
           </div>
        ))}
        
        {rooms.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
                <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No rooms yet</h3>
                <p className="text-gray-500 mb-4">Add your first room to get started</p>
                <button 
                    onClick={() => setShowAddRoom(true)}
                    className="text-blue-600 font-semibold"
                >
                    + Add Room
                </button>
            </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <button
          onClick={() => setShowAddTask(true)}
          className="w-14 h-14 bg-white text-blue-600 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100"
          title="Add Task"
        >
          <List className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowAddRoom(true)}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
          title="Add Room"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Add New Room</h2>
            <form onSubmit={handleAddRoom}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    placeholder="e.g. Master Bedroom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor / Level</label>
                  {/* Changed to number input for data normalization */}
                  <input
                    type="number"
                    required
                    value={newRoomLevel}
                    onChange={e => setNewRoomLevel(parseInt(e.target.value))}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 = Ground, 1 = First Floor, etc.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddRoom(false)}
                  className="flex-1 text-gray-600 bg-gray-100 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Add New Task</h2>
            <form onSubmit={handleAddTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    placeholder="e.g. Vacuum Floor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                  <select
                    required
                    value={newTaskRoomId}
                    onChange={e => setNewTaskRoomId(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  >
                    <option value="">Select a room...</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    required
                    value={newTaskFrequency}
                    onChange={e => setNewTaskFrequency(e.target.value as Frequency)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="flex-1 text-gray-600 bg-gray-100 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
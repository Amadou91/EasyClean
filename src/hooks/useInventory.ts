import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { User } from '@supabase/supabase-js';

export function useInventory() {
    const [inventory, setInventory] = useState<Task[]>([]);
    const [zones, setZones] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // 1. Auth Listener
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchData();
            else setLoading(false);
        });

        // Listen for login/logout
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchData();
            } else {
                setInventory([]); // Clear data on logout
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Fetch Data (Real Database)
    const fetchData = async () => {
        setLoading(true);
        
        try {
            // Fetch Zones
            const { data: zoneData } = await supabase.from('zones').select('name');
            if (zoneData) setZones(zoneData.map((z: { name: string }) => z.name));

            // Fetch Tasks
            const { data: taskData, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) console.error('Error loading tasks:', error);
            
            // Recurrence Logic Check
            if (taskData) {
                const now = new Date();
                const updates: Promise<unknown>[] = [];
                const finalTasks = taskData.map((t: Task & { completed_at?: string }) => {
                    if (t.status === 'completed' && t.recurrence > 0 && t.completed_at) {
                        const completedDate = new Date(t.completed_at);
                        const diffTime = Math.abs(now.getTime() - completedDate.getTime());
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                        // Only reset once the full recurrence window has elapsed
                        if (diffDays >= t.recurrence) {
                            updates.push(resetTask(t.id));
                            return { ...t, status: 'pending', completed_at: null, completed_by: null };
                        }
                    }
                    return t;
                });
                
                // Fire off background updates if needed, but render immediately
                if (updates.length > 0) await Promise.all(updates);
                setInventory(finalTasks as Task[]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to reset a task in DB
    const resetTask = async (id: string) => {
        return supabase.from('tasks').update({ 
            status: 'pending', 
            completed_at: null, 
            completed_by: null 
        }).eq('id', id);
    };

    // 3. Actions
    const addTask = async (task: Task) => {
        if (!user) return;
        
        // Optimistic Update
        const tempId = Math.random().toString();
        const newTask = { ...task, id: tempId, user_id: user.id, created_at: new Date().toISOString() };
        setInventory(prev => [newTask, ...prev]);

        const { data, error } = await supabase.from('tasks').insert([{
            zone: task.zone,
            label: task.label,
            duration: task.duration,
            priority: task.priority,
            recurrence: task.recurrence,
            status: 'pending',
            dependency: task.dependency, // Added dependency support
            user_id: user.id // Track who created it
        }]).select().single();

        if (!error && data) {
            // Replace temp ID with real ID
            setInventory(prev => prev.map(t => t.id === tempId ? data as Task : t));
        } else {
            // Revert if error
            setInventory(prev => prev.filter(t => t.id !== tempId));
            alert("Failed to add task");
        }
    };

    const updateTask = async (id: string, updates: Partial<Task>) => {
        if (!user) return;

        setInventory(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        
        // If marking complete, add timestamp and user
        const dbUpdates: Partial<Task> & { completed_at?: string | null; completed_by?: string | null } = { ...updates };
        if (updates.status === 'completed') {
            dbUpdates.completed_at = new Date().toISOString();
            dbUpdates.completed_by = user.id; // Track who did it
        }

        await supabase.from('tasks').update(dbUpdates).eq('id', id);
    };

    const deleteTask = async (id: string) => {
        setInventory(prev => prev.filter(t => t.id !== id));
        await supabase.from('tasks').delete().eq('id', id);
    };

    const addZone = async (name: string) => {
        if (!user) return;
        setZones(prev => [...prev, name]);
        await supabase.from('zones').insert([{ name }]);
    };

    const deleteZone = async (name: string) => {
        if (window.confirm(`Delete "${name}" zone? Tasks will remain but the filter will be removed.`)) {
            setZones(prev => prev.filter(z => z !== name));
            await supabase.from('zones').delete().eq('name', name);
        }
    };

    const exportData = () => {
        const data = { inventory, zones, version: "3.2" };
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(data))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "easy-clean-backup.json";
        link.click();
    };

    const importData = (file: File) => {
        const reader = new FileReader();
        reader.onload = async e => {
            try {
                if (!user) {
                    alert("Please log in to import data.");
                    return;
                }

                const parsed = JSON.parse(e.target?.result as string);
                
                // 1. Sync Zones
                if (parsed.zones && Array.isArray(parsed.zones)) {
                    const newZones = parsed.zones.filter((z: string) => !zones.includes(z));
                    setZones(prev => [...prev, ...newZones]);
                    
                    if (newZones.length > 0) {
                        const zoneInserts = newZones.map((name: string) => ({ name }));
                        await supabase.from('zones').insert(zoneInserts);
                    }
                }

                // 2. Sync Inventory (with UUID Conversion & Dependency Remapping)
                if (parsed.inventory && Array.isArray(parsed.inventory)) {
                    const idMap = new Map<string, string>(); // Old ID -> New UUID
                    
                    // First pass: Generate new UUIDs for all tasks
                    const tasksWithNewIds = parsed.inventory.map((t: Task) => {
                        const newId = crypto.randomUUID();
                        idMap.set(t.id, newId);
                        return { ...t, oldId: t.id, id: newId };
                    });

                    // Second pass: Remap dependencies and Sanitize fields
                    const normalizedTasks = tasksWithNewIds.map((t: Task) => ({
                        id: t.id,
                        user_id: user.id,
                        zone: t.zone,
                        label: t.label,
                        duration: t.duration || 10,
                        priority: t.priority || 2,
                        status: 'pending', // Reset status on import? Usually safer. Or keep t.status if desired.
                        recurrence: t.recurrence || 0,
                        // Remap dependency if it exists in our map
                        dependency: t.dependency && idMap.has(t.dependency) ? idMap.get(t.dependency) : null,
                        completed_at: null, // Reset completion history on import
                        created_at: new Date().toISOString()
                    }));

                    // Update local state immediately
                    setInventory(prev => [...prev, ...normalizedTasks]);
                    
                    // Batch insert into Supabase
                    const { error } = await supabase.from('tasks').insert(normalizedTasks);
                    
                    if (error) {
                        console.error("Import sync error:", error);
                        alert("Import failed during database sync. Check console.");
                    } else {
                        alert("Data imported and synced successfully!");
                        // Refresh to get server timestamps/canonical state
                        fetchData();
                    }
                }

            } catch (err) {
                console.error(err);
                alert("Invalid file or import failed.");
            }
        };
        reader.readAsText(file);
    };

    return { inventory, setInventory, zones, user, loading, addTask, updateTask, deleteTask, addZone, deleteZone, exportData, importData };
}
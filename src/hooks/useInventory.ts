import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Task, Zone, Level } from '../types';
import { User } from '@supabase/supabase-js';
import { TASK_IMAGE_BUCKET } from '../lib/storage';

type UpdateOptions = {
    imageFile?: File | null;
    removeImage?: boolean;
};

// Define explicit type for Zone data from DB
type DBZone = {
  name: string;
  level: string | null;
};

export function useInventory() {
    const [inventory, setInventory] = useState<Task[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // 1. Auth Listener
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchData();
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchData();
            } else {
                setInventory([]);
                setZones([]);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Fetch Data
    const fetchData = async () => {
        setLoading(true);
        
        try {
            // Fetch Zones with Level
            const { data: zoneData } = await supabase
                .from('zones')
                .select('name, level');
            
            if (zoneData) {
                // Map to Zone interface, defaulting to downstairs if missing in DB return
                setZones(zoneData.map((z: DBZone) => ({ 
                    name: z.name, 
                    level: (z.level === 'upstairs' || z.level === 'downstairs') ? (z.level as Level) : 'downstairs' 
                })));
            }

            // Fetch Tasks
            const { data: taskData, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) console.error('Error loading tasks:', error);
            
            // Recurrence Logic: Reset at 7:00 AM of the target day
            if (taskData) {
                const now = new Date();
                const updates: Promise<unknown>[] = [];
                
                const finalTasks = taskData.map((t: Task & { completed_at?: string }) => {
                    if (t.status === 'completed' && t.recurrence > 0 && t.completed_at) {
                        const completedDate = new Date(t.completed_at);
                        
                        // Calculate the "Target Reset Time"
                        // Target = Completed Date + Recurrence Days, set to 07:00:00 AM
                        const targetResetDate = new Date(completedDate);
                        targetResetDate.setDate(targetResetDate.getDate() + t.recurrence);
                        targetResetDate.setHours(7, 0, 0, 0);

                        // If completed AFTER 7am today, and recurrence is 1 day, it resets tomorrow 7am.
                        // If completed BEFORE 7am today (e.g. 2am), and recurrence is 1 day, 
                        // target is tomorrow 7am (because we add days to the completed date).
                        
                        // Check if we have passed the target time
                        if (now >= targetResetDate) {
                            updates.push(resetTask(t.id));
                            return { ...t, status: 'pending', completed_at: null, completed_by: null };
                        }
                    }
                    return t;
                });
                
                if (updates.length > 0) await Promise.all(updates);
                setInventory(finalTasks as Task[]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const uploadTaskImage = async (taskId: string, file: File, previousPath?: string | null) => {
        const extension = file.name.split('.').pop();
        const path = `${user?.id || 'public'}/${taskId}.${extension || 'jpg'}`;

        if (previousPath && previousPath !== path) {
            await supabase.storage.from(TASK_IMAGE_BUCKET).remove([previousPath]);
        }

        const { data, error } = await supabase.storage.from(TASK_IMAGE_BUCKET).upload(path, file, { upsert: true });
        return { path: data?.path || path, error };
    };

    const removeTaskImage = async (path?: string | null) => {
        if (!path) return;
        await supabase.storage.from(TASK_IMAGE_BUCKET).remove([path]);
    };

    const resetTask = async (id: string) => {
        return supabase.from('tasks').update({
            status: 'pending',
            completed_at: null,
            completed_by: null
        }).eq('id', id);
    };

    // 3. Actions
    const addTask = async (task: Task, imageFile?: File | null) => {
        if (!user) return;

        const taskId = task.id || crypto.randomUUID();
        // Optimistic update
        const optimisticTask: Task = {
            ...task,
            id: taskId,
            user_id: user.id,
            created_at: new Date().toISOString(),
            image_url: null
        };
        setInventory(prev => [optimisticTask, ...prev]);

        const { data, error } = await supabase.from('tasks').insert([{
            id: taskId,
            zone: task.zone,
            label: task.label,
            duration: task.duration,
            priority: task.priority,
            recurrence: task.recurrence,
            status: 'pending',
            dependency: task.dependency,
            user_id: user.id,
            image_url: null
        }]).select().single();

        if (!error && data) {
            let imagePath = data.image_url;

            if (imageFile) {
                const uploadResult = await uploadTaskImage(taskId, imageFile);
                if (!uploadResult.error) {
                    imagePath = uploadResult.path;
                    await supabase.from('tasks').update({ image_url: imagePath }).eq('id', taskId);
                }
            }
            setInventory(prev => prev.map(t => t.id === taskId ? { ...(data as Task), image_url: imagePath } : t));
        } else {
            setInventory(prev => prev.filter(t => t.id !== taskId));
            alert("Failed to add task");
        }
    };

    const updateTask = async (id: string, updates: Partial<Task>, options: UpdateOptions = {}) => {
        if (!user) return;

        const existing = inventory.find(t => t.id === id);
        const { imageFile, removeImage } = options;

        let nextImage = existing?.image_url ?? null;
        if (removeImage) nextImage = null;

        // Optimistic update
        setInventory(prev => prev.map(t => t.id === id ? { ...t, ...updates, image_url: nextImage } : t));

        const dbUpdates: Partial<Task> & { completed_at?: string | null; completed_by?: string | null } = { ...updates };
        if (updates.status === 'completed') {
            dbUpdates.completed_at = new Date().toISOString();
            dbUpdates.completed_by = user.id;
        }

        if (removeImage && existing?.image_url) {
            await removeTaskImage(existing.image_url);
            dbUpdates.image_url = null;
        }

        if (imageFile) {
            const uploadResult = await uploadTaskImage(id, imageFile, existing?.image_url);
            if (!uploadResult.error) {
                nextImage = uploadResult.path;
                dbUpdates.image_url = nextImage;
            }
        }

        await supabase.from('tasks').update(dbUpdates).eq('id', id);
        // Sync final state (in case DB trigger changed something)
        setInventory(prev => prev.map(t => t.id === id ? { ...t, ...updates, image_url: nextImage } : t));
    };

    const deleteTask = async (id: string) => {
        const taskToDelete = inventory.find(t => t.id === id);
        if (taskToDelete?.image_url) {
            await removeTaskImage(taskToDelete.image_url);
        }

        setInventory(prev => prev.filter(t => t.id !== id));
        await supabase.from('tasks').delete().eq('id', id);
    };

    const addZone = async (name: string, level: Level) => {
        if (!user) return;
        
        // Optimistic
        setZones(prev => [...prev, { name, level }]);
        
        const { error } = await supabase.from('zones').insert([{ name, level }]);
        if (error) {
            console.error("Failed to add zone:", error);
            setZones(prev => prev.filter(z => z.name !== name)); // Revert
            alert("Could not add zone.");
        }
    };

    const deleteZone = async (name: string) => {
        if (window.confirm(`Delete "${name}"? Tasks will remain but the filter will be removed.`)) {
            setZones(prev => prev.filter(z => z.name !== name));
            await supabase.from('zones').delete().eq('name', name);
        }
    };

    // Existing export/import logic kept largely the same, adapted if necessary for types
    const exportData = () => {
        const data = { inventory, zones, version: "3.3" }; // Bumped version
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
                    // Handle legacy string[] zones if importing old backup
                    const importedZones: Zone[] = parsed.zones.map((z: string | { name: string; level?: Level }) => {
                        if (typeof z === 'string') return { name: z, level: 'downstairs' };
                        return { name: z.name, level: z.level || 'downstairs' } as Zone;
                    });

                    const newZones = importedZones.filter(iz => !zones.some(z => z.name === iz.name));
                    setZones(prev => [...prev, ...newZones]);
                    
                    if (newZones.length > 0) {
                        const zoneInserts = newZones.map(z => ({ name: z.name, level: z.level }));
                        await supabase.from('zones').insert(zoneInserts);
                    }
                }

                // 2. Sync Inventory (Same logic as before)
                if (parsed.inventory && Array.isArray(parsed.inventory)) {
                    const idMap = new Map<string, string>();
                    const tasksWithNewIds = parsed.inventory.map((t: Task) => {
                        const newId = crypto.randomUUID();
                        idMap.set(t.id, newId);
                        return { ...t, oldId: t.id, id: newId };
                    });

                    const normalizedTasks = tasksWithNewIds.map((t: Task) => ({
                        id: t.id,
                        user_id: user.id,
                        zone: t.zone,
                        label: t.label,
                        duration: t.duration || 10,
                        priority: t.priority || 2,
                        status: 'pending',
                        recurrence: t.recurrence || 0,
                        dependency: t.dependency && idMap.has(t.dependency) ? idMap.get(t.dependency) : null,
                        completed_at: null, 
                        created_at: new Date().toISOString()
                    }));

                    setInventory(prev => [...prev, ...normalizedTasks]);
                    const { error } = await supabase.from('tasks').insert(normalizedTasks);
                    
                    if (error) {
                        console.error("Import error:", error);
                        alert("Import partially failed. Check console.");
                    } else {
                        alert("Data imported successfully!");
                        fetchData();
                    }
                }

            } catch (err) {
                console.error(err);
                alert("Invalid file.");
            }
        };
        reader.readAsText(file);
    };

    return { inventory, setInventory, zones, user, loading, addTask, updateTask, deleteTask, addZone, deleteZone, exportData, importData };
}
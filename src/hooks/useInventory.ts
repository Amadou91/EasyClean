import { useState, useEffect } from 'react';
import { Task } from '../types';

const INITIAL_INVENTORY: Task[] = [
    { id: 'k1', zone: 'Kitchen', label: 'Unload Dishwasher', duration: 5, priority: 2, status: 'pending', dependency: null, recurrence: 1, lastCompleted: null },
    { id: 'k2', zone: 'Kitchen', label: 'Load Dishwasher', duration: 10, priority: 1, status: 'pending', dependency: 'k1', recurrence: 1, lastCompleted: null },
    { id: 'k3', zone: 'Kitchen', label: 'Clear Countertops', duration: 15, priority: 2, status: 'pending', dependency: null, recurrence: 0, lastCompleted: null },
    { id: 'lr1', zone: 'Living Room', label: 'Vacuum Carpet', duration: 15, priority: 3, status: 'pending', dependency: null, recurrence: 7, lastCompleted: null },
    { id: 'b1', zone: 'Bathroom', label: 'Clean Toilet', duration: 10, priority: 1, status: 'pending', dependency: null, recurrence: 7, lastCompleted: null },
];

export function useInventory() {
    const [inventory, setInventory] = useState<Task[]>(INITIAL_INVENTORY);
    const [zones, setZones] = useState<string[]>(['Kitchen', 'Living Room', 'Bathroom', 'Bedroom']);

    useEffect(() => {
        try {
            const savedData = localStorage.getItem('easyCleanData');
            const savedZones = localStorage.getItem('easyCleanZones');
            if (savedData) {
                let parsed = JSON.parse(savedData);
                if(Array.isArray(parsed)) {
                    const now = Date.now();
                    parsed = parsed.map((t: Task) => {
                        if (t.status === 'completed' && t.recurrence > 0 && t.lastCompleted) {
                            const diff = now - t.lastCompleted;
                            const daysPassed = diff / (1000 * 60 * 60 * 24);
                            if (daysPassed >= t.recurrence) return { ...t, status: 'pending' as const };
                        }
                        return t;
                    });
                    setInventory(parsed);
                }
            }
            if (savedZones) {
                const parsed = JSON.parse(savedZones);
                if(Array.isArray(parsed)) setZones(parsed);
            }
        } catch (e) { console.warn("Storage access issue"); }
    }, []);

    useEffect(() => { localStorage.setItem('easyCleanData', JSON.stringify(inventory)); }, [inventory]);
    useEffect(() => { localStorage.setItem('easyCleanZones', JSON.stringify(zones)); }, [zones]);

    const addTask = (task: Task) => setInventory(prev => [...prev, task]);
    const updateTask = (id: string, updates: Partial<Task>) => setInventory(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const deleteTask = (id: string) => setInventory(prev => prev.filter(t => t.id !== id));
    const addZone = (name: string) => setZones(prev => [...prev, name]);

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
        reader.onload = e => {
            try {
                const parsed = JSON.parse(e.target?.result as string);
                if(parsed.inventory) setInventory(parsed.inventory);
                if(parsed.zones) setZones(parsed.zones);
                alert("Restored successfully!");
            } catch { alert("Invalid file."); }
        };
        reader.readAsText(file);
    };

    return { inventory, setInventory, zones, addTask, updateTask, deleteTask, addZone, exportData, importData };
}
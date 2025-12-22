import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Circle, ArrowLeft, Filter, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Task, Room } from '../types';
import { isTaskDue } from '../lib/logic';

interface ExecutionViewProps {
  room: Room;
  tasks: Task[];
  onBack: () => void;
  onComplete: () => void;
}

const LOCAL_STORAGE_KEY = 'easyclean_active_session';

export function ExecutionView({ room, tasks, onBack, onComplete }: ExecutionViewProps) {
  const [activeSession, setActiveSession] = useState<{
    roomId: string;
    startTime: string;
    completedTasks: string[];
    skippedTasks: string[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);

  // 1. Resilience: Load state from LocalStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // Only restore if it matches the current room to avoid cross-room pollution
        if (parsed.roomId === room.id) {
          setActiveSession(parsed);
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
  }, [room.id]);

  // 2. Resilience: Save state to LocalStorage whenever it changes
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(activeSession));
    } else {
      // If session is explicitly null (cancelled/finished), clear it
      // Note: We handle the explicit clear in handleFinish/Cancel
    }
  }, [activeSession]);

  const startSession = () => {
    setActiveSession({
      roomId: room.id,
      startTime: new Date().toISOString(),
      completedTasks: [],
      skippedTasks: []
    });
  };

  const toggleTask = (taskId: string) => {
    if (!activeSession) return;
    
    setActiveSession(prev => {
      if (!prev) return null;
      const isCompleted = prev.completedTasks.includes(taskId);
      return {
        ...prev,
        completedTasks: isCompleted
          ? prev.completedTasks.filter(id => id !== taskId)
          : [...prev.completedTasks, taskId]
      };
    });
  };

  const handleFinishSession = async (action: 'complete_selected' | 'complete_and_skip_rest') => {
    if (!activeSession) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // 1. Create Session Record
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          room_id: room.id,
          user_id: user.id,
          started_at: activeSession.startTime,
          completed_at: new Date().toISOString(),
          notes: '' 
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 2. Prepare Session Tasks (Relational Data Fix)
      const tasksToInsert = [];

      // Add Completed
      activeSession.completedTasks.forEach(taskId => {
        tasksToInsert.push({
          session_id: sessionData.id,
          task_id: taskId,
          status: 'completed',
          completed_at: new Date().toISOString()
        });
      });

      // Add Skipped (if user chose to mark remaining as skipped)
      if (action === 'complete_and_skip_rest') {
        const remainingTasks = tasks.filter(t => !activeSession.completedTasks.includes(t.id));
        remainingTasks.forEach(t => {
          tasksToInsert.push({
            session_id: sessionData.id,
            task_id: t.id,
            status: 'skipped',
            completed_at: new Date().toISOString()
          });
        });
      }

      if (tasksToInsert.length > 0) {
        const { error: taskError } = await supabase
          .from('session_tasks')
          .insert(tasksToInsert);
        
        if (taskError) throw taskError;
      }

      // Cleanup
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setActiveSession(null);
      onComplete();

    } catch (error) {
      console.error('Error completing session:', error);
      alert('Failed to save session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter Tasks based on Logic
  const visibleTasks = showAllTasks 
    ? tasks 
    : tasks.filter(t => isTaskDue(t));

  const progress = activeSession 
    ? Math.round((activeSession.completedTasks.length / visibleTasks.length) * 100) 
    : 0;

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Play className="w-10 h-10 text-blue-600 ml-1" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Clean?</h2>
        <p className="text-gray-600 mb-8 max-w-sm">
          Start a session for <span className="font-semibold text-gray-900">{room.name}</span>. 
          There are {tasks.filter(t => isTaskDue(t)).length} tasks due.
        </p>
        <button
          onClick={startSession}
          className="w-full max-w-xs bg-blue-600 text-white py-4 px-8 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Start Session
        </button>
        <button
          onClick={onBack}
          className="mt-4 text-gray-500 hover:text-gray-700 font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm z-10">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => {
              if (confirm('Cancel session? Progress will be lost.')) {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                setActiveSession(null);
                onBack();
              }
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h2 className="font-bold text-lg text-gray-900">{room.name}</h2>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Session Active
            </span>
          </div>
          <button 
            onClick={() => setShowAllTasks(!showAllTasks)}
            className={`p-2 rounded-full ${showAllTasks ? 'bg-blue-100 text-blue-600' : 'text-gray-400 bg-gray-100'}`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{activeSession.completedTasks.length} done</span>
          <span>{visibleTasks.length - activeSession.completedTasks.length} remaining</span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="space-y-3">
          {visibleTasks.length === 0 && !showAllTasks && (
            <div className="text-center py-10 text-gray-500">
              <p>No tasks due right now!</p>
              <button onClick={() => setShowAllTasks(true)} className="text-blue-500 text-sm mt-2 font-medium">
                Show all tasks anyway
              </button>
            </div>
          )}
          
          {visibleTasks.map((task) => {
            const isCompleted = activeSession.completedTasks.includes(task.id);
            return (
              <div 
                key={task.id}
                onClick={() => toggleTask(task.id)} // Touch Target Improvement: Whole row clickable
                className={`
                  flex items-center p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.99]
                  ${isCompleted 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'bg-white border-gray-100 shadow-sm hover:border-gray-200'}
                `}
              >
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors
                  ${isCompleted ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                `}>
                  {isCompleted && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </h3>
                  {task.frequency && (
                    <span className="text-xs text-gray-400 capitalize bg-gray-50 px-1.5 py-0.5 rounded mr-2">
                      {task.frequency}
                    </span>
                  )}
                  {task.is_forced && !isCompleted && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                      Must Do
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Mobile Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-20 pb-safe">
        {activeSession.completedTasks.length < visibleTasks.length ? (
            <div className="flex gap-2">
                <button
                    onClick={() => handleFinishSession('complete_selected')}
                    disabled={loading}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    Finish (Leave rest)
                </button>
                <button
                    onClick={() => handleFinishSession('complete_and_skip_rest')}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    Mark Rest Skipped
                </button>
            </div>
        ) : (
             <button
                onClick={() => handleFinishSession('complete_selected')}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                <CheckCircle className="w-5 h-5" />
                Finish Session
            </button>
        )}
      </div>
    </div>
  );
}
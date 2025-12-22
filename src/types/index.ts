export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Room {
  id: string;
  name: string;
  level: number; // Changed from string to number per audit
  user_id: string;
  created_at: string;
}

export interface Task {
  id: string;
  room_id: string;
  title: string;
  description?: string;
  frequency: Frequency;
  is_forced: boolean;
  created_at: string;
  image_url?: string;
  // Added for logic calculation. 
  // NOTE: You will need to update your Supabase query to join the last session date 
  // or use a Postgres function to attach this field to the Task object.
  last_cleaned_at?: string | null; 
}

export interface Session {
  id: string;
  room_id: string;
  user_id: string;
  started_at: string;
  completed_at?: string;
  notes?: string;
}

// New Interface for the relational table
export interface SessionTask {
  id: string;
  session_id: string;
  task_id: string;
  status: 'completed' | 'skipped';
  completed_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  user_id: string;
  created_at: string;
}
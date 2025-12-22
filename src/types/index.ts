export type Priority = 1 | 2 | 3;
export type Status = 'pending' | 'completed' | 'blocked';
export type Level = 'upstairs' | 'downstairs';

export interface Zone {
  name: string;
  level: Level;
}

export interface Task {
  id: string;
  user_id?: string;
  created_at?: string;
  completed_at?: string | null;
  completed_by?: string | null;
  zone: string; // References Zone.name
  label: string;
  duration: number; // in minutes
  priority: Priority;
  status: Status;
  dependency: string | null;
  recurrence: number; // days
  lastCompleted: number | null; // timestamp (legacy, prefer completed_at)
  image_url?: string | null;
}
export type Priority = 1 | 2 | 3;
export type Status = 'pending' | 'completed' | 'blocked';
export type Level = 'Upper Level' | 'Lower Level';

export interface Room {
  name: string;
  level: Level;
}

export interface Task {
  id: string;
  zone: string;
  label: string;
  duration: number; // in minutes
  priority: Priority;
  status: Status;
  dependency: string | null;
  recurrence: number; // days
  lastCompleted: number | null; // timestamp
}
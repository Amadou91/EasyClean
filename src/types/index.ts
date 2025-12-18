export type Priority = 1 | 2 | 3;
export type Status = 'pending' | 'completed' | 'blocked';

export interface Task {
  id: string;
  zone: string;
  label: string;
  duration: number;
  priority: Priority;
  status: Status;
  dependency: string | null;
  recurrence: number;
  lastCompleted: number | null;
}
import { Task } from '../types';

/**
 * Determine whether a task is due based on its recurrence interval and completion timestamp.
 * A recurrence of 0 or negative values is treated as always due.
 */
export function isTaskDue(task: Task, now: Date = new Date()): boolean {
  if (task.recurrence <= 0) return true;
  if (!task.completed_at) return true;

  const completedDate = new Date(task.completed_at);
  if (Number.isNaN(completedDate.getTime())) return true;

  const nextReset = new Date(completedDate);
  nextReset.setDate(nextReset.getDate() + task.recurrence);
  nextReset.setHours(7, 0, 0, 0);

  return now >= nextReset;
}

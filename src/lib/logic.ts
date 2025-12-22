import { Task, Frequency } from '../types';

/**
 * Determines if a task is due based on its frequency and last cleaned date.
 * Returns true if it has never been cleaned.
 */
export function isTaskDue(task: Task): boolean {
  if (task.is_forced) return true;
  if (!task.last_cleaned_at) return true;

  const lastCleaned = new Date(task.last_cleaned_at);
  const now = new Date();
  
  // Reset time portions to compare dates only (optional, depends on strictness)
  const lastCleanedDate = new Date(lastCleaned.getFullYear(), lastCleaned.getMonth(), lastCleaned.getDate());
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = Math.abs(todayDate.getTime() - lastCleanedDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

  switch (task.frequency) {
    case 'daily':
      return diffDays >= 1;
    case 'weekly':
      return diffDays >= 7;
    case 'biweekly':
      return diffDays >= 14;
    case 'monthly':
      return diffDays >= 30;
    case 'quarterly':
      return diffDays >= 90;
    case 'yearly':
      return diffDays >= 365;
    default:
      return true;
  }
}

/**
 * Sorts tasks: Overdue/Forced first, then by frequency
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDue = isTaskDue(a);
    const bDue = isTaskDue(b);

    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    
    // If both due or both not due, sort by creation or title
    return a.title.localeCompare(b.title);
  });
}
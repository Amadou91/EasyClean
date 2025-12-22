import { supabase } from './supabase';

export const TASK_IMAGE_BUCKET = 'task-images';

export function getTaskImagePublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // If the path is already a full URL, return it directly
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Otherwise, get the public URL from Supabase
  const { data } = supabase.storage.from(TASK_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
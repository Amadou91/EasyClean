import { supabase } from './supabase';

export const TASK_IMAGE_BUCKET = 'task-images';

export const getTaskImagePublicUrl = (path?: string | null) => {
  if (!path) return null;
  const { data } = supabase.storage.from(TASK_IMAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
};

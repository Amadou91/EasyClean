-- Adds an optional image reference for each task without affecting existing rows
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS image_url text;

-- Make start_time and end_time nullable in availability table
ALTER TABLE public.availability 
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL;
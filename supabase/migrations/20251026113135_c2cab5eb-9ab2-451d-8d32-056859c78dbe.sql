-- Add new columns to availability table for date range, shift type, and weekdays
ALTER TABLE public.availability 
ADD COLUMN end_date date,
ADD COLUMN shift_type text,
ADD COLUMN weekdays text;

-- Update existing records to have end_date same as date
UPDATE public.availability SET end_date = date WHERE end_date IS NULL;
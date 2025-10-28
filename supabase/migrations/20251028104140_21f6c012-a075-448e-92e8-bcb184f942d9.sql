-- Add new fields to availability table
ALTER TABLE public.availability
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN mobile_deployable text;
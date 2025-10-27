-- Add first_name and last_name columns to availability table
ALTER TABLE public.availability 
ADD COLUMN first_name TEXT NOT NULL DEFAULT '',
ADD COLUMN last_name TEXT NOT NULL DEFAULT '';

-- Update the constraint to ensure names are not empty after the default is applied
-- We'll handle validation in the application layer instead of CHECK constraints
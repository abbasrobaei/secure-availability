-- Remove name and phone fields from availability table
-- These belong in profiles table only
ALTER TABLE public.availability
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS phone_number;
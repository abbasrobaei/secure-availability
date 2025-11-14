-- Add optional guard_id_number field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN guard_id_number TEXT;
-- Add optional e_pin_number field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN e_pin_number TEXT;

-- Update handle_new_user function to include e_pin_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone_number, guard_id_number, e_pin_number)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'guard_id_number',
    NEW.raw_user_meta_data->>'e_pin_number'
  );
  RETURN NEW;
END;
$function$;
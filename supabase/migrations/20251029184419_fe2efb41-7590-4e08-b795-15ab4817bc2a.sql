-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create user_roles table with proper RLS
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Only admins can view and manage roles
CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Remove insecure role column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Drop existing public policies on availability
DROP POLICY IF EXISTS "Anyone can view availability" ON public.availability;
DROP POLICY IF EXISTS "Anyone can insert availability" ON public.availability;
DROP POLICY IF EXISTS "Anyone can update availability" ON public.availability;

-- Allow public INSERT only (employees can submit availability)
CREATE POLICY "Public can insert availability"
ON public.availability
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view all availability data
CREATE POLICY "Admins can view all availability"
ON public.availability
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update availability
CREATE POLICY "Admins can update availability"
ON public.availability
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete availability
CREATE POLICY "Admins can delete availability"
ON public.availability
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
-- Fix admin role assignment issue: Allow inserting employee role for authenticated users
-- and allow creating the first admin if no admins exist yet

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

-- Allow admins to manage all roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow creating the first admin when no admins exist
CREATE POLICY "Allow first admin creation"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'admin' AND
  NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  )
);

-- Allow users to assign themselves the employee role
CREATE POLICY "Users can assign themselves employee role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND 
  role = 'employee'
);
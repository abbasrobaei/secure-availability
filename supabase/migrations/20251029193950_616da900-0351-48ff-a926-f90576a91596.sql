-- Close public data exposure on availability table by removing public read/update policies
-- and enforcing RLS. This preserves public INSERT for new submissions while restricting
-- read/update to admins only via existing policies.

-- 1) Ensure RLS is enabled and enforced
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability FORCE ROW LEVEL SECURITY;

-- 2) Drop insecure public policies (idempotent)
DROP POLICY IF EXISTS "Public can view availability" ON public.availability;
DROP POLICY IF EXISTS "Public can update availability" ON public.availability;

-- 3) Keep existing admin policies and public insert as-is
--    Admin policies: "Admins can view all availability", "Admins can update availability", "Admins can delete availability"
--    Public insert policy remains to allow anonymous submissions

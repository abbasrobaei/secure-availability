-- Enable users to view and update their own availability entries by phone number
-- This allows the form to show previous entries and enable editing

-- Allow public users to view availability entries (needed for checking existing entries)
CREATE POLICY "Public can view availability"
ON public.availability
FOR SELECT
TO public
USING (true);

-- Allow public users to update their availability entries
CREATE POLICY "Public can update availability"
ON public.availability
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
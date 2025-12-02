-- Add onboarding fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS personal_data_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rules_acknowledged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS salutation text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS birth_place text,
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS house_number text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS social_security_number text,
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS tax_class text,
ADD COLUMN IF NOT EXISTS health_insurance text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS iban text;

-- Create storage bucket for onboarding documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-documents', 'onboarding-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for onboarding documents
CREATE POLICY "Users can upload own onboarding docs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all onboarding docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'onboarding-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete onboarding docs"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'onboarding-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);
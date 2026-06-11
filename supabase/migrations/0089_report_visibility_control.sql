-- Migration: Add Report Visibility Control fields and constraints to profiles

-- 1. Extend the role check constraint to include employee, tester, viewer
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin', 'owner', 'reviewer', 'member', 'quality_checker',
    'head', 'supervisor', 'assistant_head', 'team_member',
    'employee', 'tester', 'viewer'
  ));

-- 2. Add visibility control fields to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS include_in_reports BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'website_team';

-- 3. Add department check constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_department_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_check
  CHECK (department IN (
    'website_team', 'seo_team', 'marketing', 'tester', 'admin'
  ));

-- 4. Create trigger to set default report visibility OFF for testers and admins/system accounts
CREATE OR REPLACE FUNCTION public.set_default_report_visibility()
RETURNS TRIGGER AS $$
BEGIN
  -- Default visibility is false for admin/tester roles, tester/admin departments, or containing keywords
  IF NEW.role IN ('admin', 'tester') 
     OR NEW.department IN ('admin', 'tester') 
     OR NEW.email ILIKE '%admin%' 
     OR NEW.email ILIKE '%tester%' 
     OR NEW.email ILIKE '%system%' 
     OR NEW.full_name ILIKE '%admin%' 
     OR NEW.full_name ILIKE '%tester%' 
     OR NEW.full_name ILIKE '%system%' 
     OR (NEW.position ILIKE '%admin%' OR NEW.position ILIKE '%tester%' OR NEW.position ILIKE '%system%') THEN
    NEW.include_in_reports := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_default_report_visibility_trigger ON public.profiles;

CREATE TRIGGER set_default_report_visibility_trigger
  BEFORE INSERT OR UPDATE OF role, department, email, full_name, position ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_report_visibility();

-- 5. Seed initial settings for existing users
-- Admins get include_in_reports = false, department = admin
UPDATE public.profiles
  SET include_in_reports = false, department = 'admin'
  WHERE role IN ('admin', 'owner')
     OR email ILIKE '%admin%'
     OR email ILIKE '%system%'
     OR full_name ILIKE '%admin%'
     OR full_name ILIKE '%system%';

-- Testers get include_in_reports = false, department = tester
UPDATE public.profiles
  SET include_in_reports = false, department = 'tester'
  WHERE role = 'tester'
     OR email ILIKE '%tester%'
     OR full_name ILIKE '%tester%'
     OR (position ILIKE '%tester%' OR position ILIKE '%quality%');

-- Everyone else default defaults are already handled, but let's make sure they are active employees
UPDATE public.profiles
  SET include_in_reports = true
  WHERE include_in_reports IS NULL;

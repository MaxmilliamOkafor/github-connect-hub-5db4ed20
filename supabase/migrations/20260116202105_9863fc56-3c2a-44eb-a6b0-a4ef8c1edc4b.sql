-- Create application status enum
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'applied', 'interview', 'offer', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create jobs table with tier-based prioritization
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_tier INTEGER DEFAULT 3 CHECK (company_tier IN (1, 2, 3)),
  location TEXT NOT NULL,
  salary TEXT,
  salary_range TEXT,
  description TEXT,
  requirements TEXT[],
  platform TEXT,
  url TEXT,
  snippet TEXT,
  posted_date TIMESTAMPTZ DEFAULT now(),
  posted_delta TEXT,
  match_score INTEGER DEFAULT 0,
  status application_status DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  url_status TEXT DEFAULT 'unknown' CHECK (url_status IN ('unknown', 'valid', 'broken', 'expired')),
  url_last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for tier-based filtering
CREATE INDEX IF NOT EXISTS idx_jobs_company_tier ON public.jobs(company_tier);
CREATE INDEX IF NOT EXISTS idx_jobs_tier_date ON public.jobs(company_tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_url ON public.jobs(url);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Public read access for job listings
CREATE POLICY "Jobs are publicly readable"
ON public.jobs FOR SELECT
USING (true);

-- Function to automatically set company tier
CREATE OR REPLACE FUNCTION public.set_company_tier()
RETURNS TRIGGER AS $$
DECLARE
  tier1_companies TEXT[] := ARRAY['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'NVIDIA', 'Netflix', 'OpenAI', 'Anthropic', 'Tesla', 'Stripe', 'Salesforce', 'Adobe', 'Snowflake', 'Palantir', 'Airbnb', 'Uber', 'SpaceX', 'DeepMind', 'ByteDance'];
  tier2_companies TEXT[] := ARRAY['IBM', 'Oracle', 'Cisco', 'Intel', 'AMD', 'VMware', 'ServiceNow', 'Workday', 'Intuit', 'SAP', 'PayPal', 'Square', 'Datadog', 'Splunk', 'Twilio', 'Shopify', 'Atlassian', 'GitLab', 'MongoDB', 'Elastic'];
  tier3_companies TEXT[] := ARRAY['Accenture', 'Deloitte', 'PwC', 'EY', 'KPMG', 'McKinsey', 'BCG', 'Bain', 'Cognizant', 'Infosys', 'Wipro', 'HCLTech', 'Capgemini', 'TCS', 'TechMahindra'];
  company_lower TEXT;
BEGIN
  company_lower := LOWER(NEW.company);
  
  FOR i IN 1..array_length(tier1_companies, 1) LOOP
    IF company_lower LIKE '%' || LOWER(tier1_companies[i]) || '%' THEN
      NEW.company_tier := 1;
      RETURN NEW;
    END IF;
  END LOOP;
  
  FOR i IN 1..array_length(tier2_companies, 1) LOOP
    IF company_lower LIKE '%' || LOWER(tier2_companies[i]) || '%' THEN
      NEW.company_tier := 2;
      RETURN NEW;
    END IF;
  END LOOP;
  
  FOR i IN 1..array_length(tier3_companies, 1) LOOP
    IF company_lower LIKE '%' || LOWER(tier3_companies[i]) || '%' THEN
      NEW.company_tier := 3;
      RETURN NEW;
    END IF;
  END LOOP;
  
  NEW.company_tier := 3;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto tier assignment
DROP TRIGGER IF EXISTS set_job_tier_trigger ON public.jobs;
CREATE TRIGGER set_job_tier_trigger
BEFORE INSERT OR UPDATE OF company ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_company_tier();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
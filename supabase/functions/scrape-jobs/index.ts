import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ TIER 1 COMPANIES (70% Priority) - FAANG + Top Tech ============
const TIER_1_COMPANIES = {
  // Direct career sites (no Greenhouse)
  direct: [
    { name: 'Google', domain: 'careers.google.com' },
    { name: 'Amazon', domain: 'amazon.jobs' },
    { name: 'Microsoft', domain: 'careers.microsoft.com' },
    { name: 'Meta', domain: 'metacareers.com' },
    { name: 'Apple', domain: 'jobs.apple.com' },
    { name: 'NVIDIA', domain: 'nvidia.com/careers' },
    { name: 'Netflix', domain: 'jobs.netflix.com' },
    { name: 'Salesforce', domain: 'salesforce.com/company/careers' },
  ],
  // Greenhouse-based Tier 1
  greenhouse: [
    { name: 'Stripe', token: 'stripe', tier: 1 },
    { name: 'Airbnb', token: 'airbnb', tier: 1 },
    { name: 'Coinbase', token: 'coinbase', tier: 1 },
    { name: 'Cloudflare', token: 'cloudflare', tier: 1 },
    { name: 'Databricks', token: 'databricks', tier: 1 },
    { name: 'Snowflake', token: 'snowflakecomputing', tier: 1 },
    { name: 'OpenAI', token: 'openai', tier: 1 },
    { name: 'Anthropic', token: 'anthropic', tier: 1 },
    { name: 'Scale AI', token: 'scaleai', tier: 1 },
    { name: 'Palantir', token: 'palantir', tier: 1 },
    { name: 'Figma', token: 'figma', tier: 1 },
    { name: 'Notion', token: 'notion', tier: 1 },
    { name: 'Discord', token: 'discord', tier: 1 },
    { name: 'Spotify', token: 'spotify', tier: 1 },
    { name: 'Uber', token: 'uber', tier: 1 },
    { name: 'DoorDash', token: 'doordash', tier: 1 },
    { name: 'Instacart', token: 'instacart', tier: 1 },
    { name: 'Lyft', token: 'lyft', tier: 1 },
    { name: 'Pinterest', token: 'pinterest', tier: 1 },
    { name: 'Snap', token: 'snapchat', tier: 1 },
    { name: 'Dropbox', token: 'dropbox', tier: 1 },
    { name: 'Reddit', token: 'reddit', tier: 1 },
    { name: 'Robinhood', token: 'robinhood', tier: 1 },
  ],
};

// ============ TIER 2 COMPANIES (30% Priority) - Enterprise & Consulting ============
const TIER_2_COMPANIES = {
  greenhouse: [
    { name: 'Accenture', token: 'accenture', tier: 2 },
    { name: 'Oracle', token: 'oracle', tier: 2 },
    { name: 'Cisco', token: 'cisco', tier: 2 },
    { name: 'Adobe', token: 'adobecareers', tier: 2 },
    { name: 'MongoDB', token: 'mongodb', tier: 2 },
    { name: 'GitLab', token: 'gitlab', tier: 2 },
    { name: 'HashiCorp', token: 'hashicorp', tier: 2 },
    { name: 'Elastic', token: 'elastic', tier: 2 },
    { name: 'Datadog', token: 'datadog', tier: 2 },
    { name: 'Confluent', token: 'confluent', tier: 2 },
    { name: 'Twilio', token: 'twilio', tier: 2 },
    { name: 'Plaid', token: 'plaid', tier: 2 },
    { name: 'Rippling', token: 'rippling', tier: 2 },
    { name: 'Brex', token: 'brex', tier: 2 },
    { name: 'Ramp', token: 'ramp', tier: 2 },
    { name: 'Mercury', token: 'mercury', tier: 2 },
    { name: 'Deel', token: 'deel', tier: 2 },
    { name: 'Retool', token: 'retool', tier: 2 },
    { name: 'Vercel', token: 'vercel', tier: 2 },
    { name: 'Linear', token: 'linear', tier: 2 },
  ],
  // Consulting firms (Workday)
  workday: [
    { name: 'Deloitte', domain: 'deloitte', tier: 2 },
    { name: 'PwC', domain: 'pwc', tier: 2 },
    { name: 'KPMG', domain: 'kpmg', tier: 2 },
    { name: 'EY', domain: 'ey', tier: 2 },
    { name: 'McKinsey', domain: 'mckinsey', tier: 2 },
    { name: 'Cognizant', domain: 'cognizant', tier: 2 },
    { name: 'Infosys', domain: 'infosys', tier: 2 },
    { name: 'Wipro', domain: 'wipro', tier: 2 },
    { name: 'TCS', domain: 'tcs', tier: 2 },
    { name: 'Capgemini', domain: 'capgemini', tier: 2 },
    { name: 'HCLTech', domain: 'hcltech', tier: 2 },
  ],
};

// ============ TIER 3 COMPANIES - Fintech & Other ============
const TIER_3_COMPANIES = {
  workable: [
    { name: 'Revolut', subdomain: 'revolut', tier: 3 },
    { name: 'Wise', subdomain: 'transferwise', tier: 3 },
    { name: 'N26', subdomain: 'n26', tier: 3 },
    { name: 'Monzo', subdomain: 'monzo', tier: 3 },
    { name: 'Klarna', subdomain: 'klarna', tier: 3 },
  ],
};

// Job role keywords to search for
const JOB_KEYWORDS = [
  'AI', 'ML', 'Machine Learning', 'Deep Learning', 'NLP', 'LLM', 'GenAI',
  'Cloud Engineer', 'Cloud Architect', 'AWS', 'Azure', 'GCP',
  'Python', 'DevOps', 'SRE', 'Site Reliability',
  'Data Scientist', 'Data Engineer', 'Data Analytics',
  'Software Engineer', 'Backend', 'Full Stack', 'Frontend',
  'Kubernetes', 'Docker', 'Terraform', 'Infrastructure',
];

// Location filters (prioritize Dublin/Ireland/Remote)
const TARGET_LOCATIONS = [
  'Dublin', 'Ireland', 'Remote', 'EMEA', 'Europe',
  'United Kingdom', 'London', 'Germany', 'Netherlands',
  'United States', 'New York', 'San Francisco', 'Seattle',
];

interface JobListing {
  id: string;
  title: string;
  company: string;
  company_tier: 1 | 2 | 3;
  location: string;
  salary_range: string | null;
  url: string;
  posted_delta: string;
  posted_at: string;
  snippet: string;
  requirements: string[];
  source: string;
  match_score: number;
}

// ============ FETCH FROM GREENHOUSE API ============
async function fetchGreenhouseJobs(company: { name: string; token: string; tier: number }): Promise<JobListing[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs?content=true`,
      { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' } 
      }
    );
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`Greenhouse ${company.name}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const jobs: JobListing[] = (data.jobs || []).slice(0, 50).map((job: any) => {
      const locationName = job.location?.name || 'Remote';
      const directUrl = job.absolute_url || `https://boards.greenhouse.io/${company.token}/jobs/${job.id}`;
      const postedAt = job.updated_at || new Date().toISOString();
      
      return {
        id: `gh_${company.token}_${job.id}`,
        title: job.title || 'Unknown Position',
        company: company.name,
        company_tier: company.tier as 1 | 2 | 3,
        location: locationName,
        salary_range: null,
        url: directUrl,
        posted_at: postedAt,
        posted_delta: getTimeDelta(postedAt),
        snippet: job.content ? stripHtml(job.content).slice(0, 300) : '',
        requirements: extractRequirements(job.content || ''),
        source: 'greenhouse',
        match_score: 0,
      };
    });
    
    console.log(`✓ ${company.name}: ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error(`✗ ${company.name}: timeout/error`);
    return [];
  }
}

// ============ FETCH FROM WORKABLE API ============
async function fetchWorkableJobs(company: { name: string; subdomain: string; tier: number }): Promise<JobListing[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://apply.workable.com/api/v3/accounts/${company.subdomain}/jobs`,
      { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' } 
      }
    );
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log(`Workable ${company.name}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const jobs: JobListing[] = (data.results || []).slice(0, 30).map((job: any) => {
      const directUrl = `https://apply.workable.com/${company.subdomain}/j/${job.shortcode}/`;
      const postedAt = job.published || new Date().toISOString();
      
      return {
        id: `wk_${company.subdomain}_${job.shortcode}`,
        title: job.title || 'Unknown Position',
        company: company.name,
        company_tier: company.tier as 1 | 2 | 3,
        location: job.location?.city || job.location?.country || 'Remote',
        salary_range: null,
        url: directUrl,
        posted_at: postedAt,
        posted_delta: getTimeDelta(postedAt),
        snippet: job.description || '',
        requirements: extractRequirements(job.description || ''),
        source: 'workable',
        match_score: 0,
      };
    });
    
    console.log(`✓ ${company.name}: ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error(`✗ ${company.name}: timeout/error`);
    return [];
  }
}

// ============ HELPER FUNCTIONS ============
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getTimeDelta(dateStr: string): string {
  const now = Date.now();
  const posted = new Date(dateStr).getTime();
  const diffMs = now - posted;
  
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  return `${Math.floor(days / 7)}w ago`;
}

function extractRequirements(content: string): string[] {
  const techKeywords = [
    'Python', 'Java', 'TypeScript', 'JavaScript', 'React', 'Node.js', 'AWS', 'GCP', 'Azure',
    'Kubernetes', 'Docker', 'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'GraphQL',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Go', 'Rust', 'C++',
    'SQL', 'NoSQL', 'REST API', 'Microservices', 'CI/CD', 'Terraform', 'Linux',
    'Spark', 'Airflow', 'dbt', 'Snowflake', 'BigQuery', 'Databricks', 'MLOps',
  ];
  
  const found = techKeywords.filter(kw => 
    content.toLowerCase().includes(kw.toLowerCase())
  );
  
  return found.slice(0, 8);
}

function calculateScore(job: JobListing, keywords: string[], locations: string[]): number {
  let score = 50;
  const jobText = `${job.title} ${job.snippet} ${job.requirements.join(' ')}`.toLowerCase();
  const jobLoc = job.location.toLowerCase();
  
  // Tier bonus (Tier 1 = +20, Tier 2 = +10, Tier 3 = +5)
  score += job.company_tier === 1 ? 20 : job.company_tier === 2 ? 10 : 5;
  
  // Keyword matches (+5 each, max +30)
  let keywordScore = 0;
  for (const kw of keywords) {
    if (kw && jobText.includes(kw.toLowerCase())) {
      keywordScore += 5;
    }
  }
  score += Math.min(30, keywordScore);
  
  // Location preference (+15 for Dublin/Ireland/Remote)
  const priorityLocs = ['dublin', 'ireland', 'remote'];
  if (priorityLocs.some(loc => jobLoc.includes(loc))) {
    score += 15;
  } else if (locations.some(loc => jobLoc.includes(loc.toLowerCase()))) {
    score += 5;
  }
  
  // Recency bonus (posted in last hour = +10)
  const postedMs = Date.now() - new Date(job.posted_at).getTime();
  if (postedMs < 3600000) score += 10;
  else if (postedMs < 86400000) score += 5;
  
  return Math.min(100, score);
}

// ============ TIER-BASED MIXING (70% Tier 1, 30% Tier 2/3) ============
function mixJobsByTier(jobs: JobListing[]): JobListing[] {
  const tier1Jobs = jobs.filter(j => j.company_tier === 1);
  const tier2Jobs = jobs.filter(j => j.company_tier === 2);
  const tier3Jobs = jobs.filter(j => j.company_tier === 3);
  
  // Sort each tier by score (highest first)
  tier1Jobs.sort((a, b) => b.match_score - a.match_score);
  tier2Jobs.sort((a, b) => b.match_score - a.match_score);
  tier3Jobs.sort((a, b) => b.match_score - a.match_score);
  
  const mixed: JobListing[] = [];
  const totalJobs = jobs.length;
  
  // 70% from Tier 1
  const tier1Count = Math.floor(totalJobs * 0.7);
  mixed.push(...tier1Jobs.slice(0, tier1Count));
  
  // 20% from Tier 2
  const tier2Count = Math.floor(totalJobs * 0.2);
  mixed.push(...tier2Jobs.slice(0, tier2Count));
  
  // 10% from Tier 3
  const tier3Count = Math.floor(totalJobs * 0.1);
  mixed.push(...tier3Jobs.slice(0, tier3Count));
  
  // Shuffle within recent jobs for variety (keep newest at top)
  const recentCutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
  const recentJobs = mixed.filter(j => new Date(j.posted_at).getTime() > recentCutoff);
  const olderJobs = mixed.filter(j => new Date(j.posted_at).getTime() <= recentCutoff);
  
  // Sort recent by posted time (newest first)
  recentJobs.sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
  
  return [...recentJobs, ...olderJobs];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request
    const rawData = await req.json().catch(() => ({}));
    const keywords = rawData.keywords?.split(',').map((k: string) => k.trim()).filter(Boolean) || JOB_KEYWORDS;
    const locations = rawData.locations?.split(',').map((l: string) => l.trim()).filter(Boolean) || TARGET_LOCATIONS;
    const limit = Math.min(parseInt(rawData.limit) || 200, 500);
    const offset = parseInt(rawData.offset) || 0;
    
    // Optional: Check auth header for user context
    const authHeader = req.headers.get('authorization');
    let user_id: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      user_id = user?.id || null;
    }
    
    console.log(`🚀 Starting job scrape - Keywords: ${keywords.length}, Locations: ${locations.length}`);
    
    // ============ PARALLEL FETCHING FROM ALL SOURCES ============
    const allPromises: Promise<JobListing[]>[] = [];
    
    // Tier 1 Greenhouse companies
    for (const company of TIER_1_COMPANIES.greenhouse) {
      allPromises.push(fetchGreenhouseJobs(company));
    }
    
    // Tier 2 Greenhouse companies
    for (const company of TIER_2_COMPANIES.greenhouse) {
      allPromises.push(fetchGreenhouseJobs(company));
    }
    
    // Tier 3 Workable companies
    for (const company of TIER_3_COMPANIES.workable) {
      allPromises.push(fetchWorkableJobs(company));
    }
    
    // Execute all in parallel (batched to avoid overwhelming)
    const batchSize = 10;
    let allJobs: JobListing[] = [];
    
    for (let i = 0; i < allPromises.length; i += batchSize) {
      const batch = allPromises.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allJobs.push(...result.value);
        }
      }
    }
    
    console.log(`📦 Fetched ${allJobs.length} total jobs`);
    
    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueJobs = allJobs.filter(job => {
      if (seenUrls.has(job.url)) return false;
      seenUrls.add(job.url);
      return true;
    });
    
    console.log(`🔄 Deduplicated to ${uniqueJobs.length} unique jobs`);
    
    // Calculate scores
    for (const job of uniqueJobs) {
      job.match_score = calculateScore(job, keywords, locations);
    }
    
    // Apply tier-based mixing
    const mixedJobs = mixJobsByTier(uniqueJobs);
    
    // Paginate
    const paginatedJobs = mixedJobs.slice(offset, offset + limit);
    
    // Save to database if user is authenticated
    if (user_id && paginatedJobs.length > 0) {
      // Get existing URLs to avoid duplicates
      const { data: existingJobs } = await supabase
        .from('jobs')
        .select('url')
        .eq('user_id', user_id);
      
      const existingUrls = new Set((existingJobs || []).map(j => j.url));
      const newJobs = paginatedJobs.filter(j => !existingUrls.has(j.url));
      
      if (newJobs.length > 0) {
        const jobsToInsert = newJobs.slice(0, 100).map(job => ({
          user_id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary: job.salary_range,
          description: job.snippet,
          requirements: job.requirements,
          platform: job.source,
          url: job.url,
          posted_date: job.posted_at,
          match_score: Math.round(job.match_score),
          status: 'pending',
        }));
        
        const { error } = await supabase.from('jobs').insert(jobsToInsert);
        if (error) {
          console.error('Insert error:', error.message);
        } else {
          console.log(`💾 Saved ${newJobs.length} new jobs for user`);
        }
      }
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Completed in ${elapsed}ms`);
    
    // Stats
    const stats = {
      tier1: paginatedJobs.filter(j => j.company_tier === 1).length,
      tier2: paginatedJobs.filter(j => j.company_tier === 2).length,
      tier3: paginatedJobs.filter(j => j.company_tier === 3).length,
    };
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        jobs: paginatedJobs,
        stats,
        total: mixedJobs.length,
        hasMore: offset + limit < mixedJobs.length,
        nextOffset: offset + limit,
        elapsed_ms: elapsed,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scrape error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

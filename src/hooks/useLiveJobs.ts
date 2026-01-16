import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Job {
  id: string;
  title: string;
  company: string;
  company_tier: 1 | 2 | 3;
  location: string;
  salary?: string;
  salary_range?: string;
  description?: string;
  requirements?: string[];
  platform?: string;
  url?: string;
  snippet?: string;
  posted_date?: string;
  posted_delta?: string;
  match_score?: number;
  status?: string;
  created_at?: string;
}

export interface TierStats {
  tier1: number;
  tier2: number;
  tier3: number;
  total: number;
}

const POLLING_INTERVAL = 60000; // 60 seconds

export function useLiveJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<TierStats>({ tier1: 0, tier2: 0, tier3: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch from live-jobs-feed edge function
      const { data, error: funcError } = await supabase.functions.invoke('live-jobs-feed', {
        body: { limit: 100, tierFilter: null }
      });

      if (funcError) throw funcError;

      if (data?.jobs) {
        setJobs(data.jobs);
        setStats(data.stats || { tier1: 0, tier2: 0, tier3: 0, total: data.jobs.length });
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('[useLiveJobs] Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Polling every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchJobs, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('[useLiveJobs] Realtime update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as Job;
            setJobs(prev => {
              // Insert based on tier priority
              const updated = [newJob, ...prev];
              return updated.sort((a, b) => {
                if (a.company_tier !== b.company_tier) return a.company_tier - b.company_tier;
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
              }).slice(0, 100);
            });
            setStats(prev => ({
              ...prev,
              [`tier${newJob.company_tier}`]: prev[`tier${newJob.company_tier}` as keyof TierStats] + 1,
              total: prev.total + 1
            }));
            setLastUpdate(new Date());
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as Job;
            setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
            setLastUpdate(new Date());
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setJobs(prev => prev.filter(j => j.id !== deletedId));
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerScrape = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('scrape-jobs', {
        body: { maxJobs: 50 }
      });
      
      if (error) throw error;
      
      console.log('[useLiveJobs] Scrape triggered:', data);
      await fetchJobs();
    } catch (err) {
      console.error('[useLiveJobs] Scrape error:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger scrape');
    } finally {
      setIsLoading(false);
    }
  }, [fetchJobs]);

  return {
    jobs,
    stats,
    isLoading,
    error,
    lastUpdate,
    refetch: fetchJobs,
    triggerScrape
  };
}

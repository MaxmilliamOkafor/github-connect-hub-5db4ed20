import React, { useState } from 'react';
import { useLiveJobs } from '@/hooks/useLiveJobs';
import { JobCard } from './JobCard';
import { TierBadge } from './TierBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Search, Zap, Filter } from 'lucide-react';
import type { Job } from '@/hooks/useLiveJobs';

export function LiveJobsFeed() {
  const { jobs, stats, isLoading, error, lastUpdate, refetch, triggerScrape } = useLiveJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<1 | 2 | 3 | null>(null);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchQuery || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTier = !tierFilter || job.company_tier === tierFilter;
    
    return matchesSearch && matchesTier;
  });

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Never';
    const diff = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Jobs</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex gap-3">
            <button 
              onClick={() => setTierFilter(tierFilter === 1 ? null : 1)}
              className={`text-center transition-opacity ${tierFilter && tierFilter !== 1 ? 'opacity-50' : ''}`}
            >
              <TierBadge tier={1} size="sm" />
              <p className="text-xs mt-1">{stats.tier1}</p>
            </button>
            <button 
              onClick={() => setTierFilter(tierFilter === 2 ? null : 2)}
              className={`text-center transition-opacity ${tierFilter && tierFilter !== 2 ? 'opacity-50' : ''}`}
            >
              <TierBadge tier={2} size="sm" />
              <p className="text-xs mt-1">{stats.tier2}</p>
            </button>
            <button 
              onClick={() => setTierFilter(tierFilter === 3 ? null : 3)}
              className={`text-center transition-opacity ${tierFilter && tierFilter !== 3 ? 'opacity-50' : ''}`}
            >
              <TierBadge tier={3} size="sm" />
              <p className="text-xs mt-1">{stats.tier3}</p>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated {formatLastUpdate()}
          </span>
          <Button onClick={refetch} size="sm" variant="ghost" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={triggerScrape} size="sm" disabled={isLoading}>
            <Zap className="h-4 w-4 mr-1" />
            Scrape Now
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs, companies, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {tierFilter && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setTierFilter(null)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Clear Filter
          </Button>
        )}
      </div>

      {/* Job Grid */}
      {isLoading && jobs.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No jobs found matching your criteria</p>
          <Button onClick={triggerScrape} variant="link" className="mt-2">
            Trigger a new scrape
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard 
              key={job.id} 
              job={job}
              onApply={(job) => {
                console.log('Apply to:', job);
                // Trigger extension or redirect
                if (job.url) window.open(job.url, '_blank');
              }}
            />
          ))}
        </div>
      )}

      {/* Live indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-background/95 backdrop-blur px-3 py-2 rounded-full shadow-lg border">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-xs font-medium">Live • 60s refresh</span>
      </div>
    </div>
  );
}

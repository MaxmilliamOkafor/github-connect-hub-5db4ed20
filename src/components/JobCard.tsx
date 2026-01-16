import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TierBadge } from './TierBadge';
import { MapPin, Clock, ExternalLink, DollarSign } from 'lucide-react';
import type { Job } from '@/hooks/useLiveJobs';

interface JobCardProps {
  job: Job;
  onApply?: (job: Job) => void;
}

export function JobCard({ job, onApply }: JobCardProps) {
  const getTimeAgo = (date?: string) => {
    if (!date) return 'Recently';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
              {job.title}
            </h3>
            <p className="text-muted-foreground font-medium">{job.company}</p>
          </div>
          <TierBadge tier={job.company_tier} size="sm" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {job.location}
          </span>
          
          {(job.salary_range || job.salary) && (
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {job.salary_range || job.salary}
            </span>
          )}
          
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {job.posted_delta || getTimeAgo(job.posted_date)}
          </span>
        </div>

        {job.snippet && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {job.snippet}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2">
          {job.url && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(job.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Job
            </Button>
          )}
          
          {onApply && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onApply(job)}
            >
              Quick Apply
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

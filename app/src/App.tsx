import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, Clock, MapPin, DollarSign, Building2, 
  Zap, TrendingUp, RefreshCw, ChevronRight, X,
  Briefcase, Code, Database, Cloud, Brain, Server,
  Award, Medal, Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import './App.css';

// ============ JOB TYPES ============
const JOB_TYPES = [
  'AI/ML Engineer', 'Cloud Engineer', 'Python Developer', 'DevOps Engineer', 
  'Data Scientist', 'Software Engineer', 'Full Stack Developer', 'Backend Engineer',
  'Frontend Developer', 'Data Engineer', 'Machine Learning Engineer', 'Site Reliability Engineer'
];

// ============ INTERFACES ============
interface Job {
  id: string;
  title: string;
  company: string;
  company_tier: 1 | 2 | 3;
  location: string;
  salary_range: string;
  url: string;
  posted_delta: string;
  snippet: string;
  logo?: string;
  tags: string[];
}

interface Filters {
  tier: number[];
  type: string[];
  location: string;
  remote: boolean;
}

// ============ TIER BADGE COMPONENT ============
const TierBadge: React.FC<{ tier: number }> = ({ tier }) => {
  const config = {
    1: { icon: Trophy, color: 'bg-gradient-to-r from-yellow-400 to-amber-500', label: 'Tier 1' },
    2: { icon: Medal, color: 'bg-gradient-to-r from-gray-300 to-gray-400', label: 'Tier 2' },
    3: { icon: Award, color: 'bg-gradient-to-r from-amber-600 to-amber-700', label: 'Tier 3' }
  };
  
  const { icon: Icon, color, label } = config[tier as keyof typeof config];
  
  return (
    <Badge className={`${color} text-white border-0 px-2 py-1 gap-1`}>
      <Icon size={12} />
      {label}
    </Badge>
  );
};

// ============ JOB CARD COMPONENT ============
const JobCard: React.FC<{ job: Job; onClick: () => void }> = ({ job, onClick }) => {
  const getJobIcon = (title: string) => {
    if (title.includes('AI') || title.includes('ML') || title.includes('Machine')) return Brain;
    if (title.includes('Cloud') || title.includes('DevOps') || title.includes('SRE')) return Cloud;
    if (title.includes('Data')) return Database;
    if (title.includes('Backend') || title.includes('Server')) return Server;
    if (title.includes('Frontend') || title.includes('Full Stack')) return Code;
    return Briefcase;
  };
  
  const JobIcon = getJobIcon(job.title);
  
  return (
    <Card 
      className="job-card group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border border-gray-100"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <JobIcon className="w-6 h-6 text-indigo-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                  {job.title}
                </h3>
                <TierBadge tier={job.company_tier} />
              </div>
              
              <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <Building2 size={14} />
                  <span className="font-medium">{job.company}</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <MapPin size={14} />
                  <span>{job.location}</span>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span className={job.posted_delta.includes('min') || job.posted_delta.includes('hour') ? 'text-green-600 font-medium' : ''}>
                    {job.posted_delta}
                  </span>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                {job.snippet}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {job.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                {job.salary_range && (
                  <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                    <DollarSign size={14} />
                    {job.salary_range}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};

// ============ JOB DETAILS MODAL ============
const JobDetailsModal: React.FC<{ job: Job | null; onClose: () => void }> = ({ job, onClose }) => {
  if (!job) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
                <TierBadge tier={job.company_tier} />
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <span className="flex items-center gap-1">
                  <Building2 size={16} />
                  {job.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={16} />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={16} />
                  {job.posted_delta}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <ScrollArea className="p-6 max-h-[60vh]">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">About the Role</h3>
              <p className="text-gray-600 leading-relaxed">{job.snippet}</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {job.tags.map(tag => (
                <Badge key={tag} variant="outline" className="px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
            
            {job.salary_range && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <DollarSign size={20} />
                  <span className="font-semibold">Salary Range:</span>
                  <span>{job.salary_range}</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-3">
            <Button 
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              onClick={() => window.open(job.url, '_blank')}
            >
              Apply Now
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ FILTERS PANEL ============
const FiltersPanel: React.FC<{ filters: Filters; onChange: (filters: Filters) => void }> = ({ filters, onChange }) => {
  return (
    <div className="filters-panel bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Filter size={18} />
          Filters
        </h3>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onChange({ tier: [], type: [], location: '', remote: false })}
        >
          Clear All
        </Button>
      </div>
      
      <div className="space-y-6">
        {/* Tier Filter */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">Company Tier</label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map(tier => (
              <button
                key={tier}
                onClick={() => {
                  const newTiers = filters.tier.includes(tier) 
                    ? filters.tier.filter(t => t !== tier)
                    : [...filters.tier, tier];
                  onChange({ ...filters, tier: newTiers });
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filters.tier.includes(tier)
                    ? tier === 1 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                      : tier === 2 ? 'bg-gray-100 text-gray-800 border border-gray-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Tier {tier}
              </button>
            ))}
          </div>
        </div>
        
        {/* Job Type Filter */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">Job Type</label>
          <div className="grid grid-cols-2 gap-2">
            {JOB_TYPES.slice(0, 6).map(type => (
              <button
                key={type}
                onClick={() => {
                  const newTypes = filters.type.includes(type)
                    ? filters.type.filter(t => t !== type)
                    : [...filters.type, type];
                  onChange({ ...filters, type: newTypes });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs text-left transition-all ${
                  filters.type.includes(type)
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        
        {/* Location Filter */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">Location</label>
          <div className="space-y-2">
            <Input
              placeholder="Search location..."
              value={filters.location}
              onChange={(e) => onChange({ ...filters, location: e.target.value })}
              className="h-9"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.remote}
                onChange={(e) => onChange({ ...filters, remote: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Remote only</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ STATS CARDS ============
const StatsCards: React.FC<{ stats: any }> = ({ stats }) => {
  const statItems = [
    { label: 'Total Jobs', value: stats.total, icon: Briefcase, color: 'from-blue-500 to-indigo-600' },
    { label: 'Tier 1 Jobs', value: stats.tier1, icon: Trophy, color: 'from-yellow-400 to-amber-500' },
    { label: 'Added Today', value: stats.today, icon: TrendingUp, color: 'from-green-500 to-emerald-600' },
    { label: 'Last Updated', value: stats.lastUpdated, icon: RefreshCw, color: 'from-purple-500 to-violet-600' }
  ];
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map(stat => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ============ MAIN APP ============
function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filters, setFilters] = useState<Filters>({ tier: [1, 2], type: [], location: '', remote: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    today: 0,
    lastUpdated: 'Just now'
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    connectWebSocket();
    
    // Initial load
    loadJobs();
    
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      loadJobs();
      setLastUpdate(new Date());
    }, 60000);
    
    return () => {
      clearInterval(interval);
      wsRef.current?.close();
    };
  }, []);

  const connectWebSocket = () => {
    try {
      // Connect to job scraper WebSocket
      wsRef.current = new WebSocket('wss://jobs-api.quantumhire.ai/ws');
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Connected to job stream');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'new_jobs') {
            handleNewJobs(data.jobs);
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setIsConnected(false);
    }
  };

  const loadJobs = async () => {
    try {
      setLoading(true);
      
      // Simulate API call - replace with actual scraper API
      const response = await fetch('https://jobs-api.quantumhire.ai/jobs', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-api-key'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs);
        updateStats(data.jobs);
      } else {
        // Fallback to mock data for demo
        loadMockJobs();
      }
      
    } catch (error) {
      console.error('Failed to load jobs:', error);
      loadMockJobs();
    } finally {
      setLoading(false);
    }
  };

  const loadMockJobs = () => {
    const mockJobs: Job[] = [
      {
        id: '1',
        title: 'Senior AI/ML Engineer',
        company: 'Google',
        company_tier: 1,
        location: 'Dublin, Ireland',
        salary_range: '€120k - €180k',
        url: 'https://careers.google.com/jobs',
        posted_delta: '2 min ago',
        snippet: 'Design and implement machine learning models for large-scale applications. Work with TensorFlow, PyTorch, and Google Cloud Platform.',
        tags: ['Python', 'TensorFlow', 'GCP', 'Kubernetes', 'Docker']
      },
      {
        id: '2',
        title: 'Cloud Solutions Architect',
        company: 'Amazon',
        company_tier: 1,
        location: 'Remote',
        salary_range: '€130k - €190k',
        url: 'https://amazon.jobs',
        posted_delta: '5 min ago',
        snippet: 'Architect cloud solutions on AWS. Design microservices, implement CI/CD pipelines, and optimize cloud infrastructure.',
        tags: ['AWS', 'Terraform', 'CI/CD', 'Microservices', 'Python']
      },
      {
        id: '3',
        title: 'Senior Software Engineer',
        company: 'Microsoft',
        company_tier: 1,
        location: 'Dublin, Ireland',
        salary_range: '€110k - €160k',
        url: 'https://careers.microsoft.com',
        posted_delta: '12 min ago',
        snippet: 'Build scalable backend services using .NET Core and Azure. Work on distributed systems and cloud-native applications.',
        tags: ['C#', '.NET', 'Azure', 'Kubernetes', 'SQL']
      },
      {
        id: '4',
        title: 'Data Scientist',
        company: 'Meta',
        company_tier: 1,
        location: 'Remote',
        salary_range: '€140k - €200k',
        url: 'https://metacareers.com',
        posted_delta: '18 min ago',
        snippet: 'Analyze large datasets to drive product decisions. Build predictive models and work with PyTorch, Spark, and BigQuery.',
        tags: ['Python', 'PyTorch', 'Spark', 'SQL', 'BigQuery']
      },
      {
        id: '5',
        title: 'DevOps Engineer',
        company: 'Accenture',
        company_tier: 2,
        location: 'Dublin, Ireland',
        salary_range: '€80k - €120k',
        url: 'https://accenture.com/careers',
        posted_delta: '25 min ago',
        snippet: 'Implement DevOps practices for enterprise clients. Work with Jenkins, Ansible, Docker, and cloud platforms.',
        tags: ['Jenkins', 'Ansible', 'Docker', 'AWS', 'Python']
      },
      {
        id: '6',
        title: 'Senior Python Developer',
        company: 'IBM',
        company_tier: 2,
        location: 'Cork, Ireland',
        salary_range: '€90k - €130k',
        url: 'https://ibm.com/careers',
        posted_delta: '32 min ago',
        snippet: 'Develop Python applications for enterprise clients. Work with Django, FastAPI, and cloud services.',
        tags: ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Docker']
      }
    ];
    
    setJobs(mockJobs);
    updateStats(mockJobs);
  };

  const handleNewJobs = (newJobs: Job[]) => {
    setJobs(prev => {
      const existingIds = new Set(prev.map(j => j.id));
      const filtered = newJobs.filter(j => !existingIds.has(j.id));
      return [...filtered, ...prev];
    });
  };

  const updateStats = (jobsList: Job[]) => {
    const tier1 = jobsList.filter(j => j.company_tier === 1).length;
    const tier2 = jobsList.filter(j => j.company_tier === 2).length;
    const tier3 = jobsList.filter(j => j.company_tier === 3).length;
    const today = jobsList.filter(j => j.posted_delta.includes('min') || j.posted_delta.includes('hour')).length;
    
    setStats({
      total: jobsList.length,
      tier1,
      tier2,
      tier3,
      today,
      lastUpdated: 'Just now'
    });
  };

  // Apply filters and search
  useEffect(() => {
    let filtered = [...jobs];
    
    // Apply tier filter
    if (filters.tier.length > 0) {
      filtered = filtered.filter(job => filters.tier.includes(job.company_tier));
    }
    
    // Apply job type filter
    if (filters.type.length > 0) {
      filtered = filtered.filter(job => 
        filters.type.some(type => job.title.toLowerCase().includes(type.toLowerCase()))
      );
    }
    
    // Apply location filter
    if (filters.location) {
      filtered = filtered.filter(job => 
        job.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    // Apply remote filter
    if (filters.remote) {
      filtered = filtered.filter(job => 
        job.location.toLowerCase().includes('remote')
      );
    }
    
    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredJobs(filtered);
  }, [jobs, filters, searchQuery]);

  // Sort jobs: Tier 1 first, newest first within tiers
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (a.company_tier !== b.company_tier) {
      return a.company_tier - b.company_tier;
    }
    
    // Sort by posted time (newest first)
    const getTimeValue = (delta: string) => {
      if (delta.includes('min')) return parseInt(delta) || 0;
      if (delta.includes('hour')) return (parseInt(delta) || 0) * 60;
      if (delta.includes('day')) return (parseInt(delta) || 0) * 1440;
      return 9999;
    };
    
    return getTimeValue(a.posted_delta) - getTimeValue(b.posted_delta);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">QuantumHire AI</h1>
                <p className="text-xs text-gray-500">Live Job Scraper</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Live' : 'Reconnecting...'}
                </span>
              </div>
              
              {/* Last Update */}
              <div className="text-sm text-gray-500">
                Updated: {lastUpdate.toLocaleTimeString()}
              </div>
              
              {/* Refresh Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => loadJobs()}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <StatsCards stats={stats} />
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FiltersPanel filters={filters} onChange={setFilters} />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by title, company, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-base bg-white border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">{sortedJobs.length}</span> jobs
              </p>
              
              <Tabs defaultValue="all" className="w-auto">
                <TabsList className="grid grid-cols-3 w-[200px]">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="new">New</TabsTrigger>
                  <TabsTrigger value="saved">Saved</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Jobs List */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-gray-200 rounded w-3/4" />
                          <div className="h-4 bg-gray-200 rounded w-1/2" />
                          <div className="h-4 bg-gray-200 rounded w-2/3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedJobs.map(job => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onClick={() => setSelectedJob(job)}
                  />
                ))}
                
                {sortedJobs.length === 0 && (
                  <div className="text-center py-12">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No jobs match your filters</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your search criteria</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Load More */}
            {!loading && sortedJobs.length > 0 && (
              <div className="mt-8 text-center">
                <Button variant="outline" size="lg">
                  Load More Jobs
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Job Details Modal */}
      <JobDetailsModal 
        job={selectedJob} 
        onClose={() => setSelectedJob(null)} 
      />
    </div>
  );
}

export default App;

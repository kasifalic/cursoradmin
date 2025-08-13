"use client";
import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  RefreshCcw, 
  Activity, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Code,
  MessageSquare,
  Bot,
  Clock,
  Download,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Trophy,
  Crown,
  Star,
  Flame,
  Target,
  Award,
  Medal,
  Sparkles,
  Rocket,
  Brain,
  Search,
  Calendar
} from "lucide-react";
import Papa from "papaparse";

type UsageMetric = {
  userId: string;
  userEmail: string;
  userName?: string;
  totalRequests?: number;
  acceptedLines?: number;
  totalLines?: number;
  lastActiveAt?: string | null;
  // Enhanced metrics from daily usage API
  composerRequests?: number;
  chatRequests?: number;
  agentRequests?: number;
  cmdkUsages?: number;
  subscriptionIncludedReqs?: number;
  apiKeyReqs?: number;
  usageBasedReqs?: number;
  bugbotUsages?: number;
  totalLinesAdded?: number;
  totalLinesDeleted?: number;
  acceptedLinesAdded?: number;
  acceptedLinesDeleted?: number;
  totalAccepts?: number;
  totalRejects?: number;
  totalTabsAccepted?: number;
  totalTabsShown?: number;
  mostUsedModel?: string;
  applyMostUsedExtension?: string;
  tabMostUsedExtension?: string;
  activeDays?: number;
  acceptanceRate?: number;
  productivityScore?: number;
};

type DailyUsageResponse = { users: UsageMetric[] };

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UsageMetric[]>([]);
  const [inactiveDays, setInactiveDays] = useState<15 | 30>(15);
  const [activeView, setActiveView] = useState<'overview' | 'top-users' | 'inactive' | 'analytics'>('overview');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [inactiveLoading, setInactiveLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/usage/daily", { method: "POST" });
      const data: DailyUsageResponse = await res.json();
      if (!res.ok) throw new Error((data as any)?.error ?? "Failed to load");
      setUsers(data.users ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    fetchData();
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  useEffect(() => {
    // Save dark mode preference to localStorage
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    // Apply dark class to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const byActivity = useMemo(
    () => [...users].sort((a, b) => (b.totalRequests ?? 0) - (a.totalRequests ?? 0)),
    [users]
  );
  const top25 = useMemo(() => byActivity.slice(0, 25), [byActivity]);
  const last25 = useMemo(() => byActivity.slice(-25), [byActivity]);

  const [inactive, setInactive] = useState<UsageMetric[]>([]);

  async function fetchInactive(days: 15 | 30) {
    try {
      setInactiveLoading(true);
      const res = await fetch(`/api/usage/inactive?days=${days}`, { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load inactive");
      setInactive(data.users ?? []);
    } catch (e) {
      // leave as-is
    } finally {
      setInactiveLoading(false);
    }
  }

  const handleInactiveDaysChange = async (days: 15 | 30) => {
    setInactiveDays(days);
    setInactiveLoading(true);
    await fetchInactive(days);
    setInactiveLoading(false);
  };

  useEffect(() => {
    if (mounted) {
      fetchInactive(inactiveDays);
    }
  }, [inactiveDays, mounted]);

  const lowUsage = useMemo(() => users.filter((u) => (u.totalRequests ?? 0) < 20), [users]);
  const reclaimCandidates = useMemo(() => inactive.filter((u) => true), [inactive]);

  // Calculate summary stats
  const totalRequests = useMemo(() => users.reduce((sum, user) => sum + (user.totalRequests || 0), 0), [users]);
  const avgProductivity = useMemo(() => {
    if (users.length === 0) return 0;
    return Math.round(users.reduce((sum, user) => sum + (user.productivityScore || 0), 0) / users.length);
  }, [users]);

  // Calculate estimated hours saved through AI assistance
  const hoursSaved = useMemo(() => {
    // Advanced calculation based on multiple factors:
    // 1. Composer requests save ~15 minutes each (code generation)
    // 2. Chat requests save ~8 minutes each (problem solving)
    // 3. Agent requests save ~20 minutes each (complex tasks)
    // 4. Lines accepted save ~2 minutes per 10 lines (manual coding time)
    
    const composerTime = users.reduce((sum, user) => sum + (user.composerRequests || 0) * 15, 0); // 15 min per composer request
    const chatTime = users.reduce((sum, user) => sum + (user.chatRequests || 0) * 8, 0); // 8 min per chat request  
    const agentTime = users.reduce((sum, user) => sum + (user.agentRequests || 0) * 20, 0); // 20 min per agent request
    const linesTime = users.reduce((sum, user) => sum + Math.floor((user.acceptedLinesAdded || 0) / 10) * 2, 0); // 2 min per 10 lines
    
    const totalMinutes = composerTime + chatTime + agentTime + linesTime;
    return Math.round(totalMinutes / 60); // Convert to hours
  }, [users]);

  function exportCSV() {
    const rows = reclaimCandidates.map((u) => ({
      userId: u.userId,
      email: u.userEmail,
      name: u.userName ?? "",
      totalRequests: u.totalRequests ?? 0,
      lastActiveAt: u.lastActiveAt ?? "",
      recommendation: "reclaim",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cursor-license-recommendations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!mounted) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 grid place-items-center transition-colors duration-300">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          <span className="text-slate-600 dark:text-slate-300 font-medium">Loading Analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 transition-colors duration-300">
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-indigo-600 dark:from-blue-300 dark:to-indigo-200 bg-clip-text text-transparent">
                Amagi Cursor Analytics
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Cursor Vibe Coder Productivity</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all duration-200"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? 'Light' : 'Dark'}
            </button>
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={exportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-sm transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        {/* Ultra-Modern Animated Summary Cards */}
        <div className="relative mb-12">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5 rounded-3xl blur-3xl"></div>
          
          <div className="relative">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                ⚡ Vibe-Code Impact Metrics
              </h2>
              <p className="text-gray-600 dark:text-gray-400">Real-time insights into AI-powered development excellence</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              <div 
                className="opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '0.1s',
                  animationFillMode: 'forwards'
                }}
              >
                <ModernStatCard 
                  title="Total Vibe Coders" 
                  value={users.length} 
                  icon={<Users className="w-6 h-6" />}
                  color="blue"
                  subtitle="Licensed members"
                />
              </div>
              
              <div 
                className="opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '0.2s',
                  animationFillMode: 'forwards'
                }}
              >
                <ModernStatCard 
                  title="Total Requests" 
                  value={totalRequests.toLocaleString()} 
                  icon={<Zap className="w-6 h-6" />}
                  color="green"
                  subtitle="All AI interactions"
                />
              </div>
              
              <div 
                className="opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '0.3s',
                  animationFillMode: 'forwards'
                }}
              >
                <ModernStatCard 
                  title="Avg Productivity" 
                  value={`${avgProductivity}%`} 
                  icon={<TrendingUp className="w-6 h-6" />}
                  color="purple"
                  subtitle="Vibe engagement score"
                />
              </div>
              
              <div 
                className="opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '0.4s',
                  animationFillMode: 'forwards'
                }}
              >
                <ModernStatCard 
                  title={`Inactive ${inactiveDays}d`} 
                  value={reclaimCandidates.length} 
                  icon={<AlertTriangle className="w-6 h-6" />}
                  color="yellow"
                  subtitle="License reclaim candidates"
                />
              </div>
              
              <div 
                className="opacity-0 animate-fade-in-up"
                style={{ 
                  animationDelay: '0.5s',
                  animationFillMode: 'forwards'
                }}
              >
                <ModernStatCard 
                  title="Hours Saved" 
                  value={hoursSaved > 999 ? `${Math.round(hoursSaved/1000)}k` : hoursSaved.toString()} 
                  icon={<Clock className="w-6 h-6" />}
                  color="indigo"
                  subtitle="Through Vibe-Code AI assistance"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Enhanced Size */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 mb-8 shadow-lg">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'top-users', label: 'Top Users', icon: TrendingUp },
              { id: 'inactive', label: 'Inactive Users', icon: AlertTriangle },
              { id: 'analytics', label: 'Analytics', icon: Users }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id as any)}
                className={`flex flex-col items-center gap-3 px-6 py-5 rounded-xl font-medium transition-all duration-200 ${
                  activeView === id 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl transform scale-105' 
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md hover:scale-102'
                }`}
              >
                <ModernIcon 
                  icon={<Icon className="w-4 h-4" />} 
                  color={activeView === id ? 'indigo' : 'blue'} 
                  size="xs" 
                />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Inactive Days Toggle */}
        {activeView === 'inactive' && (
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Inactive window:</span>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 shadow-sm">
              {[15, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => handleInactiveDaysChange(d as 15 | 30)}
                  disabled={inactiveLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2 ${
                    inactiveDays === d 
                      ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm" 
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {d} days
                  {inactiveLoading && inactiveDays === d && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300 font-medium">Error: {error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Content based on active view */}
            {activeView === 'overview' && (
              <div className="space-y-8">
                <GameifiedOverview users={users} />
              </div>
            )}

            {activeView === 'top-users' && (
              <div className="space-y-8">
                <UltraModernUserTable users={users} />
              </div>
            )}

            {activeView === 'inactive' && (
              <div className="space-y-8">
                <InactiveUsersTable 
                  users={inactive} 
                  inactiveDays={inactiveDays} 
                  onRefresh={() => fetchInactive(inactiveDays)}
                />
              </div>
            )}

            {activeView === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AnalyticsCard title="Feature Usage Distribution" users={users} />
                <AnalyticsCard title="Productivity Insights" users={users} type="productivity" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ModernIcon({ 
  icon, 
  color = 'blue', 
  size = 'sm' 
}: { 
  icon: React.ReactNode; 
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'indigo' | 'orange' | 'pink' | 'cyan';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const colorClasses = {
    blue: 'from-blue-500 via-blue-600 to-cyan-500',
    green: 'from-green-500 via-green-600 to-emerald-500',
    purple: 'from-purple-500 via-purple-600 to-violet-500',
    yellow: 'from-yellow-500 via-yellow-600 to-orange-500',
    indigo: 'from-indigo-500 via-indigo-600 to-blue-500',
    orange: 'from-orange-500 via-orange-600 to-red-500',
    pink: 'from-pink-500 via-pink-600 to-rose-500',
    cyan: 'from-cyan-500 via-cyan-600 to-teal-500'
  };

  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg', 
    lg: 'text-xl'
  };

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-r ${colorClasses[color]} rounded-xl flex items-center justify-center shadow-lg will-change-transform transition-all duration-300 hover:scale-110 hover:rotate-3`}>
      <div className={`text-white ${iconSizes[size]}`}>
        {icon}
      </div>
    </div>
  );
}

function ModernStatCard({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'indigo';
  subtitle: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 via-blue-600 to-cyan-500',
      bg: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      glow: 'shadow-blue-500/25',
      shimmer: 'from-blue-400/0 via-blue-400/40 to-blue-400/0'
    },
    green: {
      gradient: 'from-green-500 via-green-600 to-emerald-500',
      bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      text: 'text-green-600 dark:text-green-400',
      glow: 'shadow-green-500/25',
      shimmer: 'from-green-400/0 via-green-400/40 to-green-400/0'
    },
    purple: {
      gradient: 'from-purple-500 via-purple-600 to-violet-500',
      bg: 'from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20',
      text: 'text-purple-600 dark:text-purple-400',
      glow: 'shadow-purple-500/25',
      shimmer: 'from-purple-400/0 via-purple-400/40 to-purple-400/0'
    },
    yellow: {
      gradient: 'from-yellow-500 via-yellow-600 to-orange-500',
      bg: 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      glow: 'shadow-yellow-500/25',
      shimmer: 'from-yellow-400/0 via-yellow-400/40 to-yellow-400/0'
    },
    indigo: {
      gradient: 'from-indigo-500 via-indigo-600 to-blue-500',
      bg: 'from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      glow: 'shadow-indigo-500/25',
      shimmer: 'from-indigo-400/0 via-indigo-400/40 to-indigo-400/0'
    }
  };

  const currentColor = colorClasses[color];

  return (
    <div 
      className={`group relative overflow-hidden rounded-3xl will-change-transform cursor-pointer transition-all duration-700 ease-out ${
        isHovered ? `scale-105 ${currentColor.glow}` : 'scale-100'
      }`}
      style={{
        boxShadow: isHovered 
          ? `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)` 
          : `0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`,
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Background with GPU acceleration */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br ${currentColor.bg} will-change-transform`}
        style={{
          opacity: isHovered ? 1 : 0.8,
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      ></div>
      
      {/* Shimmer Effect - Optimized */}
      <div 
        className={`absolute inset-0 bg-gradient-to-r ${currentColor.shimmer} will-change-transform`}
        style={{
          transform: isHovered ? 'translateX(100%)' : 'translateX(-100%)',
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          transitionDelay: isHovered ? '0.1s' : '0s'
        }}
      ></div>
      
      {/* Border Glow - Smooth fade */}
      <div 
        className={`absolute inset-0 rounded-3xl border-2 border-transparent bg-gradient-to-r ${currentColor.gradient} will-change-transform`}
        style={{
          opacity: isHovered ? 0.3 : 0,
          transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      ></div>
      
      {/* Main Content with hardware acceleration */}
      <div className="relative p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl border border-white/20 dark:border-gray-700/30 will-change-transform">
        {/* Floating Icon - Optimized animations */}
        <div className="relative mb-6">
          <div 
            className={`w-16 h-16 bg-gradient-to-r ${currentColor.gradient} rounded-2xl flex items-center justify-center shadow-lg will-change-transform`}
            style={{
              transform: isHovered ? 'scale(1.1) rotate(3deg)' : 'scale(1) rotate(0deg)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div className="text-white text-xl">
              {icon}
            </div>
          </div>
          
          {/* Icon Glow - Smooth fade */}
          <div 
            className={`absolute inset-0 w-16 h-16 bg-gradient-to-r ${currentColor.gradient} rounded-2xl blur-xl will-change-transform`}
            style={{
              opacity: isHovered ? 0.4 : 0,
              transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          ></div>
          
          {/* Pulsing Ring - Controlled animation */}
          <div 
            className={`absolute inset-0 w-16 h-16 border-2 border-white/40 rounded-2xl will-change-transform`}
            style={{
              animation: isHovered ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
            }}
          ></div>
        </div>

        {/* Title with smooth scale */}
        <div className="mb-2">
          <h3 
            className={`text-sm font-bold ${currentColor.text} uppercase tracking-wider will-change-transform`}
            style={{
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {title}
          </h3>
        </div>

        {/* Value with smooth scale */}
        <div className="mb-3">
          <div 
            className={`text-4xl font-black bg-gradient-to-r ${currentColor.gradient} bg-clip-text text-transparent will-change-transform`}
            style={{
              transform: isHovered ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDelay: '0.05s'
            }}
          >
            {value}
          </div>
        </div>

        {/* Subtitle */}
        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {subtitle}
        </div>

        {/* Decorative Elements - Optimized */}
        <div className="absolute top-4 right-4 w-20 h-20 opacity-5 dark:opacity-10">
          <div 
            className={`w-full h-full bg-gradient-to-br ${currentColor.gradient} rounded-full blur-2xl will-change-transform`}
            style={{
              transform: isHovered ? 'scale(1.5)' : 'scale(1)',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          ></div>
        </div>
        
        {/* Bottom Accent - Smooth scale */}
        <div 
          className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${currentColor.gradient} will-change-transform`}
          style={{
            transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: 'left',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transitionDelay: '0.1s'
          }}
        ></div>
      </div>
    </div>
  );
}

function UserCard({ user, showLastActive = false }: { user: UsageMetric; showLastActive?: boolean }) {
  const productivityColor = (user.productivityScore || 0) >= 70 ? 'text-green-600 dark:text-green-400' : 
                           (user.productivityScore || 0) >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
  
  const productivityBgColor = (user.productivityScore || 0) >= 70 ? 'bg-green-500' : 
                             (user.productivityScore || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white truncate text-lg">{user.userName || "Unknown User"}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.userEmail}</p>
        </div>
        <div className="ml-4 text-right">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{user.totalRequests || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">requests</div>
        </div>
      </div>

      {/* Productivity Score Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Productivity Score</span>
          <span className={`text-sm font-bold ${productivityColor}`}>{user.productivityScore || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${productivityBgColor}`}
            style={{ width: `${Math.min(user.productivityScore || 0, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Feature Usage</div>
        <div className="flex flex-wrap gap-2">
          {(user.composerRequests || 0) > 0 && (
            <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
              <Code className="w-3 h-3" />
              <span>Composer: {user.composerRequests}</span>
            </div>
          )}
          {(user.chatRequests || 0) > 0 && (
            <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium">
              <MessageSquare className="w-3 h-3" />
              <span>Chat: {user.chatRequests}</span>
            </div>
          )}
          {(user.agentRequests || 0) > 0 && (
            <div className="flex items-center space-x-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-medium">
              <Bot className="w-3 h-3" />
              <span>Agent: {user.agentRequests}</span>
            </div>
          )}
        </div>
        {user.mostUsedModel && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
            Model: {user.mostUsedModel}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{user.acceptanceRate || 0}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Acceptance Rate</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{user.activeDays || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Active Days</div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Accepted Lines: <span className="font-medium text-gray-700 dark:text-gray-300">{user.acceptedLines || 0}</span></div>
        <div>Total Lines: <span className="font-medium text-gray-700 dark:text-gray-300">{user.totalLines || 0}</span></div>
      </div>

      {/* Last Active (only for inactive users) */}
      {showLastActive && user.lastActiveAt && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <div>
              <div className="font-medium">{formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true })}</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">{format(new Date(user.lastActiveAt), "PPp")}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserCardGrid({ title, users, showLastActive = false }: { title: string; users: UsageMetric[]; showLastActive?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-medium">
          {users.length} users
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {users.map((user) => (
          <UserCard 
            key={`${user.userId}:${user.userEmail}`} 
            user={user} 
            showLastActive={showLastActive}
          />
        ))}
      </div>
    </div>
  );
}

function GameifiedOverview({ users }: { users: UsageMetric[] }) {
  const [showPopup, setShowPopup] = useState<'composer' | 'chat' | 'agent' | null>(null);
  // Advanced ranking algorithm combining requests, score, and active days
  const calculateOverallRank = (user: UsageMetric) => {
    const requests = user.totalRequests || 0;
    const productivityScore = user.productivityScore || 0;
    const activeDays = user.activeDays || 0;
    
    // Normalize each metric (0-100 scale)
    const maxRequests = Math.max(...users.map(u => u.totalRequests || 0));
    const normalizedRequests = maxRequests > 0 ? (requests / maxRequests) * 100 : 0;
    
    const normalizedProductivity = productivityScore; // Already 0-100
    
    const maxActiveDays = Math.max(...users.map(u => u.activeDays || 0));
    const normalizedActiveDays = maxActiveDays > 0 ? (activeDays / maxActiveDays) * 100 : 0;
    
    // Weighted combination: 40% requests, 35% productivity, 25% active days
    const overallScore = (normalizedRequests * 0.4) + (normalizedProductivity * 0.35) + (normalizedActiveDays * 0.25);
    
    return overallScore;
  };

  const sortedUsers = [...users]
    .map(user => ({
      ...user,
      overallRank: calculateOverallRank(user)
    }))
    .sort((a, b) => b.overallRank - a.overallRank);
    
  const topPerformers = sortedUsers.slice(0, 10);
  
  // Calculate amazing stats
  const totalAIInteractions = users.reduce((sum, u) => sum + (u.totalRequests || 0), 0);
  const totalLinesGenerated = users.reduce((sum, u) => sum + (u.totalLinesAdded || 0), 0);
  const totalAcceptedLines = users.reduce((sum, u) => sum + (u.acceptedLinesAdded || 0), 0);
  const avgAcceptanceRate = users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.acceptanceRate || 0), 0) / users.length) : 0;
  const activeUsers = users.filter(u => (u.totalRequests || 0) > 0).length;
  
  // Feature usage stats
  const composerUsers = users.filter(u => (u.composerRequests || 0) > 0).length;
  const chatUsers = users.filter(u => (u.chatRequests || 0) > 0).length;
  const agentUsers = users.filter(u => (u.agentRequests || 0) > 0).length;
  
  // Top 10 lists for each feature
  const topComposerUsers = [...users]
    .filter(u => (u.composerRequests || 0) > 0)
    .sort((a, b) => (b.composerRequests || 0) - (a.composerRequests || 0))
    .slice(0, 10);
    
  const topChatUsers = [...users]
    .filter(u => (u.chatRequests || 0) > 0)
    .sort((a, b) => (b.chatRequests || 0) - (a.chatRequests || 0))
    .slice(0, 10);
    
  const topAgentUsers = [...users]
    .filter(u => (u.agentRequests || 0) > 0)
    .sort((a, b) => (b.agentRequests || 0) - (a.agentRequests || 0))
    .slice(0, 10);
  
  // Achievements
  const achievements = [
    { icon: Crown, title: "AI Royalty", count: users.filter(u => (u.totalRequests || 0) > 1000).length, color: "from-yellow-400 to-orange-500" },
    { icon: Rocket, title: "Code Rockets", count: users.filter(u => (u.acceptedLinesAdded || 0) > 500).length, color: "from-blue-400 to-purple-500" },
    { icon: Flame, title: "Hot Streakers", count: users.filter(u => (u.activeDays || 0) > 20).length, color: "from-red-400 to-pink-500" },
    { icon: Brain, title: "AI Masters", count: users.filter(u => (u.acceptanceRate || 0) > 80).length, color: "from-green-400 to-teal-500" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Stats Section - Amagi Blue Theme */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 rounded-3xl p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 animate-pulse" />
              <h2 className="text-4xl font-bold">Amagi Cursor Analytics</h2>
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <p className="text-xl opacity-90">Powering the Future of Video Technology 🚀</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{totalAIInteractions.toLocaleString()}</div>
              <div className="text-sm opacity-80 flex items-center justify-center gap-1">
                <Zap className="w-4 h-4" />
                AI Interactions
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{totalLinesGenerated.toLocaleString()}</div>
              <div className="text-sm opacity-80 flex items-center justify-center gap-1">
                <Code className="w-4 h-4" />
                Lines Generated
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{avgAcceptanceRate}%</div>
              <div className="text-sm opacity-80 flex items-center justify-center gap-1">
                <Target className="w-4 h-4" />
                Avg Acceptance
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{activeUsers}</div>
              <div className="text-sm opacity-80 flex items-center justify-center gap-1">
                <Users className="w-4 h-4" />
                Active Engineers
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-4 right-4 animate-bounce">
          <Rocket className="w-12 h-12 opacity-20" />
        </div>
        <div className="absolute bottom-4 left-4 animate-pulse">
          <Brain className="w-10 h-10 opacity-20" />
        </div>
      </div>



      {/* Feature Adoption */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <ModernIcon icon={<Activity className="w-5 h-5" />} color="purple" size="sm" />
          AI Feature Galaxy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onClick={() => setShowPopup('composer')}
            className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <Code className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{composerUsers}</span>
        </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Composer Champions</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Code generation specialists</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">👆 Click to see top 10</p>
            <div className="absolute -bottom-2 -right-2 opacity-10">
              <Code className="w-16 h-16" />
            </div>
          </div>
          
          <div 
            onClick={() => setShowPopup('chat')}
            className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="w-8 h-8 text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{chatUsers}</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Chat Experts</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">AI conversation specialists</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">👆 Click to see top 10</p>
            <div className="absolute -bottom-2 -right-2 opacity-10">
              <MessageSquare className="w-16 h-16" />
            </div>
          </div>
          
          <div 
            onClick={() => setShowPopup('agent')}
            className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-4">
              <Bot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{agentUsers}</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Agent Engineers</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">AI automation specialists</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">👆 Click to see top 10</p>
            <div className="absolute -bottom-2 -right-2 opacity-10">
              <Bot className="w-16 h-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Champions Leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <ModernIcon icon={<Trophy className="w-5 h-5" />} color="yellow" size="sm" />
          Engineering Excellence Board
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">Top Performing Engineers</span>
        </h3>
        
        <div className="space-y-4">
          {topPerformers.slice(0, 10).map((user, index) => {
            const rankIcons = [Crown, Medal, Award, Star, Sparkles, Trophy, Target, Rocket, Brain, Flame];
            const RankIcon = rankIcons[index] || Star;
            const rankColors = [
              "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30",
              "text-gray-400 bg-gray-100 dark:bg-gray-700/50", 
              "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
              "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
              "text-purple-500 bg-purple-100 dark:bg-purple-900/30",
              "text-green-500 bg-green-100 dark:bg-green-900/30",
              "text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30",
              "text-pink-500 bg-pink-100 dark:bg-pink-900/30",
              "text-red-500 bg-red-100 dark:bg-red-900/30",
              "text-orange-500 bg-orange-100 dark:bg-orange-900/30"
            ];
            
            return (
              <div key={user.userEmail} className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className={`w-12 h-12 rounded-xl ${rankColors[index]} flex items-center justify-center mr-4 flex-shrink-0`}>
                  <RankIcon className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900 dark:text-white text-lg">#{index + 1}</span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate">
                      {user.userName || "Amagi Engineer"}
                    </span>
                    {index === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.userEmail}</div>
                </div>
                
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {(user.totalRequests || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Requests</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      (user.productivityScore || 0) >= 70 ? 'text-green-600 dark:text-green-400' : 
                      (user.productivityScore || 0) >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {user.productivityScore || 0}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Productivity</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {user.activeDays || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Days Active</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-xl font-bold text-gradient bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                      {Math.round(user.overallRank || 0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Overall Rank</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            🎯 "Powering the new video economy through innovation" - Amagi Engineering Team
          </p>
        </div>
      </div>
      
      {/* Feature Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showPopup === 'composer' && <ModernIcon icon={<Code className="w-5 h-5" />} color="blue" size="sm" />}
                {showPopup === 'chat' && <ModernIcon icon={<MessageSquare className="w-5 h-5" />} color="green" size="sm" />}
                {showPopup === 'agent' && <ModernIcon icon={<Bot className="w-5 h-5" />} color="purple" size="sm" />}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {showPopup === 'composer' && 'Top 10 Composer Champions'}
                  {showPopup === 'chat' && 'Top 10 Chat Experts'}
                  {showPopup === 'agent' && 'Top 10 Agent Engineers'}
                </h3>
              </div>
              <button
                onClick={() => setShowPopup(null)}
                className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {(showPopup === 'composer' ? topComposerUsers : 
                  showPopup === 'chat' ? topChatUsers : topAgentUsers).map((user, index) => (
                  <div key={user.userEmail} className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 text-white font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                      index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                      'bg-gradient-to-r from-indigo-500 to-purple-600'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.userName || "Amagi Engineer"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {user.userEmail}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-xl font-bold ${
                        showPopup === 'composer' ? 'text-blue-600 dark:text-blue-400' :
                        showPopup === 'chat' ? 'text-green-600 dark:text-green-400' :
                        'text-purple-600 dark:text-purple-400'
                      }`}>
                        {showPopup === 'composer' ? user.composerRequests :
                         showPopup === 'chat' ? user.chatRequests :
                         user.agentRequests}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {showPopup === 'composer' ? 'Composer' :
                         showPopup === 'chat' ? 'Chat' :
                         'Agent'} requests
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UltraModernUserTable({ users }: { users: UsageMetric[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'rank' | 'requests' | 'productivity' | 'composer' | 'chat' | 'agent' | 'acceptance' | 'activeDays'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<UsageMetric | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Advanced ranking algorithm
  const calculateOverallRank = (user: UsageMetric) => {
    const requests = user.totalRequests || 0;
    const productivityScore = user.productivityScore || 0;
    const activeDays = user.activeDays || 0;
    
    const maxRequests = Math.max(...users.map(u => u.totalRequests || 0));
    const normalizedRequests = maxRequests > 0 ? (requests / maxRequests) * 100 : 0;
    const normalizedProductivity = productivityScore;
    const maxActiveDays = Math.max(...users.map(u => u.activeDays || 0));
    const normalizedActiveDays = maxActiveDays > 0 ? (activeDays / maxActiveDays) * 100 : 0;
    
    return (normalizedRequests * 0.4) + (normalizedProductivity * 0.35) + (normalizedActiveDays * 0.25);
  };

  // Filter and sort users
  const filteredUsers = users.filter(user => 
    user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = [...filteredUsers]
    .map(user => ({ ...user, overallRank: calculateOverallRank(user) }))
    .sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'rank': aVal = a.overallRank; bVal = b.overallRank; break;
        case 'requests': aVal = a.totalRequests || 0; bVal = b.totalRequests || 0; break;
        case 'productivity': aVal = a.productivityScore || 0; bVal = b.productivityScore || 0; break;
        case 'composer': aVal = a.composerRequests || 0; bVal = b.composerRequests || 0; break;
        case 'chat': aVal = a.chatRequests || 0; bVal = b.chatRequests || 0; break;
        case 'agent': aVal = a.agentRequests || 0; bVal = b.agentRequests || 0; break;
        case 'acceptance': aVal = a.acceptanceRate || 0; bVal = b.acceptanceRate || 0; break;
        case 'activeDays': aVal = a.activeDays || 0; bVal = b.activeDays || 0; break;
        default: aVal = a.overallRank; bVal = b.overallRank;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getTopPerformanceMetric = (user: UsageMetric) => {
    const metrics = [
      { name: 'Composer', value: user.composerRequests || 0, color: 'text-blue-600 dark:text-blue-400' },
      { name: 'Chat', value: user.chatRequests || 0, color: 'text-green-600 dark:text-green-400' },
      { name: 'Agent', value: user.agentRequests || 0, color: 'text-purple-600 dark:text-purple-400' }
    ];
    return metrics.sort((a, b) => b.value - a.value)[0];
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    if (index < 10) return '🏆';
    if (index < 25) return '⭐';
    return '👤';
  };

  const getRiskLevel = (user: UsageMetric & { overallRank: number }) => {
    const score = user.overallRank;
    if (score > 70) return { level: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' };
    if (score > 50) return { level: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-300' };
    if (score > 30) return { level: 'Average', color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-300' };
    return { level: 'Needs Focus', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Amagi Cursor Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Cursor Vibe Coder Productivity
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Grid View
            </button>
          </div>
        </div>
      </div>

      {/* Ultra-Modern Search and Filters */}
      <div className="relative">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 rounded-3xl blur-xl"></div>
        
        <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-gray-700/30 p-8 shadow-2xl">
          {/* Search Section */}
          <div className="mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative flex items-center">
                <div className="absolute left-4 z-10">
                  <ModernIcon icon={<Search className="w-4 h-4" />} color="blue" size="xs" />
                </div>
                <input
                  type="text"
                  placeholder="🔍 Search Amagi engineers by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-16 pr-6 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-lg font-medium placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 shadow-lg"
                />
                <div className="absolute right-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                    <span>{filteredUsers.length}</span>
                    <span>results</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                <ModernIcon icon={<Target className="w-4 h-4" />} color="indigo" size="xs" />
                Sort & Filter
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Sorted by</span>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                  {sortBy === 'rank' ? 'Overall Rank' : 
                   sortBy === 'requests' ? 'Total Requests' :
                   sortBy === 'productivity' ? 'Productivity' :
                   sortBy === 'composer' ? 'Composer' :
                   sortBy === 'chat' ? 'Chat' :
                   sortBy === 'agent' ? 'Agent' : 'Default'}
                  {sortOrder === 'desc' ? ' ↓' : ' ↑'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { key: 'rank', label: 'Overall Rank', icon: <Trophy className="w-5 h-5" />, color: 'yellow' },
                { key: 'requests', label: 'Total Requests', icon: <Zap className="w-5 h-5" />, color: 'blue' },
                { key: 'productivity', label: 'Productivity', icon: <TrendingUp className="w-5 h-5" />, color: 'green' },
                { key: 'composer', label: 'Composer', icon: <Code className="w-5 h-5" />, color: 'purple' },
                { key: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" />, color: 'pink' },
                { key: 'agent', label: 'Agent', icon: <Bot className="w-5 h-5" />, color: 'indigo' }
              ].map(({ key, label, icon, color }) => (
                <button
                  key={key}
                  onClick={() => handleSort(key as typeof sortBy)}
                  className={`relative group overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-105 ${
                    sortBy === key
                      ? 'shadow-xl ring-2 ring-blue-500/30'
                      : 'shadow-md hover:shadow-lg'
                  }`}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px)',
                    border: sortBy === key 
                      ? `2px solid ${
                          color === 'yellow' ? '#f59e0b' :
                          color === 'blue' ? '#3b82f6' :
                          color === 'green' ? '#10b981' :
                          color === 'purple' ? '#8b5cf6' :
                          color === 'pink' ? '#ec4899' :
                          '#6366f1'
                        }`
                      : '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <div className="relative flex flex-col items-center gap-3">
                    <div className="relative">
                      <ModernIcon 
                        icon={icon} 
                        color={color as any} 
                        size="sm" 
                      />
                      {sortBy === key && (
                        <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white`}
                          style={{
                            background: color === 'yellow' ? '#f59e0b' :
                                       color === 'blue' ? '#3b82f6' :
                                       color === 'green' ? '#10b981' :
                                       color === 'purple' ? '#8b5cf6' :
                                       color === 'pink' ? '#ec4899' :
                                       '#6366f1'
                          }}
                        >
                          <span className="text-white text-xs font-bold">
                            {sortOrder === 'desc' ? '↓' : '↑'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <span className={`text-sm font-bold transition-colors text-center ${
                      sortBy === key 
                        ? (() => {
                            switch(color) {
                              case 'yellow': return 'text-yellow-600 dark:text-yellow-400';
                              case 'blue': return 'text-blue-600 dark:text-blue-400';
                              case 'green': return 'text-green-600 dark:text-green-400';
                              case 'purple': return 'text-purple-600 dark:text-purple-400';
                              case 'pink': return 'text-pink-600 dark:text-pink-400';
                              default: return 'text-indigo-600 dark:text-indigo-400';
                            }
                          })()
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {label}
                    </span>
                  </div>
                  
                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    style={{
                      background: `linear-gradient(135deg, ${
                        color === 'yellow' ? '#fbbf24, #f59e0b' :
                        color === 'blue' ? '#3b82f6, #06b6d4' :
                        color === 'green' ? '#10b981, #059669' :
                        color === 'purple' ? '#8b5cf6, #7c3aed' :
                        color === 'pink' ? '#ec4899, #db2777' :
                        '#6366f1, #4f46e5'
                      })`
                    }}
                  ></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ultra Modern Table */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Engineer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Performance</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Features</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Productivity</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedUsers.slice(0, 100).map((user, index) => {
                  const topMetric = getTopPerformanceMetric(user);
                  const risk = getRiskLevel(user);
                  
                  return (
                    <tr 
                      key={user.userEmail}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 cursor-pointer group"
                      onClick={() => setSelectedUser(user)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getRankIcon(index)}</span>
                          <div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">#{index + 1}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Score: {user.overallRank.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                            {(user.userName || user.userEmail).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {user.userName || "Amagi Engineer"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-48">
                              {user.userEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Overall</span>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                              {user.overallRank.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(user.overallRank, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Total Requests</span>
                            <span className="font-bold text-gray-900 dark:text-white">{user.totalRequests || 0}</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Composer</div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{user.composerRequests || 0}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-green-600 dark:text-green-400 font-medium">Chat</div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{user.chatRequests || 0}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Agent</div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">{user.agentRequests || 0}</div>
                            </div>
                          </div>
                          
                          <div className={`text-xs ${topMetric.color} text-center`}>
                            Top: {topMetric.name} ({topMetric.value})
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Score</span>
                            <span className="font-bold text-gray-900 dark:text-white">{user.productivityScore || 0}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Acceptance</span>
                            <span className="font-bold text-gray-900 dark:text-white">{user.acceptanceRate || 0}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Lines</span>
                            <span className="font-bold text-green-600 dark:text-green-400">{user.acceptedLinesAdded || 0}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.activeDays || 0} days
                            </span>
                          </div>
                          {user.lastActiveAt && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Last: {formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${risk.color}`}></div>
                          <span className={`text-sm font-medium ${risk.textColor}`}>
                            {risk.level}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ultra Modern Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedUsers.slice(0, 100).map((user, index) => {
            const topMetric = getTopPerformanceMetric(user);
            const risk = getRiskLevel(user);
            
            return (
              <div
                key={user.userEmail}
                onClick={() => setSelectedUser(user)}
                className="group relative bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg hover:shadow-2xl border border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Rank Badge */}
                <div className="absolute -top-2 -right-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-lg">{getRankIcon(index)}</span>
                  </div>
                </div>

                {/* User Avatar and Info */}
                <div className="relative mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                      {(user.userName || user.userEmail).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {user.userName || "Amagi Engineer"}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        #{index + 1} • {user.userEmail.split('@')[0]}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Score */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Performance</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                      {user.overallRank.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(user.overallRank, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* AI Features Grid */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">AI Feature Usage</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <Code className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {user.composerRequests || 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Composer</div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {user.chatRequests || 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Chat</div>
                    </div>
                    
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                      <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {user.agentRequests || 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Agent</div>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {user.totalRequests || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {user.productivityScore || 0}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Productivity</div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Acceptance Rate</span>
                    <span className="font-medium text-gray-900 dark:text-white">{user.acceptanceRate || 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Active Days</span>
                    <span className="font-medium text-gray-900 dark:text-white">{user.activeDays || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Lines Accepted</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{user.acceptedLinesAdded || 0}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${risk.color}`}></div>
                    <span className={`text-sm font-medium ${risk.textColor}`}>
                      {risk.level}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${topMetric.color} bg-gray-100 dark:bg-gray-700`}>
                      Top: {topMetric.name}
                    </span>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 rounded-3xl transition-all duration-300 pointer-events-none"></div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
                  {(selectedUser.userName || selectedUser.userEmail).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedUser.userName || "Amagi Engineer"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{selectedUser.userEmail}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Summary */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Overview</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{calculateOverallRank(selectedUser).toFixed(1)}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Overall Rank</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedUser.totalRequests || 0}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Requests</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedUser.productivityScore || 0}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Productivity</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{selectedUser.activeDays || 0}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Active Days</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Detailed Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <Code className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        <h5 className="font-semibold text-gray-900 dark:text-white">Composer</h5>
                      </div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                        {selectedUser.composerRequests || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Requests</div>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <MessageSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
                        <h5 className="font-semibold text-gray-900 dark:text-white">Chat</h5>
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                        {selectedUser.chatRequests || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Requests</div>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        <h5 className="font-semibold text-gray-900 dark:text-white">Agent</h5>
                      </div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                        {selectedUser.agentRequests || 0}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Requests</div>
                    </div>
                  </div>
                </div>
                
                {/* Side Stats */}
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Code Metrics</h5>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Acceptance Rate</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedUser.acceptanceRate || 0}%</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Lines Added</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedUser.totalLinesAdded || 0}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Lines Accepted</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{selectedUser.acceptedLinesAdded || 0}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Tab Accepts</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedUser.totalTabsAccepted || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Usage Pattern</h5>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Most Used Model</span>
                          <span className="font-medium text-gray-900 dark:text-white text-xs">
                            {selectedUser.mostUsedModel || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">CMD+K Usage</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedUser.cmdkUsages || 0}</span>
                        </div>
                      </div>
                      {selectedUser.lastActiveAt && (
                        <div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Last Active</span>
                            <span className="font-medium text-gray-900 dark:text-white text-xs">
                              {formatDistanceToNow(new Date(selectedUser.lastActiveAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InactiveUsersTable({ users, inactiveDays, onRefresh }: { users: UsageMetric[]; inactiveDays: 15 | 30; onRefresh: () => void }) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'lastActive' | 'requests' | 'name'>('lastActive');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredUsers = users.filter(user => 
    user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case 'lastActive':
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return aTime - bTime; // Oldest first
      case 'requests':
        return (a.totalRequests || 0) - (b.totalRequests || 0); // Lowest first
      case 'name':
        return (a.userName || a.userEmail).localeCompare(b.userName || b.userEmail);
      default:
        return 0;
    }
  });

  const toggleUser = (userEmail: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userEmail)) {
      newSelected.delete(userEmail);
    } else {
      newSelected.add(userEmail);
    }
    setSelectedUsers(newSelected);
  };

  const selectAll = () => {
    if (selectedUsers.size === sortedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(sortedUsers.map(u => u.userEmail)));
    }
  };

  const handleSortChange = async (newSort: 'lastActive' | 'requests' | 'name') => {
    setSortBy(newSort);
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const exportSelected = () => {
    const selectedData = sortedUsers.filter(u => selectedUsers.has(u.userEmail));
    const csv = Papa.unparse(selectedData.map(u => ({
      name: u.userName || "Unknown",
      email: u.userEmail,
      totalRequests: u.totalRequests || 0,
      lastActiveAt: u.lastActiveAt || "Never",
      inactiveDays: inactiveDays,
      recommendation: "DEACTIVATE"
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inactive-users-${inactiveDays}d-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              ⚠️ License Deactivation Center
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {users.length} users inactive for {inactiveDays}+ days • Select users to deactivate
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as 'lastActive' | 'requests' | 'name')}
                disabled={isRefreshing}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="lastActive">Sort by Last Active</option>
                <option value="requests">Sort by Requests</option>
                <option value="name">Sort by Name</option>
              </select>
              {isRefreshing && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {selectedUsers.size > 0 && (
          <div className="mt-4 flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="font-medium text-red-800 dark:text-red-300">
                {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected for deactivation
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                Clear
              </button>
              <button
                onClick={exportSelected}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === sortedUsers.length && sortedUsers.length > 0}
                  onChange={selectAll}
                  className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Requests
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Active
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Risk Level
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedUsers.map((user) => {
              const daysSinceActive = user.lastActiveAt 
                ? Math.floor((Date.now() - new Date(user.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24))
                : 999;
              
              const riskLevel = daysSinceActive > 60 ? 'High' : daysSinceActive > 30 ? 'Medium' : 'Low';
              const riskColor = riskLevel === 'High' ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30' :
                              riskLevel === 'Medium' ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30' :
                              'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';

              return (
                <tr 
                  key={user.userEmail}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedUsers.has(user.userEmail) ? 'bg-red-50 dark:bg-red-900/10' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.userEmail)}
                      onChange={() => toggleUser(user.userEmail)}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.userName || "Unknown User"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.userEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.totalRequests || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {user.lastActiveAt ? (
                        <div>
                          <div>{formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true })}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(user.lastActiveAt), "MMM d, yyyy")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Never</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${riskColor}`}>
                      {riskLevel} Risk
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {sortedUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No users found matching your search.' : 'No inactive users found.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MinimalUserList({ title, users }: { title: string; users: UsageMetric[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <span className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 px-3 py-1 rounded-full text-sm font-medium">
          {users.length} users
        </span>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {users.map((user, index) => (
          <div 
            key={`${user.userId}:${user.userEmail}`}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-sm font-bold">
                {index + 26}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {user.userName || "Unknown User"}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {user.userEmail}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {user.totalRequests || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">requests</div>
              </div>
              {(user.productivityScore !== undefined) && (
                <div className="text-center">
                  <div className={`text-sm font-bold ${
                    (user.productivityScore || 0) >= 70 ? 'text-green-600 dark:text-green-400' : 
                    (user.productivityScore || 0) >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {user.productivityScore || 0}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">productivity</div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsCard({ title, users, type = 'features' }: { title: string; users: UsageMetric[]; type?: 'features' | 'productivity' }) {
  const totalComposer = users.reduce((sum, u) => sum + (u.composerRequests || 0), 0);
  const totalChat = users.reduce((sum, u) => sum + (u.chatRequests || 0), 0);
  const totalAgent = users.reduce((sum, u) => sum + (u.agentRequests || 0), 0);
  
  const highProductivity = users.filter(u => (u.productivityScore || 0) >= 70).length;
  const mediumProductivity = users.filter(u => (u.productivityScore || 0) >= 40 && (u.productivityScore || 0) < 70).length;
  const lowProductivity = users.filter(u => (u.productivityScore || 0) < 40).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{title}</h3>
      
      {type === 'features' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-center space-x-3">
              <ModernIcon icon={<Code className="w-4 h-4" />} color="blue" size="xs" />
              <span className="font-medium text-gray-900 dark:text-white">Composer Requests</span>
            </div>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalComposer.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <div className="flex items-center space-x-3">
              <ModernIcon icon={<MessageSquare className="w-4 h-4" />} color="green" size="xs" />
              <span className="font-medium text-gray-900 dark:text-white">Chat Requests</span>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{totalChat.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <div className="flex items-center space-x-3">
              <ModernIcon icon={<Bot className="w-4 h-4" />} color="purple" size="xs" />
              <span className="font-medium text-gray-900 dark:text-white">Agent Requests</span>
            </div>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalAgent.toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <div className="flex items-center space-x-3">
              <ModernIcon icon={<TrendingUp className="w-4 h-4" />} color="green" size="xs" />
              <span className="font-medium text-gray-900 dark:text-white">High Productivity (&ge;70%)</span>
            </div>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{highProductivity}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <div className="flex items-center space-x-3">
              <ModernIcon icon={<Activity className="w-4 h-4" />} color="yellow" size="xs" />
              <span className="font-medium text-gray-900 dark:text-white">Medium Productivity (40-69%)</span>
            </div>
            <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{mediumProductivity}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <div className="flex items-center space-x-3">
              <ModernIcon icon={<AlertTriangle className="w-4 h-4" />} color="orange" size="xs" />
              <span className="font-medium text-gray-900 dark:text-white">Low Productivity (&lt;40%)</span>
            </div>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{lowProductivity}</span>
          </div>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  ArrowLeft,
  MousePointerClick,
  Calendar,
  Globe,
  ExternalLink,
  BarChart3,
  Link2,
  RefreshCw,
} from 'lucide-react';
import { analyticsApi } from '../services/analyticsApi';
import { urlApi } from '../services/urlApi';
import Loader from '../components/common/Loader';
import {
  formatNumber,
  formatDate,
  truncateUrl,
} from '../utils/formatters';
import toast from 'react-hot-toast';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function AnalyticsPage() {
  const { shortCode } = useParams();
  if (!shortCode) return <AnalyticsPicker />;
  return <AnalyticsDetail shortCode={shortCode} />;
}

/* ─────────────────────────────────────────
   PICKER
   ───────────────────────────────────────── */
function AnalyticsPicker() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await urlApi.list({ page: 1, limit: 50 });
        setUrls(res.data.urls);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container-app py-10 max-w-3xl">
      <div className="mb-8">
        <Link to="/dashboard" className="btn-ghost -ml-2 mb-4 inline-flex">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-ink-400 text-sm">
          Pick a short URL to see its detailed analytics
        </p>
      </div>

      {loading ? (
        <div className="py-20">
          <Loader label="Loading your URLs..." />
        </div>
      ) : urls.length === 0 ? (
        <div className="glass p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-ink-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No URLs yet</h3>
          <p className="text-ink-400 text-sm mb-6">
            Create your first short link to start tracking analytics
          </p>
          <Link to="/dashboard" className="btn-primary inline-flex">
            <Link2 className="w-4 h-4" /> Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {urls.map((url) => (
            <motion.button
              key={url.shortCode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/analytics/${url.shortCode}`)}
              className="glass-hover p-5 w-full text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-brand-300 truncate">
                    /{url.shortCode}
                  </div>
                  <div className="text-xs text-ink-500 truncate mt-0.5">
                    {truncateUrl(url.longUrl, 60)}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold flex items-center gap-1.5 justify-end">
                    {formatNumber(url.clickCount)}
                    {url.pendingClicks > 0 && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                        title={`${url.pendingClicks} pending`}
                      />
                    )}
                  </div>
                  <div className="text-xs text-ink-500">clicks</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   DETAIL
   ───────────────────────────────────────── */
function AnalyticsDetail({ shortCode }) {
  const [url, setUrl] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [urlRes, analyticsRes] = await Promise.all([
        urlApi.get(shortCode),
        analyticsApi.get(shortCode, days),
      ]);
      setUrl(urlRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      if (!silent) toast.error(err.message || 'Failed to load analytics');
    } finally {
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  };

  // Initial load + on shortCode/days change
  useEffect(() => {
    fetchAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortCode, days]);

  // Auto-refresh every 15s when tab visible
  useEffect(() => {
    if (!autoRefresh) return;

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAll(true);
      }
    }, 15000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, shortCode, days]);

  if (loading && !analytics) {
    return (
      <div className="container-app py-20">
        <Loader size="lg" label="Loading analytics..." />
      </div>
    );
  }

  if (!url || !analytics) {
    return (
      <div className="container-app py-20 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-ink-600 mb-4" />
        <p className="text-ink-400 mb-6">
          Analytics not found for "{shortCode}"
        </p>
        <Link to="/analytics" className="btn-primary inline-flex">
          <ArrowLeft className="w-4 h-4" /> Pick another URL
        </Link>
      </div>
    );
  }

  const hasPending = analytics.pendingClicks > 0;

  return (
    <div className="container-app py-10">
      {/* Header */}
      <div className="mb-8">
        <Link to="/dashboard" className="btn-ghost -ml-2 mb-4 inline-flex">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2">Analytics</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={url.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm text-brand-300 hover:text-brand-200 flex items-center gap-1.5"
              >
                {url.shortUrl} <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-ink-600">→</span>
              <span className="text-ink-400 text-sm truncate max-w-md">
                {url.longUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-ink-800/50 text-ink-400 border-ink-700'
              }`}
              title="Toggle auto-refresh every 15s"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-ink-500'
                }`}
              />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>

            {/* Manual refresh */}
            <button
              onClick={() => fetchAll(true)}
              disabled={refreshing}
              className="btn-ghost p-2"
              title="Refresh now"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Time range selector */}
      <div className="flex gap-2 mb-8">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={
              days === d
                ? 'px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                : 'px-4 py-2 rounded-xl text-sm font-medium bg-ink-800/50 text-ink-300 hover:bg-ink-800 border border-ink-700'
            }
          >
            {d} days
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          icon={MousePointerClick}
          label={
            <>
              Total Clicks
              {hasPending && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1"
                  title={`+${analytics.pendingClicks} pending`}
                />
              )}
            </>
          }
          value={formatNumber(analytics.totalClicks)}
          color="brand"
        />
        <KpiCard
          icon={MousePointerClick}
          label={`Clicks (${days}d)`}
          value={formatNumber(analytics.clicksInPeriod)}
          color="accent"
        />
        <KpiCard
          icon={Calendar}
          label="Last Click"
          value={
            analytics.lastAccessedAt
              ? formatDate(analytics.lastAccessedAt)
              : 'Never'
          }
          color="emerald"
          small
        />
        <KpiCard
          icon={Globe}
          label="Countries"
          value={analytics.byCountry.length || 0}
          color="amber"
        />
      </div>

      {/* Pending debug strip (only when pending > 0) */}
      {hasPending && (
        <div className="mb-6 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {analytics.pendingClicks} click(s) pending flush — total updates in
            real-time
          </span>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Clicks over time">
          {analytics.byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={analytics.byDay}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#lineGrad)"
                  strokeWidth={2.5}
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No clicks in this period" />
          )}
        </ChartCard>

        <ChartCard title="Clicks by device">
          {analytics.byDevice.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={analytics.byDevice}
                  dataKey="count"
                  nameKey="device"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  label={(entry) => `${entry.device}: ${entry.count}`}
                >
                  {analytics.byDevice.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No device data" />
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Top countries">
          {analytics.byCountry.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics.byCountry} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="country"
                  stroke="#64748b"
                  fontSize={11}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No country data yet" />
          )}
        </ChartCard>

        <ChartCard title="Top referrers">
          {analytics.topReferers.length > 0 ? (
            <div className="space-y-2 mt-2">
              {analytics.topReferers.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-ink-800/50 border border-ink-700"
                >
                  <span className="text-sm text-ink-300 truncate max-w-xs">
                    {r.referer}
                  </span>
                  <span className="text-sm font-semibold text-brand-400">
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart label="No referrer data" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SHARED UI
   ───────────────────────────────────────── */
const tooltipStyle = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '12px',
  padding: '8px 12px',
  color: '#f1f5f9',
  fontSize: 12,
};

function KpiCard({ icon: Icon, label, value, color, small }) {
  const colors = {
    brand: 'from-brand-500/20 to-brand-500/5 border-brand-500/30 text-brand-400',
    accent: 'from-accent/20 to-accent/5 border-accent/30 text-accent',
    emerald:
      'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-5"
    >
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} border flex items-center justify-center mb-3`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className={small ? 'text-lg font-bold' : 'text-2xl font-bold'}>
        {value}
      </div>
      <div className="text-xs text-ink-500 mt-1">{label}</div>
    </motion.div>
  );
}

function ChartCard({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-5"
    >
      <h3 className="font-semibold mb-4 text-sm">{title}</h3>
      {children}
    </motion.div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="h-[260px] flex items-center justify-center text-ink-500 text-sm">
      {label}
    </div>
  );
}
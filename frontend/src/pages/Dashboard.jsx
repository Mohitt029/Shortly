import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MousePointerClick, Link2, Calendar, TrendingUp, Search, Plus,
} from 'lucide-react';
import { useUrls } from '../hooks/useUrls';
import { useDebounce } from '../hooks/useDebounce';
import UrlList from '../components/url/UrlList';
import UrlShortenerForm from '../components/url/UrlShortenerForm';
import { formatNumber, cn } from '../utils/formatters';

export default function Dashboard() {
  const { urls, loading, refresh, deleteUrl } = useUrls();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const debouncedSearch = useDebounce(search, 200);

  const stats = useMemo(() => {
    const total = urls.length;
    const clicks = urls.reduce((sum, u) => sum + (u.clickCount || 0), 0);
    const active = urls.filter((u) => !u.isExpired && u.isActive).length;
    const expiring = urls.filter((u) => {
      if (!u.expiresAt) return false;
      const days = (new Date(u.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 7;
    }).length;
    return { total, clicks, active, expiring };
  }, [urls]);

  const filtered = useMemo(() => {
    let list = [...urls];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (u) =>
          u.shortCode.toLowerCase().includes(q) ||
          u.longUrl.toLowerCase().includes(q)
      );
    }
    if (filter === 'custom') list = list.filter((u) => u.isCustom);
    if (filter === 'expiring') {
      list = list.filter((u) => {
        if (!u.expiresAt) return false;
        const days = (new Date(u.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24);
        return days > 0 && days <= 7;
      });
    }
    return list;
  }, [urls, debouncedSearch, filter]);

  return (
    <div className="container-app py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-ink-400 text-sm">Manage all your short links in one place</p>
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="btn-primary self-start">
          <Plus className="w-4 h-4" /> New short link
        </button>
      </div>

      {/* Quick create */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 mb-8"
        >
          <UrlShortenerForm onCreated={() => { refresh(); setShowCreate(false); }} compact />
        </motion.div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Link2}
          label="Total URLs"
          value={formatNumber(stats.total)}
          color="brand"
        />
        <StatCard
          icon={MousePointerClick}
          label="Total Clicks"
          value={formatNumber(stats.clicks)}
          color="accent"
        />
        <StatCard
          icon={TrendingUp}
          label="Active"
          value={formatNumber(stats.active)}
          color="emerald"
        />
        <StatCard
          icon={Calendar}
          label="Expiring Soon"
          value={formatNumber(stats.expiring)}
          color="amber"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by short code or URL..."
            className="input pl-11"
          />
        </div>
        <div className="flex gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterChip>
          <FilterChip active={filter === 'custom'} onClick={() => setFilter('custom')}>Custom</FilterChip>
          <FilterChip active={filter === 'expiring'} onClick={() => setFilter('expiring')}>Expiring</FilterChip>
        </div>
      </div>

      {/* URL list */}
      <UrlList
        urls={filtered}
        loading={loading}
        onDelete={deleteUrl}
        emptyState={
          debouncedSearch || filter !== 'all' ? (
            <div className="glass p-12 text-center">
              <Search className="w-12 h-12 mx-auto text-ink-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No matching URLs</h3>
              <p className="text-ink-400 text-sm">Try changing your search or filters</p>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    brand: 'from-brand-500/20 to-brand-500/5 border-brand-500/30 text-brand-400',
    accent: 'from-accent/20 to-accent/5 border-accent/30 text-accent',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-5"
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} border flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-ink-500 mt-1">{label}</div>
    </motion.div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
        active
          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
          : 'bg-ink-800/50 text-ink-300 hover:bg-ink-800 border border-ink-700'
      )}
    >
      {children}
    </button>
  );
}
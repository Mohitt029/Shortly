import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Calendar, Key, Copy, Check, RefreshCw, LogOut, Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/authApi';
import { copyToClipboard, getInitials, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState(localStorage.getItem('shortly_api_key') || '');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopyKey = async () => {
    if (!apiKey) return toast.error('No API key available');
    const ok = await copyToClipboard(apiKey);
    if (ok) {
      setCopied(true);
      toast.success('API key copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate API key? The old key will stop working immediately.')) return;
    setRegenerating(true);
    try {
      const res = await authApi.regenerateApiKey();
      const newKey = res.data.apiKey;
      setApiKey(newKey);
      localStorage.setItem('shortly_api_key', newKey);
      toast.success('API key regenerated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="container-app py-10 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-8">Profile</h1>

        {/* Profile card */}
        <div className="glass p-6 mb-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-brand-500/30">
              {getInitials(user?.name)}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-ink-400 text-sm">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge-brand">{user?.role}</span>
                {user?.isEmailVerified ? (
                  <span className="badge-success">Verified</span>
                ) : (
                  <span className="badge-warn">Unverified</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-6 border-t border-ink-800/50">
            <InfoRow icon={User} label="Name" value={user?.name} />
            <InfoRow icon={Mail} label="Email" value={user?.email} />
            <InfoRow icon={Calendar} label="Member since" value={formatDate(user?.createdAt)} />
            <InfoRow icon={Shield} label="User ID" value={user?.id} mono />
          </div>
        </div>

        {/* API Key */}
        <div className="glass p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold">API Key</h3>
              <p className="text-xs text-ink-500">Use this to authenticate programmatic access</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-ink-950/50 border border-ink-800 font-mono text-xs">
            <span className="flex-1 truncate text-ink-300">
              {apiKey || 'No API key available'}
            </span>
            <button onClick={handleCopyKey} className="btn-ghost p-1.5" title="Copy">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-secondary text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="glass p-6">
          <h3 className="font-semibold mb-2">Session</h3>
          <p className="text-ink-400 text-sm mb-4">
            Sign out of your account on this device
          </p>
          <button onClick={handleLogout} className="btn-danger">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono = false }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-ink-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div className={`text-sm ${mono ? 'font-mono text-xs' : ''} truncate`}>{value || '—'}</div>
    </div>
  );
}
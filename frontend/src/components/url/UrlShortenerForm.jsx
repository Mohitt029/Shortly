import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link2, Sparkles, Copy, Check, ExternalLink, ChevronDown, QrCode } from 'lucide-react';
import { urlApi } from '../../services/urlApi';
import { copyToClipboard } from '../../utils/formatters';
import toast from 'react-hot-toast';
import QrCodeModal from './QrCodeModal';

export default function UrlShortenerForm({ onCreated, compact = false }) {
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!longUrl.trim()) return toast.error('Please enter a URL');

    setLoading(true);
    setResult(null);
    try {
      const payload = { long_url: longUrl.trim() };
      if (customAlias.trim()) payload.custom_alias = customAlias.trim();

      const res = await urlApi.create(payload);
      setResult(res.data);
      toast.success('Short URL created!');
      onCreated?.(res.data);
      setLongUrl('');
      setCustomAlias('');
      setShowAdvanced(false);
    } catch (err) {
      toast.error(err.message || 'Failed to shorten');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(result.short_url);
    if (ok) {
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500">
            <Link2 className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            placeholder="Paste your long URL here..."
            className="input pl-12 pr-32 text-base"
            disabled={loading}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !longUrl.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 px-4 text-sm"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Shortening...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Shorten</span>
              </>
            )}
          </button>
        </div>

        {/* Advanced toggle */}
        {!compact && (
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-sm text-ink-400 hover:text-brand-400 transition flex items-center gap-1"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Advanced options
          </button>
        )}

        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <input
              type="text"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              placeholder="Custom alias (e.g., my-link)"
              className="input font-mono text-sm"
              disabled={loading}
              maxLength={16}
            />
            <p className="text-xs text-ink-500 mt-1.5">
              3-16 characters. Letters, numbers, dashes, underscores only.
            </p>
          </motion.div>
        )}
      </form>

      {/* Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 glass-hover p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <a
                href={result.short_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-300 hover:text-brand-200 font-mono text-sm truncate block"
              >
                {result.short_url}
              </a>
              <p className="text-xs text-ink-500 truncate mt-0.5">{result.long_url}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={handleCopy} className="btn-ghost p-2" title="Copy">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={() => setQrOpen(true)} className="btn-ghost p-2" title="QR Code">
                <QrCode className="w-4 h-4" />
              </button>
              <a
                href={result.short_url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost p-2"
                title="Open"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.div>
      )}

      <QrCodeModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        url={result?.short_url || ''}
        label={result?.short_code}
      />
    </div>
  );
}
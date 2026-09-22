import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Copy,
  Check,
  ExternalLink,
  QrCode,
  BarChart3,
  Trash2,
  Calendar,
  MousePointerClick,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  copyToClipboard,
  truncateUrl,
  formatRelativeTime,
  formatNumber,
  daysUntil,
  cn,
} from '../../utils/formatters';
import QrCodeModal from './QrCodeModal';

export default function UrlCard({ url, onDelete }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(url.shortUrl);
    if (ok) {
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const expiresIn = daysUntil(url.expiresAt);
  const expiringSoon = expiresIn !== null && expiresIn <= 7 && expiresIn >= 0;
  const hasPending = (url.pendingClicks || 0) > 0;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="glass-hover p-5 group"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-5 h-5 text-brand-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={url.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-300 hover:text-brand-200 font-mono text-sm font-medium truncate"
              >
                {url.shortUrl}
              </a>
              <button
                onClick={handleCopy}
                className="text-ink-500 hover:text-brand-400 transition p-1"
                title="Copy"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <p
              className="text-sm text-ink-400 truncate mt-1"
              title={url.longUrl}
            >
              {truncateUrl(url.longUrl, 70)}
            </p>

            <div className="flex items-center gap-3 flex-wrap mt-3 text-xs text-ink-500">
              {/* Clicks with live pending indicator */}
              <span className="flex items-center gap-1">
                <MousePointerClick className="w-3.5 h-3.5" />
                {formatNumber(url.clickCount)} clicks
                {hasPending && (
                  <span
                    className="inline-flex items-center gap-1 ml-0.5"
                    title={`${url.pendingClicks} pending (live)`}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </span>
                )}
              </span>

              {url.isCustom && <span className="badge-brand">Custom</span>}

              {url.expiresAt && (
                <span
                  className={cn(
                    'flex items-center gap-1',
                    expiringSoon ? 'text-amber-400' : 'text-ink-500'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {expiresIn < 0
                    ? 'Expired'
                    : expiringSoon
                    ? `Expires in ${expiresIn}d`
                    : `Expires ${formatRelativeTime(url.expiresAt)}`}
                </span>
              )}

              {url.lastAccessedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatRelativeTime(url.lastAccessedAt)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setQrOpen(true)}
              className="btn-ghost p-2"
              title="QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <Link
              to={`/analytics/${url.shortCode}`}
              className="btn-ghost p-2"
              title="Analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                if (confirm(`Delete ${url.shortCode}?`))
                  onDelete(url.shortCode);
              }}
              className="btn-ghost p-2 hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      <QrCodeModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        url={url.shortUrl}
        label={url.shortCode}
      />
    </>
  );
}
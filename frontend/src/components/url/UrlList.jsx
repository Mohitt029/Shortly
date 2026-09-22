import { AnimatePresence } from 'framer-motion';
import { Link2 } from 'lucide-react';
import UrlCard from './UrlCard';
import Loader from '../common/Loader';

export default function UrlList({ urls, loading, onDelete, emptyState }) {
  if (loading && urls.length === 0) {
    return (
      <div className="py-20">
        <Loader label="Loading your URLs..." />
      </div>
    );
  }

  if (!loading && urls.length === 0) {
    return (
      emptyState || (
        <div className="glass p-12 text-center">
          <Link2 className="w-12 h-12 mx-auto text-ink-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No URLs yet</h3>
          <p className="text-ink-400 text-sm">
            Create your first short link to get started
          </p>
        </div>
      )
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {urls.map((url) => (
          <UrlCard key={url.shortCode} url={url} onDelete={onDelete} />
        ))}
      </AnimatePresence>
    </div>
  );
}
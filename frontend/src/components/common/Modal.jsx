import { Loader2 } from 'lucide-react';

export default function Loader({ size = 'md', label = 'Loading...' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className="flex items-center justify-center gap-2 text-ink-400">
      <Loader2 className={`${sizes[size]} animate-spin text-brand-500`} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
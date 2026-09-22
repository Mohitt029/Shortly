import { Link } from 'react-router-dom';
import { Link2, Github, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-ink-800/50 bg-ink-950/50 backdrop-blur-sm mt-auto">
      <div className="container-app py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-ink-400 text-sm">
            <Link2 className="w-4 h-4 text-brand-500" />
            <span>Shortly</span>
            <span className="text-ink-600">·</span>
            <span>Built with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>by Mohitt</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-ink-400">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <a href="http://localhost:5000/health" target="_blank" rel="noreferrer" className="hover:text-white transition">
              Health
            </a>
            <a href="https://github.com/mohitt1213" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition">
              <Github className="w-4 h-4" /> GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
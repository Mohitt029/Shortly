import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Link2,
  LogOut,
  LayoutDashboard,
  User,
  Menu,
  X,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getInitials, cn } from '../../utils/formatters';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-xl bg-ink-950/70 border-b border-ink-800/50">
      <div className="container-app flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-brand-500/30">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">Shortly</span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavItem to="/analytics" icon={BarChart3} label="Analytics" />
              <NavItem to="/profile" icon={User} label="Profile" />
              <button onClick={handleLogout} className="btn-ghost" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent flex items-center justify-center text-sm font-bold text-white ml-2 ring-2 ring-brand-500/30">
                {getInitials(user?.name)}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden btn-ghost"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-ink-800/50"
          >
            <div className="container-app py-4 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <MobileLink to="/dashboard" onClick={() => setMobileOpen(false)}>
                    Dashboard
                  </MobileLink>
                  <MobileLink to="/analytics" onClick={() => setMobileOpen(false)}>
                    Analytics
                  </MobileLink>
                  <MobileLink to="/profile" onClick={() => setMobileOpen(false)}>
                    Profile
                  </MobileLink>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary justify-start"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <>
                  <MobileLink to="/login" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </MobileLink>
                  <MobileLink to="/signup" onClick={() => setMobileOpen(false)}>
                    Get Started
                  </MobileLink>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn('btn-ghost text-sm', isActive && 'text-white bg-ink-800/50')
      }
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  );
}

function MobileLink({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn('btn-ghost justify-start', isActive && 'text-white bg-ink-800/50')
      }
    >
      {children}
    </NavLink>
  );
}
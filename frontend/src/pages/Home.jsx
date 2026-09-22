import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap, BarChart3, Shield, QrCode, Globe, Sparkles,
  ArrowRight, Link2,
} from 'lucide-react';
import UrlShortenerForm from '../components/url/UrlShortenerForm';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: Zap, title: 'Lightning Fast', desc: 'Sub-50ms redirects powered by Redis cache and a global CDN.' },
  { icon: BarChart3, title: 'Rich Analytics', desc: 'Track clicks, devices, browsers, countries, and referrers in real time.' },
  { icon: Shield, title: 'Secure by Design', desc: 'JWT auth, API keys, rate limiting, and SSRF protection built-in.' },
  { icon: QrCode, title: 'QR Codes', desc: 'Instant QR code generation for every short link you create.' },
  { icon: Globe, title: 'Global Scale', desc: 'Distributed Snowflake IDs enable billions of unique URLs.' },
  { icon: Sparkles, title: 'Custom Aliases', desc: 'Memorable, brandable short links with your own custom slug.' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Hero */}
      <section className="container-app pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Production-grade URL shortener</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-balance">
            Short links.{' '}
            <span className="gradient-text">Big insights.</span>
          </h1>

          <p className="text-xl text-ink-400 max-w-2xl mx-auto mb-10 text-balance">
            Transform long URLs into powerful, trackable short links.
            Beautiful analytics, custom aliases, QR codes — all in one place.
          </p>
        </motion.div>

        {/* Shortener form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass p-6 md:p-8">
            <UrlShortenerForm />
          </div>

          {!isAuthenticated && (
            <p className="mt-6 text-sm text-ink-500">
              <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium">
                Create an account
              </Link>{' '}
              to track analytics and manage your links
            </p>
          )}
        </motion.div>
      </section>

      {/* Stats strip */}
      <section className="container-app py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'URLs shortened', value: '2.4M+' },
            { label: 'Redirects served', value: '180M+' },
            { label: 'Avg. latency', value: '<50ms' },
            { label: 'Uptime', value: '99.99%' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-ink-500">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container-app py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything you need.{' '}
            <span className="gradient-text">Nothing you don't.</span>
          </h2>
          <p className="text-ink-400 max-w-2xl mx-auto">
            Built with modern system design principles — scalability, availability, and performance
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-hover p-6 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-accent/20 border border-brand-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-ink-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="container-app py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-accent/10" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to <span className="gradient-text">shorten</span> your links?
              </h2>
              <p className="text-ink-400 mb-8 max-w-xl mx-auto">
                Join thousands of users tracking their links with Shortly
              </p>
              <Link to="/signup" className="btn-primary text-base px-6 py-3 group">
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </section>
      )}
    </div>
  );
}
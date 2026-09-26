'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTheme } from '@/hooks/useTheme';
import { Logo } from '@/components/brand/Logo';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconGlobe,
  IconShieldCheck,
  IconLock,
  IconZap,
  IconCloud,
  IconBuilding,
  IconCode,
  IconHelpCircle
} from '@/components/ui/icons';
import { LANDING_COPY, LANDING_LANG_KEY, LandingLang } from '@/lib/landingCopy';

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { data: session, status: authStatus } = useSession();
  const isAuthenticated = authStatus === 'authenticated';
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LandingLang>('es');

  const t = LANDING_COPY[selectedLang];

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang');
      if (urlLang === 'es' || urlLang === 'en') {
        setSelectedLang(urlLang);
        window.localStorage.setItem(LANDING_LANG_KEY, urlLang);
        document.documentElement.lang = urlLang;
        return;
      }
      const saved = window.localStorage.getItem(LANDING_LANG_KEY);
      if (saved === 'es' || saved === 'en') {
        setSelectedLang(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // fallback
    }
  }, []);

  const changeLang = (lang: LandingLang) => {
    setSelectedLang(lang);
    try {
      window.localStorage.setItem(LANDING_LANG_KEY, lang);
      document.documentElement.lang = lang;
    } catch {}
  };

  const [demoForm, setDemoForm] = useState({
    nombre: '', email: '', empresa: '', telefono: '', volumen: 'S/ 50,000 - S/ 200,000'
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans overflow-x-hidden selection:bg-amber-400 selection:text-slate-900 transition-colors duration-300">
      
      {/* 1. Header (Unified System) */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[var(--bg)]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="INVENTA.AI">
              <Logo height={24} />
            </Link>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 tracking-wider uppercase">
              Enterprise B2B
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold tracking-wide text-slate-600 dark:text-slate-300">
            <a href="#soluciones" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t.nav_plataforma}</a>
            <a href="#problema" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t.nav_soluciones}</a>
            <a href="#roi" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t.nav_precios}</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full transition-colors hidden sm:block">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {isAuthenticated ? (
              <Link href="/dashboard" className="hidden lg:inline-flex items-center justify-center h-9 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[13px] transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                {t.nav_dashboard}
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden xl:block text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors mr-2">
                  {t.nav_login}
                </Link>
                <button onClick={() => setIsDemoModalOpen(true)} className="hidden lg:inline-flex items-center justify-center h-9 px-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[13px] font-semibold transition-colors">
                  {t.nav_demo}
                </button>
                <Link href="/login" className="hidden sm:inline-flex items-center justify-center h-9 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[13px] transition-all">
                  {t.nav_trial}
                </Link>
              </>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1 flex flex-col pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/30 uppercase tracking-widest mb-6">
              {t.hero_eyebrow}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
              {t.hero_title}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto lg:mx-0">
              {t.hero_sub}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button onClick={() => setIsDemoModalOpen(true)} className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[15px] transition-all shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.23)] hover:-translate-y-0.5">
                {t.hero_cta_demo} →
              </button>
              <a href="#problema" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-[15px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                {t.hero_cta_how}
              </a>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-2xl">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] shadow-2xl overflow-hidden aspect-[4/3] flex flex-col">
              <div className="h-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md h-6 w-48 flex items-center justify-center text-[10px] text-slate-500 font-mono">inventa.ai/dashboard</div>
              </div>
              <div className="flex-1 p-6 relative">
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Riesgo Quiebre</p>
                      <p className="text-2xl font-black text-red-500">12 SKUs</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                      <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Costo Proyectado</p>
                      <p className="text-2xl font-black text-amber-500">S/ 45k</p>
                    </div>
                 </div>
                 <div className="h-32 bg-slate-100 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    <span className="text-slate-400 font-medium text-sm">Visualización Inteligente de Demanda</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-12 text-center text-sm text-slate-500">
        <p>© 2026 INVENTA.AI B2B Enterprise. Todos los derechos reservados.</p>
      </footer>

      {/* Demo Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDemoModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Agenda una Demo</h3>
              {!demoSubmitted ? (
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <input type="text" placeholder="Nombre completo" className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                  <input type="email" placeholder="Correo corporativo" className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500" required />
                  <button type="submit" className="w-full py-3 rounded-lg bg-amber-500 text-slate-900 font-bold hover:bg-amber-400 transition-colors">Solicitar Acceso Anticipado</button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                  <h4 className="text-lg font-bold">¡Solicitud Recibida!</h4>
                  <p className="text-slate-500 mt-2">Un especialista se pondrá en contacto pronto.</p>
                  <button onClick={() => setIsDemoModalOpen(false)} className="mt-6 text-amber-600 font-semibold">Cerrar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

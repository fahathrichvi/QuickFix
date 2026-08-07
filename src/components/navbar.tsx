'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/database.types';
import { Wrench, LogOut, LayoutDashboard, Search, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole>('customer');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await (supabase.from('profiles') as any)
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.role) {
          setRole(profile.role as UserRole);
        }
      }
    }
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: profile } = await (supabase.from('profiles') as any)
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile?.role) {
          setRole(profile.role as UserRole);
        }
      } else {
        // Reset on sign-out, otherwise the next visitor on this tab inherits the
        // previous user's role in the dashboard link.
        setRole('customer');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getDashboardHref = () => {
    if (role === 'admin') return '/dashboard/admin';
    if (role === 'business_owner') return '/dashboard/business';
    return '/dashboard/customer';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md text-slate-900 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-2 text-xl font-bold tracking-tight">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
            <Wrench className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-blue-600 dark:from-white dark:via-slate-200 dark:to-blue-400 bg-clip-text text-transparent">
            Quickfix
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link href="/search" className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Find Services</span>
          </Link>
          <Link href="/search?category=plumbing-drainage" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            Plumbing
          </Link>
          <Link href="/search?category=electrical-wiring" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            Electrical
          </Link>
          <Link href="/search?category=hvac-air-conditioning" className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            HVAC
          </Link>
        </nav>

        {/* Desktop Auth & Dashboard Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center space-x-3">
              <Link
                href={getDashboardHref()}
                className="flex items-center space-x-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
              >
                <LayoutDashboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Dashboard ({role})</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              >
                Log In
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <div className="flex md:hidden items-center space-x-1">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-4 space-y-3">
          <Link
            href="/search"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1"
          >
            Find Services
          </Link>
          <Link
            href="/search?category=plumbing-drainage"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1"
          >
            Plumbing
          </Link>
          <Link
            href="/search?category=electrical-wiring"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1"
          >
            Electrical
          </Link>
          {user ? (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <Link
                href={getDashboardHref()}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-blue-600 dark:text-blue-400 font-medium py-1"
              >
                Go to Dashboard ({role})
              </Link>
              <button
                onClick={() => {
                  handleSignOut();
                  setIsMobileMenuOpen(false);
                }}
                className="block text-rose-600 dark:text-rose-400 font-medium py-1"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <Link
                href="/auth/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1"
              >
                Log In
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block font-medium text-blue-600 dark:text-blue-400 py-1"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

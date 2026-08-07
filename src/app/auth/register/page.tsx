'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Wrench, User, Building2, UserCheck, AlertCircle, Tag, MapPin, CheckCircle2, Phone } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { UserRole } from '@/types/database.types';

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as UserRole) || 'customer';

  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      // Load Categories
      const { data: catData } = await (supabase.from('categories') as any).select('*').order('name');
      if (catData && catData.length > 0) {
        setCategories(catData);
        setCategoryId(catData[0].id);
      }

      // Load Cities
      const { data: cityData } = await (supabase.from('cities') as any).select('*').eq('is_active', true).order('name');
      if (cityData && cityData.length > 0) {
        setCities(cityData);
        setCity(cityData[0].name);
      }
    }
    loadData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Call server API to create user & auto-confirm email (bypasses rate limit)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone,
          role,
          businessName,
          categoryId,
          city,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        setErrorMsg(result.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Account created successfully! Logging you in...');

      // 2. Sign in immediately
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!loginErr) {
        if (role === 'business_owner') {
          router.push('/dashboard/business');
        } else {
          router.push('/dashboard/customer');
        }
      } else {
        router.push('/auth/login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during registration.');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
      <div className="text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mx-auto mb-3 shadow-lg shadow-blue-500/30">
          <Wrench className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Join Quickfix</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Create your marketplace account in seconds.</p>
      </div>

      {/* Role Switcher Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setRole('customer')}
          className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
            role === 'customer'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Customer</span>
        </button>

        <button
          type="button"
          onClick={() => setRole('business_owner')}
          className={`py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 ${
            role === 'business_owner'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Business Owner</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mobile No</label>
          <div className="relative">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">City Location</label>
          <div className="relative">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer pr-10"
              required
            >
              {cities.map((c) => (
                <option key={c.id} value={c.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.name} ({c.state_or_country || 'US'})
                </option>
              ))}
            </select>
            <MapPin className="absolute right-3 top-3 h-4 w-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
            required
            minLength={6}
          />
        </div>

        {role === 'business_owner' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Electrical Experts"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Marketplace Category</label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer pr-10"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {cat.name}
                    </option>
                  ))}
                </select>
                <Tag className="absolute right-3 top-3 h-4 w-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
        >
          <UserCheck className="h-4 w-4" />
          <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
        </button>
      </form>

      <p className="text-center text-xs text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <Suspense fallback={<div className="text-slate-600 dark:text-slate-400 text-xs">Loading form...</div>}>
          <RegisterForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

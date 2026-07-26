'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Wrench, Mail, Lock, LogIn, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Only allow relative, same-site paths. A raw `?redirectTo=https://evil.example`
  // would otherwise bounce the freshly-signed-in user straight off the site.
  const rawRedirectTo = searchParams.get('redirectTo') || '/';
  const redirectTo =
    rawRedirectTo.startsWith('/') && !rawRedirectTo.startsWith('//') ? rawRedirectTo : '/';

  // The OAuth callback reports failures back via `?error=`.
  const [errorMsg, setErrorMsg] = useState<string | null>(searchParams.get('error'));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else if (data.user) {
      const { data: profile } = await (supabase.from('profiles') as any)
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (profile?.role === 'business_owner') {
        router.push('/dashboard/business');
      } else {
        router.push(redirectTo);
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/login`,
    });

    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg('Password reset link sent! Please check your email inbox.');
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
      <div className="text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white mx-auto mb-3 shadow-lg shadow-blue-500/30">
          <Wrench className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          {isForgotPassword ? 'Reset Your Password' : 'Log in to Quickfix'}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isForgotPassword
            ? 'Enter your account email to receive a password reset link.'
            : 'Welcome back! Access your bookings and dashboard.'}
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {!isForgotPassword ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-blue-400 hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
          >
            <LogIn className="h-4 w-4" />
            <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Account Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
          >
            <Mail className="h-4 w-4" />
            <span>{isLoading ? 'Sending Link...' : 'Send Reset Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsForgotPassword(false);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="w-full text-xs text-slate-400 hover:text-white font-medium flex items-center justify-center space-x-1 pt-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Login</span>
          </button>
        </form>
      )}

      {!isForgotPassword && (
        <div className="relative border-t border-slate-800 pt-4 text-center">
          <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 -top-2.5 relative">
            Or continue with
          </span>

          <button
            onClick={handleGoogleLogin}
            className="w-full mt-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2"
          >
            <span>Google OAuth</span>
          </button>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-blue-400 font-semibold hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<div className="text-slate-400 text-xs">Loading form...</div>}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

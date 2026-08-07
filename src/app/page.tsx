import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Search, MapPin, Wrench, Zap, Wind, Sparkles, Hammer, Tv, Star, ShieldCheck, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch Categories
  const { data: categories } = await (supabase.from('categories') as any)
    .select('*')
    .order('name');

  // Fetch Featured Businesses
  const { data: featuredBusinesses } = await (supabase.from('businesses') as any)
    .select(`
      *,
      categories (name, slug)
    `)
    .eq('is_active', true)
    .order('average_rating', { ascending: false })
    .limit(6);

  const categoryIcons: Record<string, any> = {
    'Wrench': Wrench,
    'Zap': Zap,
    'Wind': Wind,
    'Sparkles': Sparkles,
    'Hammer': Hammer,
    'Tv': Tv,
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200 dark:border-slate-800 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/70 via-slate-50 to-slate-50 dark:from-blue-950/40 dark:via-slate-950 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center space-x-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-6">
            <ShieldCheck className="h-4 w-4" />
            <span>Supabase-Powered Local Business Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            Fix Anything Local in Minutes with <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Verified Experts</span>
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Book trusted plumbers, electricians, cleaners, and contractors with instant availability, upfront pricing, and real-time updates.
          </p>

          {/* Search Bar Component */}
          <form action="/search" method="GET" className="mt-10 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center bg-white/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-2xl p-2 shadow-2xl shadow-blue-950/50 backdrop-blur-md gap-2">
              <div className="flex items-center flex-1 px-3 w-full">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <input
                  type="text"
                  name="q"
                  placeholder="Service or business name (e.g. Leak Repair, Electrician)..."
                  className="w-full bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center px-3 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 w-full sm:w-auto">
                <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <input
                  type="text"
                  name="city"
                  placeholder="City or location..."
                  defaultValue="Springfield"
                  className="w-full sm:w-36 bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-0 px-2 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm px-6 py-3 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 shrink-0"
              >
                <span>Find Pros</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Category Chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {categories?.map((cat: any) => {
              const IconComp = categoryIcons[cat.icon || 'Wrench'] || Wrench;
              return (
                <Link
                  key={cat.id}
                  href={`/search?category=${cat.slug}`}
                  className="flex items-center space-x-2 bg-white/70 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 px-4 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition group"
                >
                  <IconComp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  <span>{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Businesses Section */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">Verified Professionals</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Top Rated Local Businesses</h2>
            </div>
            <Link
              href="/search"
              className="mt-4 md:mt-0 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center space-x-1"
            >
              <span>Explore all services</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredBusinesses?.map((biz: any) => (
              <div
                key={biz.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl overflow-hidden transition shadow-lg hover:shadow-2xl hover:shadow-blue-950/30 group flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={biz.cover_image_url || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80'}
                      alt={biz.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-blue-400 border border-slate-800">
                      {biz.categories?.name || 'Local Service'}
                    </div>
                    {/* Sits on a photo in both themes, so this badge keeps the
                        dark-on-image treatment instead of following the theme. */}
                    {biz.verification_status === 'approved' && (
                      <div className="absolute top-3 right-3 bg-emerald-950/70 backdrop-blur-md border border-emerald-500/40 text-emerald-200 text-xs font-medium px-2.5 py-1 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {biz.name}
                      </h3>
                    </div>

                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {biz.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                      <div className="flex items-center space-x-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md border border-amber-500/20">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-600 dark:text-amber-400" />
                        <span className="font-bold">{Number(biz.average_rating || 0).toFixed(2)}</span>
                        <span className="text-slate-600 dark:text-slate-400">({biz.review_count})</span>
                      </div>

                      <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        <span>{biz.city}, {biz.country}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-200 dark:border-slate-800/60 mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Instant booking available</span>
                  <Link
                    href={`/business/${biz.slug}`}
                    className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition"
                  >
                    <span>View & Book</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Technical Excellence Banner */}
      <section className="py-16 border-t border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Engineered for Speed & Reliability</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Quickfix leverages PostGIS geospatial search, PostgreSQL atomic booking functions, and Row Level Security for bulletproof safety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">PostGIS Radius Search</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Calculates precise distances between your coordinates and available service pros using spatial geometry indexes.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Atomic Double-Booking Protection</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                All appointments are verified and locked inside a single PostgreSQL transaction function to prevent double bookings.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Supabase Realtime Updates</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive instant status updates (Accepted, In Progress, Completed) on your booking dashboard without refreshing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA for Business Owners */}
      <section className="py-16 bg-gradient-to-b from-slate-50 via-blue-100/40 to-slate-50 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/30 rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white">Are you a Local Business Owner?</h2>
              <p className="mt-4 text-sm sm:text-base text-slate-700 dark:text-slate-300">
                Join Quickfix to manage online bookings, track revenue analytics, gain verified status, and reach customers in your service area.
              </p>
            </div>
            <Link
              href="/auth/register?role=business_owner"
              className="bg-white text-slate-950 hover:bg-slate-100 font-bold text-sm px-8 py-4 rounded-2xl shadow-xl transition shrink-0"
            >
              List Your Business Now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

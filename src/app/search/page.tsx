import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Search, MapPin, Star, ShieldCheck, Filter, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { formatDistance } from '@/lib/utils';

export const revalidate = 0;

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    minRating?: string;
    verifiedOnly?: string;
    lat?: string;
    lng?: string;
    radius?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const categorySlug = params.category || '';
  const city = params.city || '';
  const minRating = parseFloat(params.minRating || '0');
  const verifiedOnly = params.verifiedOnly === 'true';

  // Default Springfield coordinates for PostGIS spatial search fallback
  const userLat = parseFloat(params.lat || '37.7749');
  const userLng = parseFloat(params.lng || '-122.4194');
  const radiusMeters = parseFloat(params.radius || '50000');

  const supabase = await createClient();

  // Fetch all categories for sidebar filter
  const { data: categories } = await (supabase.from('categories') as any)
    .select('*')
    .order('name');

  // Find category ID by slug if provided
  let selectedCategoryId: string | null = null;
  if (categorySlug) {
    const selectedCategory = categories?.find((c: any) => c.slug === categorySlug);
    if (selectedCategory) {
      selectedCategoryId = selectedCategory.id;
    }
  }

  // Execute PostGIS nearby_businesses RPC call
  const { data: nearbyData } = await (supabase.rpc as any)('nearby_businesses', {
    lat: userLat,
    lng: userLng,
    radius_meters: radiusMeters,
    cat_id: selectedCategoryId || undefined,
    min_rat: minRating,
    ver_stat: verifiedOnly ? 'approved' : undefined,
  });

  // Apply full-text search or city filter if provided
  let businesses: any[] = nearbyData || [];

  if (query) {
    const lowerQ = query.toLowerCase();
    businesses = businesses.filter(
      (b: any) =>
        b.name.toLowerCase().includes(lowerQ) ||
        (b.description && b.description.toLowerCase().includes(lowerQ))
    );
  }

  if (city) {
    const lowerCity = city.toLowerCase();
    businesses = businesses.filter((b: any) => b.city.toLowerCase().includes(lowerCity));
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Find Local Service Pros</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Showing {businesses.length} verified businesses near {city || 'Springfield'}
            </p>
          </div>

          <form action="/search" method="GET" className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search by keyword..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
            >
              Search
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-fit space-y-6">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Filter Results</h2>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Category
              </label>
              <div className="space-y-1">
                <Link
                  href={`/search?${new URLSearchParams({ ...params, category: '' }).toString()}`}
                  className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    !categorySlug ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  All Categories
                </Link>
                {categories?.map((cat: any) => (
                  <Link
                    key={cat.id}
                    href={`/search?${new URLSearchParams({ ...params, category: cat.slug }).toString()}`}
                    className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      categorySlug === cat.slug
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Minimum Rating
              </label>
              <div className="space-y-1">
                {[0, 4.0, 4.5, 4.8].map((rat) => (
                  <Link
                    key={rat}
                    href={`/search?${new URLSearchParams({ ...params, minRating: rat.toString() }).toString()}`}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      minRating === rat ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{rat === 0 ? 'Any Rating' : `${rat}★ & higher`}</span>
                    {rat > 0 && <Star className="h-3 w-3 fill-amber-400 text-amber-600 dark:text-amber-400" />}
                  </Link>
                ))}
              </div>
            </div>

            {/* Verified Only Filter */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <Link
                href={`/search?${new URLSearchParams({
                  ...params,
                  verifiedOnly: verifiedOnly ? 'false' : 'true',
                }).toString()}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition ${
                  verifiedOnly
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Verified Pros Only</span>
                </div>
                {verifiedOnly && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              </Link>
            </div>
          </div>

          {/* Results Grid */}
          <div className="lg:col-span-3 space-y-4">
            {businesses.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
                <Search className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No businesses found</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Try adjusting your filters or searching for another keyword or location.
                </p>
                <Link
                  href="/search"
                  className="mt-4 inline-block bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium px-4 py-2 rounded-xl transition"
                >
                  Reset Filters
                </Link>
              </div>
            ) : (
              businesses.map((biz: any) => (
                <div
                  key={biz.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition shadow-md hover:shadow-xl"
                >
                  <div className="flex items-start space-x-4">
                    <img
                      src={biz.logo_url || biz.cover_image_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=200&q=80'}
                      alt={biz.name}
                      className="h-16 w-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                    />

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition">
                          <Link href={`/business/${biz.slug}`}>{biz.name}</Link>
                        </h3>
                        {biz.verification_status === 'approved' && (
                          <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{biz.description}</p>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-bold">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          <span>{Number(biz.average_rating || 0).toFixed(2)}</span>
                          <span className="text-slate-500 font-normal">({biz.review_count} reviews)</span>
                        </div>

                        <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          <span>{biz.address}, {biz.city}</span>
                        </div>

                        {biz.distance_meters !== undefined && (
                          <div className="text-blue-600 dark:text-blue-400 font-medium">
                            {formatDistance(biz.distance_meters)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-200 dark:border-slate-800">
                    <Link
                      href={`/business/${biz.slug}`}
                      className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-md shadow-blue-600/20 flex items-center justify-center space-x-1.5"
                    >
                      <span>Book Service</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MapPin, Phone, Star, CheckCircle2, Clock } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { formatCurrency } from '@/lib/utils';
import { BookingModal } from '@/components/booking-modal';

export const revalidate = 0;

interface BusinessPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BusinessDetailPage({ params }: BusinessPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch business details
  const { data: business } = await (supabase.from('businesses') as any)
    .select(`
      *,
      categories (name, slug)
    `)
    .eq('slug', slug)
    .single();

  if (!business) {
    notFound();
  }

  // Fetch services for business
  const { data: services } = await (supabase.from('services') as any)
    .select('*')
    .eq('business_id', business.id)
    .eq('is_active', true);

  // Fetch reviews for business
  const { data: reviews } = await (supabase.from('reviews') as any)
    .select(`
      *,
      profiles (full_name, avatar_url)
    `)
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  // Fetch business working hours
  const { data: businessHours } = await (supabase.from('business_hours') as any)
    .select('*')
    .eq('business_id', business.id)
    .order('day_of_week');

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      {/* Cover Header */}
      <div className="relative h-64 sm:h-80 bg-white dark:bg-slate-900 overflow-hidden">
        <img
          src={business.cover_image_url || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80'}
          alt={business.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      </div>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 pb-16">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex items-start space-x-5">
              <img
                src={business.logo_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=200&q=80'}
                alt={business.name}
                className="h-24 w-24 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-950"
              />

              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{business.name}</h1>
                  {business.verification_status === 'approved' && (
                    <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Verified Business</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                  {business.categories?.name || 'Local Service'}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <Star className="h-4 w-4 fill-amber-400" />
                    <span>{Number(business.average_rating || 0).toFixed(2)}</span>
                    <span className="text-slate-500 font-normal">({business.review_count} reviews)</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4 text-slate-500" />
                    <span>{business.address}, {business.city}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact & WhatsApp */}
            <div className="flex flex-wrap items-center gap-3">
              {business.whatsapp_number && (
                <a
                  href={`https://wa.me/${business.whatsapp_number.replace(/\+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center space-x-2"
                >
                  <Phone className="h-4 w-4" />
                  <span>WhatsApp Chat</span>
                </a>
              )}

              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center space-x-2"
                >
                  <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Call {business.phone}</span>
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            {/* Services List & Booking Trigger */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">About the Business</h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {business.description || 'No description provided.'}
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Available Services & Instant Booking</h2>
                <div className="space-y-4">
                  {services?.map((service: any) => (
                    <div
                      key={service.id}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{service.name}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{service.description}</p>
                        <div className="flex items-center space-x-3 mt-2 text-xs text-slate-600 dark:text-slate-400">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>{service.duration_minutes} mins</span>
                          </span>
                        </div>
                      </div>

                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-slate-800">
                        <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                          {formatCurrency(service.price)}
                        </span>
                        <BookingModal business={business} service={service} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Reviews Section */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Customer Reviews</h2>
                {reviews?.length === 0 ? (
                  <p className="text-xs text-slate-500">No reviews yet for this business.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews?.map((rev: any) => (
                      <div key={rev.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img
                              src={rev.profiles?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                              alt={rev.profiles?.full_name || 'Customer'}
                              className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                            />
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{rev.profiles?.full_name || 'Anonymous'}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                            <Star className="h-3.5 w-3.5 fill-amber-400" />
                            <span>{rev.rating} / 5</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic">{rev.comment}</p>
                        <span className="text-[10px] text-slate-500 block">
                          {new Date(rev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar: Hours & Contact Info */}
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Business Hours</span>
                </h3>
                <div className="space-y-2 text-xs">
                  {daysOfWeek.map((dayName, idx) => {
                    const dayObj = businessHours?.find((h: any) => h.day_of_week === idx);
                    return (
                      <div key={dayName} className="flex items-center justify-between text-slate-700 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-900">
                        <span>{dayName}</span>
                        {dayObj && !dayObj.is_closed ? (
                          <span className="text-slate-600 dark:text-slate-400">{dayObj.open_time} - {dayObj.close_time}</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Clock, Star, Bell, Bookmark, RefreshCw, XCircle } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { formatCurrency } from '@/lib/utils';

export default function CustomerDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'notifications' | 'favorites'>('bookings');
  const [isLoading, setIsLoading] = useState(true);

  // Review modal state
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Cancel booking modal state
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const supabase = createClient();

  const loadData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Load profile
    const { data: prof } = await (supabase.from('profiles') as any).select('*').eq('id', user.id).maybeSingle();
    setProfile(prof);

    // Load customer bookings
    const { data: bData } = await (supabase.from('bookings') as any)
      .select(`
        *,
        businesses (name, phone, slug, logo_url),
        services (name, price)
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    setBookings(bData || []);

    // Load notifications
    const { data: nData } = await (supabase.from('notifications') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setNotifications(nData || []);

    // Load favorites
    const { data: fData } = await (supabase.from('favorites') as any)
      .select(`
        *,
        businesses (*)
      `)
      .eq('user_id', user.id);

    setFavorites(fData || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription for instant booking status updates
    const channel = supabase
      .channel('customer-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBookingId || !profile) return;

    const bookingObj = bookings.find((b) => b.id === reviewBookingId);
    if (!bookingObj) return;

    const { error } = await (supabase.from('reviews') as any).insert({
      booking_id: reviewBookingId,
      customer_id: profile.id,
      business_id: bookingObj.business_id,
      rating: reviewRating,
      comment: reviewComment,
    });

    if (!error) {
      setReviewBookingId(null);
      setReviewComment('');
      loadData();
    } else {
      alert(`Error submitting review: ${error.message}`);
    }
  };

  const handleCancelBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelBookingId || !profile) return;

    const bookingObj = bookings.find((b) => b.id === cancelBookingId);
    if (!bookingObj) return;

    // Append rather than replace: `notes` holds the customer's original booking
    // instructions, which the provider still needs to see.
    const cancelNote = cancelReason
      ? `Cancelled by customer: ${cancelReason}`
      : 'Cancelled by customer.';
    const notesUpdated = [bookingObj.notes, cancelNote].filter(Boolean).join(' | ');

    // Update booking status
    const { error } = await (supabase.from('bookings') as any)
      .update({
        status: 'cancelled',
        notes: notesUpdated,
      })
      .eq('id', cancelBookingId);

    if (!error) {
      // Record history
      await (supabase.from('booking_status_history') as any).insert({
        booking_id: cancelBookingId,
        old_status: bookingObj.status,
        new_status: 'cancelled',
        changed_by: profile.id,
        notes: cancelReason || 'Cancelled by customer',
      });

      setCancelBookingId(null);
      setCancelReason('');
      loadData();
    } else {
      alert(`Error cancelling booking: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8 gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Customer Portal</span>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Welcome back, {profile?.full_name || 'Customer'}
            </h1>
          </div>

          <button
            onClick={loadData}
            className="self-start sm:self-auto bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium px-4 py-2 rounded-xl transition flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Refresh Updates</span>
          </button>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center space-x-4 border-b border-slate-200 dark:border-slate-800 mb-8">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'bookings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>My Bookings ({bookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications ({notifications.filter((n) => !n.is_read).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'favorites'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>Saved Favorites ({favorites.length})</span>
          </button>
        </div>

        {/* Tab 1: Bookings List */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-600 dark:text-slate-400">
                <Calendar className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">No active bookings yet</p>
                <p className="text-xs mt-1">Explore top-rated local services and place your first booking.</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-base font-bold text-slate-900 dark:text-white">{booking.services?.name}</span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          booking.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : booking.status === 'accepted' || booking.status === 'confirmed'
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : booking.status === 'cancelled' || booking.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Provider:{' '}
                      <span className="text-slate-900 dark:text-white font-medium">{booking.businesses?.name}</span>
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Date: {booking.booking_date}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>
                          Time: {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                        </span>
                      </span>
                    </div>

                    {booking.notes && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 max-w-lg mt-1">
                        Notes: "{booking.notes}"
                      </p>
                    )}
                  </div>

                  <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800 gap-3">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(booking.total_price)}
                    </span>

                    <div className="flex items-center space-x-2">
                      {booking.status === 'completed' && (
                        <button
                          onClick={() => setReviewBookingId(booking.id)}
                          className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1"
                        >
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          <span>Leave Review</span>
                        </button>
                      )}

                      {(booking.status === 'pending' || booking.status === 'accepted' || booking.status === 'confirmed') && (
                        <button
                          onClick={() => setCancelBookingId(booking.id)}
                          className="bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition flex items-center space-x-1"
                        >
                          <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Cancel Booking</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-3 max-w-3xl">
            {notifications.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-600 dark:text-slate-400">
                No notifications right now.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-start space-x-3"
                >
                  <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{notif.title}</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{notif.message}</p>
                    <span className="text-[10px] text-slate-500 block mt-2">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Favorites */}
        {activeTab === 'favorites' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favorites.length === 0 ? (
              <div className="col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-600 dark:text-slate-400">
                No saved favorite businesses yet.
              </div>
            ) : (
              favorites.map((fav) => (
                <div key={fav.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-4">
                  <img
                    src={fav.businesses?.logo_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=100&q=80'}
                    alt={fav.businesses?.name}
                    className="h-12 w-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{fav.businesses?.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{fav.businesses?.city}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Cancel Booking Modal */}
        {cancelBookingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <form onSubmit={handleCancelBookingSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <span>Cancel Booking</span>
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Are you sure you want to cancel this booking appointment?
              </p>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Reason for Cancellation (Optional)</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, change of plans..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelBookingId(null)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Submit Review Modal */}
        {reviewBookingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <form onSubmit={handleReviewSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Write a Review</h3>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`p-2 rounded-lg border ${
                        reviewRating >= star ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400' : 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600'
                      }`}
                    >
                      <Star className="h-5 w-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Comment</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How was your experience?"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setReviewBookingId(null)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2 rounded-xl transition"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

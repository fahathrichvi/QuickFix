'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Calendar, DollarSign, Star, CheckCircle2, Plus, ShieldCheck, RefreshCw, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { formatCurrency } from '@/lib/utils';

export default function BusinessOwnerDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'verification'>('bookings');
  const [isLoading, setIsLoading] = useState(true);

  // New Service Form State
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('100');
  const [newServiceDuration, setNewServiceDuration] = useState('60');

  // Business Partner Rejection/Cancellation Modal State
  const [rejectBookingId, setRejectBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Verification Upload State
  const [docUrl, setDocUrl] = useState('');

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

    // Load business owned by user. maybeSingle: an owner who has not created a
    // business yet is a normal state, not an error.
    const { data: biz } = await (supabase.from('businesses') as any)
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    setBusiness(biz);

    if (biz) {
      // Load bookings for business
      const { data: bData } = await (supabase.from('bookings') as any)
        .select(`
          *,
          profiles (id, full_name, phone, avatar_url),
          services (name, price)
        `)
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false });

      setBookings(bData || []);

      // Load services
      const { data: sData } = await (supabase.from('services') as any)
        .select('*')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false });

      setServices(sData || []);

      // Load verification request status
      const { data: vData } = await (supabase.from('verification_requests') as any)
        .select('*')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setVerification(vData);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription for incoming business bookings
    const channel = supabase
      .channel('business-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAcceptBooking = async (bookingId: string) => {
    const bookingObj = bookings.find((b) => b.id === bookingId);
    const { error } = await (supabase.from('bookings') as any)
      .update({ status: 'accepted' })
      .eq('id', bookingId);

    if (!error) {
      // Create notification for customer
      if (bookingObj?.customer_id) {
        await (supabase.from('notifications') as any).insert({
          user_id: bookingObj.customer_id,
          type: 'booking_accepted',
          title: 'Booking Accepted',
          message: `Your booking for ${bookingObj.services?.name} has been accepted by ${business.name}.`,
          related_entity_type: 'booking',
          related_entity_id: bookingId,
        });
      }
      loadData();
    } else {
      alert(`Error accepting booking: ${error.message}`);
    }
  };

  const handleRejectBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectBookingId || !rejectReason.trim()) {
      alert('Please enter the reason why you cannot complete this booking.');
      return;
    }

    const bookingObj = bookings.find((b) => b.id === rejectBookingId);
    if (!bookingObj) return;

    // Keep the customer's original notes; append the decline reason to them.
    const notesUpdated = [bookingObj.notes, `Rejected by service provider: ${rejectReason}`]
      .filter(Boolean)
      .join(' | ');

    // Update booking status to rejected
    const { error } = await (supabase.from('bookings') as any)
      .update({
        status: 'rejected',
        notes: notesUpdated,
      })
      .eq('id', rejectBookingId);

    if (!error) {
      // Record history
      await (supabase.from('booking_status_history') as any).insert({
        booking_id: rejectBookingId,
        old_status: bookingObj.status,
        new_status: 'rejected',
        changed_by: profile.id,
        notes: rejectReason,
      });

      // Send notification to customer with reason
      if (bookingObj.customer_id) {
        await (supabase.from('notifications') as any).insert({
          user_id: bookingObj.customer_id,
          type: 'booking_rejected',
          title: 'Booking Request Declined',
          message: `${business.name} could not accept your booking for ${bookingObj.services?.name}. Reason: "${rejectReason}"`,
          related_entity_type: 'booking',
          related_entity_id: rejectBookingId,
        });
      }

      setRejectBookingId(null);
      setRejectReason('');
      loadData();
    } else {
      alert(`Error declining booking: ${error.message}`);
    }
  };

  const handleMarkCompleted = async (bookingId: string) => {
    const { error } = await (supabase.from('bookings') as any)
      .update({ status: 'completed' })
      .eq('id', bookingId);

    if (!error) {
      loadData();
    } else {
      alert(`Error updating booking status: ${error.message}`);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const { error } = await (supabase.from('services') as any).insert({
      business_id: business.id,
      name: newServiceName,
      description: newServiceDesc,
      price: parseFloat(newServicePrice),
      duration_minutes: parseInt(newServiceDuration),
    });

    if (!error) {
      setIsAddServiceOpen(false);
      setNewServiceName('');
      setNewServiceDesc('');
      loadData();
    } else {
      alert(`Error creating service: ${error.message}`);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !docUrl) return;

    const { error } = await (supabase.from('verification_requests') as any).insert({
      business_id: business.id,
      document_url: docUrl,
      notes: 'Business license submitted for verification.',
    });

    if (!error) {
      alert('Verification request submitted successfully! An administrator will review your document.');
      setDocUrl('');
      loadData();
    } else {
      alert(`Error submitting verification: ${error.message}`);
    }
  };

  // Compute analytics totals
  const totalRevenue = bookings
    .filter((b) => b.status === 'completed')
    .reduce((acc, b) => acc + Number(b.total_price), 0);

  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Business Owner Portal</span>
              {business?.verification_status === 'approved' && (
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Verified
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {business?.name || 'My Business Desk'}
            </h1>
          </div>

          <button
            onClick={loadData}
            className="self-start sm:self-auto bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium px-4 py-2 rounded-xl transition flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Refresh Dashboard</span>
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {formatCurrency(totalRevenue)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Bookings</span>
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {bookings.length}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Completed Orders</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {completedCount}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Rating</span>
              <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {business?.average_rating ? Number(business.average_rating).toFixed(2) : '0.00'} ★
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
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
            <span>Bookings Management ({pendingCount} pending)</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'services'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Services & Pricing ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'verification'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Business Verification</span>
          </button>
        </div>

        {/* Tab 1: Bookings Management Desk */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-600 dark:text-slate-400">
                No customer bookings received yet.
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
                      Customer:{' '}
                      <span className="text-slate-900 dark:text-white font-medium">
                        {booking.profiles?.full_name} ({booking.profiles?.phone || 'No phone'})
                      </span>
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
                        Notes / Reason: "{booking.notes}"
                      </p>
                    )}
                  </div>

                  <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800 gap-3">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(booking.total_price)}
                    </span>

                    {/* Status Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAcceptBooking(booking.id)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                          >
                            Accept Booking
                          </button>
                          <button
                            onClick={() => setRejectBookingId(booking.id)}
                            className="bg-rose-600/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center space-x-1"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Decline with Reason</span>
                          </button>
                        </>
                      )}

                      {(booking.status === 'accepted' || booking.status === 'confirmed') && (
                        <>
                          <button
                            onClick={() => handleMarkCompleted(booking.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                          >
                            Mark Completed
                          </button>
                          <button
                            onClick={() => setRejectBookingId(booking.id)}
                            className="bg-rose-600/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Services Management */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Business Services</h2>
              <button
                onClick={() => setIsAddServiceOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center space-x-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Service</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((srv) => (
                <div key={srv.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{srv.name}</h3>
                    <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(srv.price)}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{srv.description}</p>
                  <span className="text-xs text-slate-500 block">Duration: {srv.duration_minutes} mins</span>
                </div>
              ))}
            </div>

            {/* Add Service Modal */}
            {isAddServiceOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <form onSubmit={handleAddService} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add New Service</h3>

                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Service Name</label>
                    <input
                      type="text"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="e.g. Drain Cleaning"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={newServiceDesc}
                      onChange={(e) => setNewServiceDesc(e.target.value)}
                      placeholder="Brief details of what is included..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Duration (Mins)</label>
                      <input
                        type="number"
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddServiceOpen(false)}
                      className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2 rounded-xl transition"
                    >
                      Create Service
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Verification Upload */}
        {activeTab === 'verification' && (
          <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span>Verification & License Status</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Verified businesses receive higher search rankings and a verified badge visible to customers.
              </p>
            </div>

            {verification ? (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Current Status:</span>
                  <span className="font-bold uppercase text-amber-600 dark:text-amber-400">{verification.status}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Document URL: {verification.document_url}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitVerification} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business License / Document Storage Link
                  </label>
                  <input
                    type="url"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://storage.example.com/verification-doc.pdf"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition"
                >
                  Submit License Document
                </button>
              </form>
            )}
          </div>
        )}

        {/* Business Partner Decline / Cancellation Reason Modal */}
        {rejectBookingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <form onSubmit={handleRejectBookingSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <span>Decline Booking Request</span>
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Please enter the reason why your business cannot fulfill this appointment (this reason will be sent to the customer).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Decline / Cancellation</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Overbooked during this time slot, out of service radius, technician unavailable..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectBookingId(null)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition"
                >
                  Submit Decline Reason
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

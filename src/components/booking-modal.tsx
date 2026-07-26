'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Calendar, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface BookingModalProps {
  business: any;
  service: any;
}

export function BookingModal({ business, service }: BookingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00:00');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any>(null);

  const supabase = createClient();
  const router = useRouter();

  const availableTimeSlots = [
    '08:00:00',
    '09:00:00',
    '10:00:00',
    '11:00:00',
    '13:00:00',
    '14:00:00',
    '15:00:00',
    '16:00:00',
  ];

  const handleOpenModal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth/login?redirectTo=/business/${business.slug}`);
      return;
    }
    setIsOpen(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required to place a booking.');
      }

      // Calculate end time based on duration_minutes
      const [h, m] = startTime.split(':').map(Number);
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + Number(service.duration_minutes || 60);

      // A service running past midnight cannot be stored in a TIME column, and an
      // end time that wrapped around would silently defeat the overlap check.
      if (endMinutes > 24 * 60) {
        throw new Error(
          'This service is too long to finish before midnight. Please pick an earlier start time.'
        );
      }

      const endH = Math.floor(endMinutes / 60)
        .toString()
        .padStart(2, '0');
      const endM = (endMinutes % 60).toString().padStart(2, '0');
      const endTimeFormatted = `${endH}:${endM}:00`;

      // Invoke PostgreSQL Atomic Booking RPC Function.
      // The customer is taken from auth.uid() inside the function — it is
      // deliberately not a parameter, so it cannot be spoofed from the client.
      const { data: newBooking, error } = await (supabase.rpc as any)('create_booking_atomic', {
        p_service_id: service.id,
        p_booking_date: bookingDate,
        p_start_time: startTime,
        p_end_time: endTimeFormatted,
        p_notes: notes || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccessBooking(newBooking);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-600/20 flex items-center space-x-1.5"
      >
        <Calendar className="h-4 w-4" />
        <span>Book Service</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {successBooking ? (
              <div className="text-center py-6 space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Booking Confirmed!</h3>
                <p className="text-xs text-slate-300">
                  Your appointment for <span className="text-blue-400 font-semibold">{service.name}</span> on{' '}
                  <span className="text-white font-semibold">{bookingDate}</span> at{' '}
                  <span className="text-white font-semibold">{startTime.substring(0, 5)}</span> has been securely created.
                </p>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-slate-400 font-mono">
                  Ref ID: {successBooking.id}
                </div>
                <div className="pt-4 flex items-center justify-center space-x-3">
                  <button
                    onClick={() => router.push('/dashboard/customer')}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-6 py-3 rounded-xl transition"
                  >
                    View My Bookings
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateBooking} className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Atomic Transaction Protected</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Schedule Appointment</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {service.name} — <span className="text-white font-bold">{formatCurrency(service.price)}</span>
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Select Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Time Slot Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Select Start Time</label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setStartTime(slot)}
                        className={`py-2 text-xs font-semibold rounded-xl border transition ${
                          startTime === slot
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {slot.substring(0, 5)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Notes */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Notes for Service Provider (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe specific issues, gate codes, or instructions..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20"
                  >
                    {isLoading ? 'Processing Transaction...' : `Confirm & Book (${formatCurrency(service.price)})`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

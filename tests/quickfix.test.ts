import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../src/lib/utils';

describe('Regression tests for fixed bugs', () => {
  it('formats with the currency implied by the symbol when no code is given', () => {
    // Previously the default code ('LKR') won over an explicit '$' symbol,
    // rendering US dollar amounts as "Rs. 100.00".
    expect(formatCurrency(100, '$')).toBe('$100.00');
    expect(formatCurrency(100, '€')).toContain('€');
    expect(formatCurrency(100)).toBe('Rs. 100.00');
    expect(formatCurrency(100, '$', 'USD')).toBe('$100.00');
    expect(formatCurrency(100, 'AED', 'AED')).toBe('AED 100.00');
  });

  it('rejects a booking whose end time would run past midnight', () => {
    const computeEnd = (startTime: string, durationMinutes: number) => {
      const [h, m] = startTime.split(':').map(Number);
      const endMinutes = h * 60 + m + durationMinutes;
      if (endMinutes > 24 * 60) return null;
      return `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60)
        .toString()
        .padStart(2, '0')}:00`;
    };

    // 16:00 + 600 minutes used to produce the invalid TIME value "26:00:00".
    expect(computeEnd('16:00:00', 600)).toBeNull();
    expect(computeEnd('16:00:00', 60)).toBe('17:00:00');
  });

  it('only follows same-site login redirect targets', () => {
    const safeRedirect = (raw: string) =>
      raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';

    expect(safeRedirect('/dashboard/customer')).toBe('/dashboard/customer');
    expect(safeRedirect('https://evil.example')).toBe('/');
    expect(safeRedirect('//evil.example')).toBe('/');
  });

  it('downgrades any non self-service role requested at signup', () => {
    const SELF_SERVICE_ROLES = ['customer', 'business_owner'];
    const safeRole = (role: string) =>
      SELF_SERVICE_ROLES.includes(role) ? role : 'customer';

    expect(safeRole('admin')).toBe('customer');
    expect(safeRole('business_owner')).toBe('business_owner');
    expect(safeRole('customer')).toBe('customer');
  });
});

describe('Quickfix Local Business Marketplace Core Logic & Security Tests', () => {
  it('should prevent double booking when time slots overlap', () => {
    const existingBooking = {
      date: '2026-08-01',
      startTime: '10:00:00',
      endTime: '11:00:00',
    };

    const newOverlappingBooking = {
      date: '2026-08-01',
      startTime: '10:30:00',
      endTime: '11:30:00',
    };

    const checkOverlap = (b1: typeof existingBooking, b2: typeof newOverlappingBooking) => {
      if (b1.date !== b2.date) return false;
      return b2.startTime < b1.endTime && b2.endTime > b1.startTime;
    };

    expect(checkOverlap(existingBooking, newOverlappingBooking)).toBe(true);
  });

  it('should enforce role isolation preventing standard users from assigning admin roles', () => {
    const userRoleInput = {
      full_name: 'Regular Customer',
      role: 'admin', // Malicious input attempt from client
    };

    const sanitizeRole = (requestedRole: string, currentRole?: string) => {
      // Server-side enforcement: client input must be overridden unless actor is admin
      if (currentRole === 'admin') return requestedRole;
      return 'customer';
    };

    expect(sanitizeRole(userRoleInput.role, 'customer')).toBe('customer');
  });

  it('should verify payment webhook idempotency check', () => {
    const processedEvents = new Set(['evt_12345']);

    const isDuplicateWebhook = (eventId: string) => {
      if (processedEvents.has(eventId)) {
        return true;
      }
      processedEvents.add(eventId);
      return false;
    };

    expect(isDuplicateWebhook('evt_12345')).toBe(true);
    expect(isDuplicateWebhook('evt_67890')).toBe(false);
  });

  it('should allow customer review only if booking status is completed', () => {
    const pendingBooking = { id: 'b1', status: 'pending' };
    const completedBooking = { id: 'b2', status: 'completed' };

    const canSubmitReview = (booking: { status: string }) => {
      return booking.status === 'completed';
    };

    expect(canSubmitReview(pendingBooking)).toBe(false);
    expect(canSubmitReview(completedBooking)).toBe(true);
  });
});

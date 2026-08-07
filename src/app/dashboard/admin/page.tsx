'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, FileText, Plus, Building2, RefreshCw, Trash2, Edit3, MapPin, Tag, Calendar, XCircle, DollarSign, PieChart, ArrowUpRight, Settings, CheckCircle2, Calculator, Users, Key, Search, Mail, AlertTriangle } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'providers' | 'customers' | 'financial' | 'verifications' | 'bookings' | 'categories' | 'cities' | 'audit'>('bookings');

  // Search Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [providerSearch, setProviderSearch] = useState('');

  // Platform Settings State
  const [currencySymbol, setCurrencySymbol] = useState('Rs.');
  const [currencyCode, setCurrencyCode] = useState('LKR');
  const [commissionType, setCommissionType] = useState<'percentage' | 'flat'>('percentage');
  const [commissionValue, setCommissionValue] = useState<number>(10);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // Reset Password Modal State
  const [resetTargetUser, setResetTargetUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  // Edit Provider Modal State
  const [editingProvider, setEditingProvider] = useState<any>(null);

  // Category State (Create & Edit)
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Wrench');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // City State (Create & Edit)
  const [newCityName, setNewCityName] = useState('');
  const [newCityState, setNewCityState] = useState('US');
  const [editingCity, setEditingCity] = useState<any>(null);

  // Admin Cancel Booking State
  const [adminCancelBookingId, setAdminCancelBookingId] = useState<string | null>(null);
  const [adminCancelReason, setAdminCancelReason] = useState('Cancelled by Platform Administrator');
  const [isCancelling, setIsCancelling] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/auth/login?redirectTo=/dashboard/admin');
      return;
    }

    const { data: prof } = await (supabase.from('profiles') as any).select('*').eq('id', user.id).maybeSingle();
    setProfile(prof);

    // RLS already hides the data, but a non-admin should not be left staring at an
    // empty control panel — send them to the dashboard they actually own.
    if (prof?.role !== 'admin') {
      router.replace(prof?.role === 'business_owner' ? '/dashboard/business' : '/dashboard/customer');
      return;
    }

    // Load Platform Settings
    const { data: settingsData } = await (supabase.from('platform_settings') as any).select('*').eq('id', 1).maybeSingle();
    if (settingsData) {
      setCurrencySymbol(settingsData.currency_symbol || 'Rs.');
      setCurrencyCode(settingsData.currency_code || 'LKR');
      setCommissionType(settingsData.commission_type || 'percentage');
      setCommissionValue(Number(settingsData.commission_value) || 10);
    }

    // Load Customers (profiles with role customer)
    const { data: cProfiles } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    setCustomers(cProfiles || []);

    // Load Service Providers (businesses with owner profiles and categories)
    const { data: bData } = await (supabase.from('businesses') as any)
      .select(`
        *,
        profiles!owner_id (id, full_name, email, phone, role, is_active),
        categories (id, name)
      `)
      .order('created_at', { ascending: false });

    setProviders(bData || []);

    // Load Pending Verification Requests
    const { data: vData } = await (supabase.from('verification_requests') as any)
      .select(`
        *,
        businesses (name, slug, city)
      `)
      .order('created_at', { ascending: false });

    setVerifications(vData || []);

    // Load All Platform Bookings
    const { data: bookingData } = await (supabase.from('bookings') as any)
      .select(`
        *,
        businesses (id, name, owner_id, phone, city, email),
        profiles (id, full_name, phone, email),
        services (id, name, price)
      `)
      .order('created_at', { ascending: false });

    setAllBookings(bookingData || []);

    // Load Categories
    const { data: catData } = await (supabase.from('categories') as any).select('*').order('name');
    setCategories(catData || []);

    // Load Cities
    const { data: cityData } = await (supabase.from('cities') as any).select('*').order('name');
    setCities(cityData || []);

    // Load Audit Logs
    const { data: aData } = await (supabase.from('audit_logs') as any).select('*').order('created_at', { ascending: false }).limit(20);
    setAuditLogs(aData || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Commission Fee Helper
  const computeCommissionFee = (price: number) => {
    if (commissionType === 'percentage') {
      return price * (commissionValue / 100);
    } else {
      return Math.min(price, commissionValue);
    }
  };

  // Compute Platform Financial Totals
  const completedBookings = allBookings.filter((b) => b.status === 'completed');
  const totalGMV = completedBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
  const totalQuickfixFees = completedBookings.reduce((sum, b) => sum + computeCommissionFee(Number(b.total_price)), 0);
  const totalPartnerPayouts = totalGMV - totalQuickfixFees;

  // --- ADMIN RESET PASSWORD ---
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPasswordValue) return;

    setIsResetting(true);
    setResetMsg(null);

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetTargetUser.id,
          newPassword: newPasswordValue,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        setResetMsg(`Error: ${result.error || 'Failed to reset password'}`);
      } else {
        setResetMsg(`Password for ${resetTargetUser.name} reset successfully!`);
        setTimeout(() => {
          setResetTargetUser(null);
          setNewPasswordValue('');
          setResetMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      setResetMsg(`Error: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // --- CUSTOMERS CRUD ---
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const { error } = await (supabase.from('profiles') as any)
      .update({
        full_name: editingCustomer.full_name,
        email: editingCustomer.email,
        phone: editingCustomer.phone,
        preferred_language: editingCustomer.preferred_language,
        is_active: editingCustomer.is_active,
      })
      .eq('id', editingCustomer.id);

    if (!error) {
      setEditingCustomer(null);
      loadData();
    } else {
      alert(`Error updating customer: ${error.message}`);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to completely delete customer account "${name}"? This allows the email address to re-register.`)) return;

    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        alert(`Error deleting customer account: ${result.error || 'Failed to delete'}`);
      } else {
        loadData();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // --- PROVIDERS CRUD ---
  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProvider) return;

    const { error } = await (supabase.from('businesses') as any)
      .update({
        name: editingProvider.name,
        email: editingProvider.email,
        city: editingProvider.city,
        category_id: editingProvider.category_id || null,
        verification_status: editingProvider.verification_status,
        subscription_status: editingProvider.subscription_status,
        is_active: editingProvider.is_active,
      })
      .eq('id', editingProvider.id);

    if (!error) {
      setEditingProvider(null);
      loadData();
    } else {
      alert(`Error updating service provider: ${error.message}`);
    }
  };

  const handleDeleteProvider = async (id: string, name: string, ownerId?: string) => {
    if (!confirm(`Are you sure you want to delete business profile "${name}"?`)) return;

    try {
      if (ownerId) {
        await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: ownerId }),
        });
      } else {
        await (supabase.from('businesses') as any).delete().eq('id', id);
      }
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // --- SAVE PLATFORM SETTINGS ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg(null);

    const { error } = await (supabase.from('platform_settings') as any)
      .upsert({
        id: 1,
        currency_symbol: currencySymbol,
        currency_code: currencyCode,
        commission_type: commissionType,
        commission_value: Number(commissionValue),
        updated_at: new Date().toISOString(),
      });

    if (!error) {
      setSettingsMsg('Platform Settings updated successfully!');
      setTimeout(() => setSettingsMsg(null), 3000);
      loadData();
    } else {
      alert(`Error saving settings: ${error.message}`);
    }
  };

  // --- ADMIN CANCEL BOOKING ---
  const handleAdminCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCancelBookingId) return;

    setIsCancelling(true);
    const reasonText = adminCancelReason.trim() || 'Cancelled by Platform Administrator';

    const bookingObj = allBookings.find((b) => b.id === adminCancelBookingId);
    const notesUpdated = [bookingObj?.notes, `Cancelled by Admin: ${reasonText}`]
      .filter(Boolean)
      .join(' | ');

    try {
      const { error } = await (supabase.from('bookings') as any)
        .update({
          status: 'cancelled',
          notes: notesUpdated,
        })
        .eq('id', adminCancelBookingId);

      if (!error) {
        await (supabase.from('audit_logs') as any).insert({
          actor_id: profile?.id || null,
          action: 'admin_cancel_booking',
          target_entity: 'bookings',
          target_id: adminCancelBookingId,
          details: { reason: reasonText },
        });

        if (bookingObj?.customer_id) {
          await (supabase.from('notifications') as any).insert({
            user_id: bookingObj.customer_id,
            type: 'booking_cancelled',
            title: 'Booking Cancelled by Admin',
            message: `Your booking for ${bookingObj.services?.name || 'Service'} was cancelled by administrator. Reason: "${reasonText}"`,
            related_entity_type: 'booking',
            related_entity_id: adminCancelBookingId,
          });
        }

        setAdminCancelBookingId(null);
        setAdminCancelReason('Cancelled by Platform Administrator');
        loadData();
      } else {
        alert(`Error cancelling booking: ${error.message}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  // --- CATEGORIES CRUD ---
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await (supabase.from('categories') as any).insert({
      name: newCatName,
      slug: newCatSlug || newCatName.toLowerCase().replace(/\s+/g, '-'),
      icon: newCatIcon,
      description: newCatDesc || null,
    });

    if (!error) {
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDesc('');
      loadData();
    } else {
      alert(`Error creating category: ${error.message}`);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const { error } = await (supabase.from('categories') as any)
      .update({
        name: editingCategory.name,
        slug: editingCategory.slug,
        icon: editingCategory.icon,
        description: editingCategory.description,
      })
      .eq('id', editingCategory.id);

    if (!error) {
      setEditingCategory(null);
      loadData();
    } else {
      alert(`Error updating category: ${error.message}`);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;

    const { error } = await (supabase.from('categories') as any).delete().eq('id', id);
    if (!error) {
      loadData();
    } else {
      alert(`Error deleting category: ${error.message}`);
    }
  };

  // --- CITIES CRUD ---
  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await (supabase.from('cities') as any).insert({
      name: newCityName,
      state_or_country: newCityState,
    });

    if (!error) {
      setNewCityName('');
      setNewCityState('US');
      loadData();
    } else {
      alert(`Error creating city: ${error.message}`);
    }
  };

  const handleUpdateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity) return;

    const { error } = await (supabase.from('cities') as any)
      .update({
        name: editingCity.name,
        state_or_country: editingCity.state_or_country,
        is_active: editingCity.is_active,
      })
      .eq('id', editingCity.id);

    if (!error) {
      setEditingCity(null);
      loadData();
    } else {
      alert(`Error updating city: ${error.message}`);
    }
  };

  const handleDeleteCity = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete city "${name}"?`)) return;

    const { error } = await (supabase.from('cities') as any).delete().eq('id', id);
    if (!error) {
      loadData();
    } else {
      alert(`Error deleting city: ${error.message}`);
    }
  };

  const handleApproveVerification = async (req: any, status: 'approved' | 'rejected') => {
    await (supabase.from('verification_requests') as any).update({ status }).eq('id', req.id);
    await (supabase.from('businesses') as any).update({ verification_status: status }).eq('id', req.business_id);
    await (supabase.from('audit_logs') as any).insert({
      actor_id: profile?.id || null,
      action: `verification_${status}`,
      target_entity: 'businesses',
      target_id: req.business_id,
      details: { verification_request_id: req.id, status },
    });
    loadData();
  };

  // Filtered lists
  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredProviders = providers.filter((p) => {
    const ownerName = Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name;
    const ownerEmail = Array.isArray(p.profiles) ? p.profiles[0]?.email : p.profiles?.email;

    return (
      p.name?.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.email?.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.city?.toLowerCase().includes(providerSearch.toLowerCase()) ||
      ownerName?.toLowerCase().includes(providerSearch.toLowerCase()) ||
      ownerEmail?.toLowerCase().includes(providerSearch.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Superadmin Control Desk</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">Platform Administration & User Management</h1>
          </div>

          <button
            onClick={loadData}
            className="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium px-4 py-2 rounded-xl transition flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Reload Admin Data</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-4 border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'bookings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Bookings ({allBookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'providers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Service Providers CRUD ({providers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'customers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Customer Details CRUD ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('financial')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'financial'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="h-4 w-4" />
            <span>Financial Ledger & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('verifications')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'verifications'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Verifications ({verifications.filter((v) => v.status === 'pending').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Categories ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cities')}
            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center space-x-2 shrink-0 ${
              activeTab === 'cities'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Cities ({cities.length})</span>
          </button>
        </div>

        {/* Tab 3: Bookings Moderation */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">All Platform Bookings</h2>
            {allBookings.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-600 dark:text-slate-400">
                No bookings recorded yet.
              </div>
            ) : (
              allBookings.map((b) => (
                <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-3">
                      <span className="text-base font-bold text-slate-900 dark:text-white">{b.services?.name}</span>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                        b.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : b.status === 'cancelled' || b.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Customer: <span className="text-slate-900 dark:text-white font-medium">{b.profiles?.full_name} ({b.profiles?.email || 'No Email'})</span> | Provider: <span className="text-slate-900 dark:text-white font-medium">{b.businesses?.name} ({b.businesses?.email || 'No Email'})</span>
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Date: {b.booking_date} | Time: {b.start_time?.substring(0, 5)} - {b.end_time?.substring(0, 5)} | Price: {formatCurrency(b.total_price, currencySymbol, currencyCode)}
                    </p>

                    {b.notes && <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-2 rounded-lg max-w-lg">"{b.notes}"</p>}
                  </div>

                  {b.status !== 'cancelled' && b.status !== 'completed' && (
                    <button
                      onClick={() => {
                        setAdminCancelBookingId(b.id);
                        setAdminCancelReason('Cancelled by Platform Administrator');
                      }}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shrink-0 shadow-lg shadow-rose-600/20"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Admin Cancel</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab B: Service Providers CRUD */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Service Providers & Business Partners CRUD</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Manage business listings, verification badges, subscription tiers, and reset provider login credentials.</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4">Business & Owner</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Category & City</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4">Verification</th>
                      <th className="p-4">Subscription</th>
                      <th className="p-4 text-right">Actions / Password Reset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {filteredProviders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No service providers found.
                        </td>
                      </tr>
                    ) : (
                      filteredProviders.map((prov) => {
                        const ownerProf = Array.isArray(prov.profiles) ? prov.profiles[0] : prov.profiles;
                        const catObj = Array.isArray(prov.categories) ? prov.categories[0] : prov.categories;
                        const emailDisplay = prov.email || ownerProf?.email || 'No email registered';

                        return (
                          <tr key={prov.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/40 transition">
                            <td className="p-4">
                              <div className="font-bold text-slate-900 dark:text-white text-sm">{prov.name}</div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                Owner: <span className="text-slate-800 dark:text-slate-200 font-medium">{ownerProf?.full_name || 'N/A'}</span> ({ownerProf?.phone || prov.phone || 'No Phone'})
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1.5">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span>{emailDisplay}</span>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="font-medium text-slate-800 dark:text-slate-200">{catObj?.name || 'General Services'}</div>
                              <div className="text-[11px] text-slate-500">City: {prov.city}</div>
                            </td>

                            <td className="p-4 font-bold text-amber-600 dark:text-amber-400">
                              {Number(prov.average_rating || 0).toFixed(2)} ★ ({prov.review_count || 0})
                            </td>

                            <td className="p-4">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                                  prov.verification_status === 'approved'
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : prov.verification_status === 'rejected'
                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {prov.verification_status}
                              </span>
                            </td>

                            <td className="p-4">
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                                {prov.subscription_status}
                              </span>
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => setResetTargetUser({ id: prov.owner_id, name: prov.name, email: emailDisplay })}
                                  className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl transition text-[11px] font-bold flex items-center space-x-1"
                                  title="Reset Owner Password"
                                >
                                  <Key className="h-3.5 w-3.5" />
                                  <span>Reset Password</span>
                                </button>

                                <button
                                  onClick={() => setEditingProvider(prov)}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                  title="Edit Business Provider"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>

                                <button
                                  onClick={() => handleDeleteProvider(prov.id, prov.name, prov.owner_id)}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                  title="Delete Provider"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab A: Customer Details CRUD */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Customer Account Management</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">View, edit, deactivate, or reset login passwords for all registered marketplace customers.</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Phone Number</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4 text-right">Actions / Password Reset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No customers found.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <tr key={cust.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/40 transition">
                          <td className="p-4">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2 text-sm">
                              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span>{cust.full_name}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">{cust.id}</div>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1.5">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span>{cust.email || 'No email registered'}</span>
                            </div>
                          </td>

                          <td className="p-4 text-slate-700 dark:text-slate-300">
                            {cust.phone || 'Not provided'}
                          </td>

                          <td className="p-4">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                                cust.is_active
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {cust.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>

                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {new Date(cust.created_at).toLocaleDateString()}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => setResetTargetUser({ id: cust.id, name: cust.full_name, email: cust.email || cust.full_name })}
                                className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl transition text-[11px] font-bold flex items-center space-x-1"
                                title="Reset Login Password"
                              >
                                <Key className="h-3.5 w-3.5" />
                                <span>Reset Password</span>
                              </button>

                              <button
                                onClick={() => setEditingCustomer(cust)}
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                                title="Edit Customer Details"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteCustomer(cust.id, cust.full_name)}
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                title="Delete Customer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Financial Ledger & Settings */}
        {activeTab === 'financial' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span>Currency Format & Quickfix Commission Manager</span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Configure the platform currency symbol and set how much service partners pay Quickfix per completed service.
                  </p>
                </div>
              </div>

              {settingsMsg && (
                <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{settingsMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Currency Format / Symbol</label>
                  <select
                    value={currencySymbol}
                    onChange={(e) => {
                      const sym = e.target.value;
                      setCurrencySymbol(sym);
                      if (sym === 'Rs.') setCurrencyCode('LKR');
                      else if (sym === '$') setCurrencyCode('USD');
                      else if (sym === '€') setCurrencyCode('EUR');
                      else if (sym === '£') setCurrencyCode('GBP');
                      else if (sym === '₹') setCurrencyCode('INR');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Rs.">Rs. (Sri Lankan / South Asian Rupee)</option>
                    <option value="$">$ (US Dollar)</option>
                    <option value="€">€ (Euro)</option>
                    <option value="£">£ (British Pound)</option>
                    <option value="₹">₹ (Indian Rupee)</option>
                    <option value="AED">AED (Emirati Dirham)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Currency ISO Code</label>
                  <input
                    type="text"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Quickfix Commission Model</label>
                  <select
                    value={commissionType}
                    onChange={(e) => setCommissionType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="percentage">Percentage Rate (%)</option>
                    <option value="flat">Flat Fixed Amount ({currencySymbol})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {commissionType === 'percentage' ? 'Commission Rate (%)' : `Flat Fee Amount (${currencySymbol})`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                    required
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center space-x-3">
                  <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">Example Fee Calculation:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      If a service partner completes a service for <strong className="text-slate-900 dark:text-white">{formatCurrency(100, currencySymbol, currencyCode)}</strong>:
                    </span>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        Owed to Quickfix: {formatCurrency(computeCommissionFee(100), currencySymbol, currencyCode)}
                        {commissionType === 'percentage' && ` (${commissionValue}%)`}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Partner Retains: {formatCurrency(100 - computeCommissionFee(100), currencySymbol, currencyCode)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-blue-600/20"
                  >
                    Save Platform Settings
                  </button>
                </div>
              </form>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <span>Gross Marketplace Volume (GMV)</span>
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {formatCurrency(totalGMV, currencySymbol, currencyCode)}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block">From completed customer bookings</span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900">
                <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-medium">
                  <span>Quickfix Platform Commission</span>
                  <ArrowUpRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
                  {formatCurrency(totalQuickfixFees, currencySymbol, currencyCode)}
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 block">
                  {commissionType === 'percentage' ? `${commissionValue}% rate` : `${formatCurrency(commissionValue, currencySymbol, currencyCode)} flat fee`}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <span>Partner Net Payouts</span>
                  <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {formatCurrency(totalPartnerPayouts, currencySymbol, currencyCode)}
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 block">Earned by service providers</span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <span>Total Event Bookings</span>
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {allBookings.length}
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 block">Completed: {completedBookings.length}</span>
              </div>
            </div>

            {/* Financial Ledger Event Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Event Ledger & Partner Commission Breakdowns</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Real-time breakdown of service partner fees, customer payments, and Quickfix commissions.</p>
                </div>
                <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold px-3 py-1 rounded-full border border-blue-500/30">
                  {commissionType === 'percentage' ? `${commissionValue}% Commission` : `${formatCurrency(commissionValue, currencySymbol, currencyCode)} Flat Fee`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4">Customer & Email</th>
                      <th className="p-4">Service Partner & Email</th>
                      <th className="p-4">Service & Date</th>
                      <th className="p-4">Total Payment</th>
                      <th className="p-4 text-blue-600 dark:text-blue-400">Owed to Quickfix</th>
                      <th className="p-4 text-emerald-600 dark:text-emerald-400">Partner Net</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs">
                    {allBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No transaction events recorded.
                        </td>
                      </tr>
                    ) : (
                      allBookings.map((b) => {
                        const price = Number(b.total_price || 0);
                        const quickfixFee = computeCommissionFee(price);
                        const partnerNet = price - quickfixFee;

                        return (
                          <tr key={b.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/40 transition">
                            <td className="p-4">
                              <div className="font-bold text-slate-900 dark:text-white">{b.profiles?.full_name || 'Customer'}</div>
                              <div className="text-[11px] text-blue-600 dark:text-blue-400">{b.profiles?.email || 'No email'}</div>
                            </td>

                            <td className="p-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{b.businesses?.name || 'Unassigned Partner'}</div>
                              <div className="text-[11px] text-blue-600 dark:text-blue-400">{b.businesses?.email || 'No email'}</div>
                            </td>

                            <td className="p-4">
                              <div className="font-medium text-slate-700 dark:text-slate-300">{b.services?.name || 'Service'}</div>
                              <div className="text-[11px] text-slate-500">{b.booking_date} ({b.start_time?.substring(0, 5)})</div>
                            </td>

                            <td className="p-4 font-bold text-slate-900 dark:text-white">
                              {formatCurrency(price, currencySymbol, currencyCode)}
                            </td>

                            <td className="p-4 font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5">
                              {formatCurrency(quickfixFee, currencySymbol, currencyCode)}
                            </td>

                            <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                              {formatCurrency(partnerNet, currencySymbol, currencyCode)}
                            </td>

                            <td className="p-4">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                                  b.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : b.status === 'cancelled' || b.status === 'rejected'
                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Verification Approvals */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            {verifications.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-600 dark:text-slate-400">
                No verification requests submitted.
              </div>
            ) : (
              verifications.map((req) => (
                <div key={req.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{req.businesses?.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">City: {req.businesses?.city}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">Document: {req.document_url}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">{req.status}</span>
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveVerification(req, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                        >
                          Approve Verified Badge
                        </button>
                        <button
                          onClick={() => handleApproveVerification(req, 'rejected')}
                          className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold px-4 py-2 rounded-xl transition"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Marketplace Categories CRUD */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Marketplace Categories</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <div key={cat.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span>{cat.name}</span>
                        </h3>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-mono">
                          Icon: {cat.icon || 'Wrench'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">Slug: {cat.slug}</p>
                      {cat.description && <p className="text-xs text-slate-500 mt-1 italic">{cat.description}</p>}
                    </div>

                    <div className="flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800/80 pt-2">
                      <button
                        onClick={() => setEditingCategory(cat)}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                        title="Edit Category"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        title="Delete Category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateCategory} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Create New Category</span>
              </h3>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Roofing & Gutters"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Slug (Optional)</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  placeholder="roofing-gutters"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Lucide Icon Name</label>
                <input
                  type="text"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  placeholder="Wrench, Zap, Wind, Sparkles..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description of this service category..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition"
              >
                Create Category
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Cities Manager CRUD */}
        {activeTab === 'cities' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Supported Cities Dropdown List</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cities.map((city) => (
                  <div key={city.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{city.name}</span>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">({city.state_or_country})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Status: {city.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingCity(city)}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                        title="Edit City"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCity(city.id, city.name)}
                        className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                        title="Delete City"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateCity} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Add Supported City</span>
              </h3>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">City Name</label>
                <input
                  type="text"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  placeholder="e.g. Springfield, Chicago"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">State / Country Code</label>
                <input
                  type="text"
                  value={newCityState}
                  onChange={(e) => setNewCityState(e.target.value)}
                  placeholder="US, CA, UK..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition"
              >
                Add City
              </button>
            </form>
          </div>
        )}

        {/* Modal: Admin Cancel Booking */}
        {adminCancelBookingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <form onSubmit={handleAdminCancelBooking} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <span>Confirm Admin Booking Cancellation</span>
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Are you sure you want to cancel this booking? The customer and provider will be notified.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cancellation Reason</label>
                <textarea
                  rows={3}
                  value={adminCancelReason}
                  onChange={(e) => setAdminCancelReason(e.target.value)}
                  placeholder="Provide reason for cancelling..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminCancelBookingId(null);
                    setAdminCancelReason('Cancelled by Platform Administrator');
                  }}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Admin Password Reset */}
        {resetTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <form onSubmit={handleResetPasswordSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Reset User Login Password</span>
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Target User: <strong className="text-slate-900 dark:text-white">{resetTargetUser.name}</strong> ({resetTargetUser.email})
              </p>

              {resetMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  resetMsg.startsWith('Error')
                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <span>{resetMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Login Password</label>
                <input
                  type="password"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Enter new password (min 6 chars)..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetTargetUser(null);
                    setNewPasswordValue('');
                    setResetMsg(null);
                  }}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
                >
                  {isResetting ? 'Resetting...' : 'Confirm Reset Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Edit Customer */}
        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <form onSubmit={handleUpdateCustomer} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Customer Profile</h3>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingCustomer.full_name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, full_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="cust_active_check"
                  checked={editingCustomer.is_active}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, is_active: e.target.checked })}
                  className="rounded bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="cust_active_check" className="text-xs text-slate-700 dark:text-slate-300">
                  Account Active Status
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2 rounded-xl transition"
                >
                  Save Customer Details
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Edit Service Provider */}
        {editingProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <form onSubmit={handleUpdateProvider} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Service Provider</h3>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Business Name</label>
                <input
                  type="text"
                  value={editingProvider.name}
                  onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Business Email Address</label>
                <input
                  type="email"
                  value={editingProvider.email || ''}
                  onChange={(e) => setEditingProvider({ ...editingProvider, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  value={editingProvider.city}
                  onChange={(e) => setEditingProvider({ ...editingProvider, city: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Verification Status</label>
                  <select
                    value={editingProvider.verification_status}
                    onChange={(e) => setEditingProvider({ ...editingProvider, verification_status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1">Subscription Tier</label>
                  <select
                    value={editingProvider.subscription_status}
                    onChange={(e) => setEditingProvider({ ...editingProvider, subscription_status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="free">Free Tier</option>
                    <option value="active">Pro / Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="prov_active_check"
                  checked={editingProvider.is_active}
                  onChange={(e) => setEditingProvider({ ...editingProvider, is_active: e.target.checked })}
                  className="rounded bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="prov_active_check" className="text-xs text-slate-700 dark:text-slate-300">
                  Business Active Status
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-2 rounded-xl transition"
                >
                  Save Provider Details
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, TrendingUp, Star, DollarSign, Calendar, Settings, Plus, Trash2, Edit3, Save, Check, Loader2, AlertCircle } from 'lucide-react';
import { Salon, Service, Booking, WorkingHours, User } from '../types';

interface ProviderDashboardProps {
  salons: Salon[];
  onSalonUpdated: () => void;
  currentUser: User | null;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export default function ProviderDashboard({ 
  salons, 
  onSalonUpdated,
  currentUser,
  onOpenAuth
}: ProviderDashboardProps) {
  const initialSalonId = (currentUser?.role === 'provider' && currentUser?.salonId) 
    ? currentUser.salonId 
    : (salons[0]?.id || '');
  const [selectedSalonId, setSelectedSalonId] = useState<string>(initialSalonId);

  // Sync when currentUser changes
  useEffect(() => {
    if (currentUser?.role === 'provider' && currentUser?.salonId) {
      setSelectedSalonId(currentUser.salonId);
    }
  }, [currentUser]);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Service form state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('45');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('');
  const [addingService, setAddingService] = useState(false);

  // Edit Salon profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editTagline, setEditTagline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editHours, setEditHours] = useState<WorkingHours>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Active dashboard view tab
  const [dashTab, setDashTab] = useState<'appointments' | 'services' | 'profile' | 'audit'>('appointments');
  const [auditData, setAuditData] = useState<any | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (selectedSalonId) {
      fetchSalonAndBookings();
      if (dashTab === 'audit') {
        fetchQualityAudit();
      }
    }
  }, [selectedSalonId, dashTab]);

  const fetchQualityAudit = async () => {
    if (!selectedSalonId) return;
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/gemini/quality-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: selectedSalonId })
      });
      if (res.ok) {
        const data = await res.json();
        setAuditData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchSalonAndBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch latest single salon info
      const salonRes = await fetch(`/api/salons/${selectedSalonId}`);
      if (!salonRes.ok) throw new Error('Failed to load salon details');
      const latestSalon = await salonRes.json();
      setSalon(latestSalon);

      // Pre-populate edit profile fields
      setEditTagline(latestSalon.tagline);
      setEditDescription(latestSalon.description);
      setEditAddress(latestSalon.address);
      setEditHours(latestSalon.workingHours);
      setNewServiceCategory(latestSalon.category);

      // Fetch bookings for this salon
      const bookingsRes = await fetch(`/api/bookings?salonId=${selectedSalonId}`);
      if (!bookingsRes.ok) throw new Error('Failed to load bookings');
      const salonBookings = await bookingsRes.json();
      // Sort bookings: newest first
      salonBookings.sort((a: Booking, b: Booking) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(salonBookings);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: Booking['status']) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchSalonAndBookings();
      }
    } catch (err) {
      console.error('Failed to update booking status', err);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName || !newServicePrice || !newServiceDuration) return;

    setAddingService(true);
    try {
      const res = await fetch(`/api/salons/${selectedSalonId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServiceName,
          price: Number(newServicePrice),
          duration: Number(newServiceDuration),
          description: newServiceDescription,
          category: newServiceCategory
        })
      });

      if (res.ok) {
        setNewServiceName('');
        setNewServicePrice('');
        setNewServiceDescription('');
        fetchSalonAndBookings();
        onSalonUpdated();
      }
    } catch (err) {
      console.error('Failed to add service', err);
    } finally {
      setAddingService(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Are you sure you want to remove this service from your salon menu?')) return;

    try {
      const res = await fetch(`/api/salons/${selectedSalonId}/services/${serviceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchSalonAndBookings();
        onSalonUpdated();
      }
    } catch (err) {
      console.error('Failed to delete service', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/salons/${selectedSalonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagline: editTagline,
          description: editDescription,
          address: editAddress,
          workingHours: editHours
        })
      });

      if (res.ok) {
        setIsEditingProfile(false);
        fetchSalonAndBookings();
        onSalonUpdated();
      }
    } catch (err) {
      console.error('Failed to save profile changes', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const updateWorkingHours = (day: string, value: string) => {
    setEditHours(prev => ({
      ...prev,
      [day]: value
    }));
  };

  // Helper selectors
  const getEarnedRevenue = () => {
    return bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + b.servicePrice, 0);
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[9px] font-mono text-yellow-500 uppercase">Pending</span>;
      case 'confirmed':
        return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-mono text-blue-400 uppercase">Confirmed</span>;
      case 'completed':
        return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono text-emerald-400 uppercase">Completed</span>;
      case 'cancelled':
        return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-mono text-red-400 uppercase">Cancelled</span>;
    }
  };

  const formattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (salons.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-[#ADA69A]">
        No registered salons found in the marketplace.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Partner Notice or Authenticated Partner Banner */}
      {currentUser?.role === 'provider' ? (
        <div className="rounded-2xl border border-[#574D3C]/40 bg-[#15120D] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[#ADA69A]">
              Logged in as <span className="text-[#E6E5E4] font-semibold">{currentUser.name}</span> (Studio Director & Lead MUA)
            </p>
          </div>
          <span className="font-mono text-[11px] text-[#E6E5E4] bg-[#574D3C]/20 border border-[#574D3C]/40 px-3 py-1 rounded-full">
            Verified Makeup Studio
          </span>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#574D3C]/40 bg-gradient-to-r from-[#1A1711] to-[#100E0A] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-[#E6E5E4] bg-[#574D3C]/30 px-2 py-0.5 rounded-md mb-1.5">
              Makeup Studio Partner Access
            </span>
            <h3 className="font-serif text-base font-semibold text-[#E6E5E4]">Own a Makeup Studio or Work as a Pro MUA?</h3>
            <p className="text-[#ADA69A] mt-0.5">
              Sign in or create a Studio Partner account to manage bookings, customize MUA staff, and update makeup services.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="px-3.5 py-2 rounded-xl border border-[#2F291E] bg-[#12100C] text-[#E6E5E4] font-medium hover:border-[#574D3C] transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="px-3.5 py-2 rounded-xl bg-[#574D3C] text-white font-medium hover:brightness-110 transition-colors shadow-md shadow-[#574D3C]/20"
            >
              Partner Sign Up
            </button>
          </div>
        </div>
      )}

      {/* Selector and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#221E16] pb-5 gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#E6E5E4]">Business Salon Panel</h1>
          <p className="text-xs text-[#ADA69A] mt-1">Manage appointments, structure your beauty service catalogs, and edit profiles.</p>
        </div>

        {/* Salon Dropdown switcher */}
        <div className="flex items-center space-x-2.5">
          <Store className="h-4 w-4 text-accent-text" />
          <select
            value={selectedSalonId}
            onChange={(e) => setSelectedSalonId(e.target.value)}
            className="rounded-xl border border-accent-soft bg-[#14110C] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#E6E5E4] focus:border-accent-strong focus:outline-none cursor-pointer"
          >
            {salons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !salon ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent-text" />
        </div>
      ) : error ? (
        <div className="flex items-center space-x-2 rounded-lg border border-[#574D3C]/30 bg-[#574D3C]/10 p-5 text-xs text-[#E6E5E4]">
          <AlertCircle className="h-4 w-4 text-accent-text shrink-0" />
          <span>{error}</span>
        </div>
      ) : salon ? (
        <div className="space-y-8">
          {/* Bento Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#221E16] bg-[#14110C] p-5 space-y-2 relative overflow-hidden">
              <div className="absolute right-4 top-4 rounded-full bg-emerald-500/10 p-2 text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-mono tracking-wider text-[#746853] uppercase">Total Earnings</p>
              <h3 className="font-serif text-3xl font-bold text-[#E6E5E4]">${getEarnedRevenue()}</h3>
              <p className="text-[10px] text-[#ADA69A]">Sum of confirmed & completed sessions</p>
            </div>

            <div className="rounded-xl border border-[#221E16] bg-[#14110C] p-5 space-y-2 relative overflow-hidden">
              <div className="absolute right-4 top-4 rounded-full bg-blue-500/10 p-2 text-blue-400">
                <Calendar className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-mono tracking-wider text-[#746853] uppercase">Bookings Count</p>
              <h3 className="font-serif text-3xl font-bold text-[#E6E5E4]">{bookings.length}</h3>
              <p className="text-[10px] text-[#ADA69A]">All-time tickets processed</p>
            </div>

            <div className="rounded-xl border border-[#221E16] bg-[#14110C] p-5 space-y-2 relative overflow-hidden">
              <div className="absolute right-4 top-4 rounded-full bg-amber-500/10 p-2 text-amber-400">
                <Star className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-mono tracking-wider text-[#746853] uppercase">Aesthetic Rating</p>
              <h3 className="font-serif text-3xl font-bold text-[#E6E5E4]">{salon.rating} / 5</h3>
              <p className="text-[10px] text-[#ADA69A]">Derived from {salon.reviewCount} customer reviews</p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-[#221E16] pb-px">
            <button
              onClick={() => setDashTab('appointments')}
              className={`px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                dashTab === 'appointments' ? 'border-[#574D3C] text-[#E6E5E4]' : 'border-transparent text-[#ADA69A] hover:text-[#E6E5E4]'
              }`}
            >
              Active Appointments ({bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length})
            </button>
            <button
              onClick={() => setDashTab('services')}
              className={`px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                dashTab === 'services' ? 'border-[#574D3C] text-[#E6E5E4]' : 'border-transparent text-[#ADA69A] hover:text-[#E6E5E4]'
              }`}
            >
              Services Menu ({salon.services.length})
            </button>
            <button
              onClick={() => setDashTab('profile')}
              className={`px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                dashTab === 'profile' ? 'border-[#574D3C] text-[#E6E5E4]' : 'border-transparent text-[#ADA69A] hover:text-[#E6E5E4]'
              }`}
            >
              Edit Salon Details
            </button>
            <button
              onClick={() => setDashTab('audit')}
              className={`px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                dashTab === 'audit' ? 'border-[#574D3C] text-[#E6E5E4]' : 'border-transparent text-[#ADA69A] hover:text-[#E6E5E4]'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 text-[#E6E5E4]" />
              <span>AI Quality & Sentiment Audit</span>
            </button>
          </div>

          {/* Content Block */}
          <div className="min-h-[400px]">
            {dashTab === 'appointments' && (
              <div className="space-y-4">
                {bookings.length === 0 ? (
                  <div className="text-center py-16 border border-[#221E16] rounded-xl bg-[#14110C] text-[#ADA69A] text-xs">
                    No bookings registered for this salon yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-[#221E16] bg-[#14110C] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                      >
                        {/* Booking Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                          <div>
                            <p className="text-[9px] text-[#746853] uppercase font-mono">Client Details</p>
                            <p className="font-bold text-[#E6E5E4] mt-0.5">{b.clientName}</p>
                            <p className="text-[10px] text-[#ADA69A] font-mono">{b.clientPhone}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-[#746853] uppercase font-mono">Beauty Service</p>
                            <p className="font-bold text-[#E6E5E4] mt-0.5">{b.serviceName}</p>
                            <p className="text-[10px] text-[#E6E5E4] font-serif">${b.servicePrice}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-[#746853] uppercase font-mono">Schedule</p>
                            <p className="font-semibold text-[#E6E5E4] mt-0.5">{formattedDate(b.date)}</p>
                            <p className="text-[10px] text-[#ADA69A] font-mono">{b.time}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-[#746853] uppercase font-mono">Status</p>
                            <div className="mt-1">{getStatusBadge(b.status)}</div>
                          </div>
                        </div>

                        {/* Interactive CTAs */}
                        <div className="flex items-center space-x-2 shrink-0 border-t border-[#221E16] md:border-t-0 pt-3 md:pt-0">
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, 'confirmed')}
                                className="rounded bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700 transition"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, 'cancelled')}
                                className="rounded border border-[#574D3C]/40 bg-[#574D3C]/5 px-3 py-1.5 text-[#E6E5E4] hover:bg-[#574D3C]/10 transition"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateBookingStatus(b.id, 'completed')}
                              className="rounded bg-indigo-600 px-3.5 py-1.5 font-semibold text-white hover:bg-indigo-700 transition flex items-center space-x-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Complete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {dashTab === 'services' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Services Menu List (Left Side) */}
                <div className="lg:col-span-2 space-y-3">
                  <h3 className="font-serif text-sm font-semibold text-[#E6E5E4] mb-2">Current Service Menu</h3>
                  {salon.services.map((serv) => (
                    <div
                      key={serv.id}
                      className="rounded-xl border border-[#221E16] bg-[#14110C] p-4 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-[#E6E5E4]">{serv.name}</p>
                          <span className="text-[10px] text-[#ADA69A] font-mono">({serv.duration} min)</span>
                        </div>
                        <p className="text-[#ADA69A] max-w-md font-serif italic text-[11px]">"{serv.description}"</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="font-serif font-bold text-sm text-[#E6E5E4]">${serv.price}</span>
                        <button
                          onClick={() => handleDeleteService(serv.id)}
                          className="rounded p-1.5 text-red-400 hover:bg-[#574D3C]/10 hover:text-red-300 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Add Service Form (Right Side) */}
                <div className="rounded-xl border border-[#221E16] bg-[#14110C] p-5 space-y-4 h-fit">
                  <h3 className="flex items-center space-x-1.5 font-serif text-sm font-semibold text-[#E6E5E4]">
                    <Plus className="h-4 w-4 text-accent-text" />
                    <span>Add Makeup Service</span>
                  </h3>

                  <form onSubmit={handleAddService} className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block mb-1">Service Title</label>
                      <input
                        type="text"
                        required
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="e.g. Royal Signature Bridal Trial & Lashes"
                        className="w-full rounded-lg border border-accent-soft bg-[#221E16]/30 px-3 py-2 text-[#E6E5E4] placeholder-[#746853] focus:border-accent-strong focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block mb-1">Price ($)</label>
                        <input
                          type="number"
                          required
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          placeholder="e.g. 195"
                          className="w-full rounded-lg border border-accent-soft bg-[#221E16]/30 px-3 py-2 text-[#E6E5E4] placeholder-[#746853] focus:border-accent-strong focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block mb-1">Duration (min)</label>
                        <select
                          value={newServiceDuration}
                          onChange={(e) => setNewServiceDuration(e.target.value)}
                          className="w-full rounded-lg border border-accent-soft bg-[#221E16]/30 px-3 py-2 text-[#E6E5E4] focus:border-accent-strong focus:outline-none"
                        >
                          <option value="45">45 mins</option>
                          <option value="60">60 mins</option>
                          <option value="75">75 mins</option>
                          <option value="90">90 mins</option>
                          <option value="120">120 mins</option>
                          <option value="150">150 mins</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block mb-1">Short Description</label>
                      <textarea
                        value={newServiceDescription}
                        onChange={(e) => setNewServiceDescription(e.target.value)}
                        placeholder="Complexion matching, airbrush finish, custom lash placement, and long-wear setting..."
                        rows={2}
                        className="w-full rounded-lg border border-accent-soft bg-[#221E16]/30 px-3 py-2 text-[#E6E5E4] placeholder-[#746853] focus:border-accent-strong focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={addingService}
                      className="w-full flex items-center justify-center space-x-1 rounded-lg bg-[#574D3C] py-2.5 font-semibold text-white hover:bg-[#796D59] transition disabled:opacity-50 cursor-pointer"
                    >
                      {addingService ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Add to Menu</span>}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {dashTab === 'profile' && (
              <div className="rounded-xl border border-[#221E16] bg-[#14110C] p-6 max-w-3xl">
                <div className="flex items-center justify-between mb-6 border-b border-[#221E16]/50 pb-3">
                  <h3 className="font-serif text-sm font-semibold text-[#E6E5E4]">Salon General Settings</h3>
                  {!isEditingProfile ? (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="inline-flex items-center space-x-1.5 rounded bg-[#E6E5E4]/5 border border-[#E6E5E4]/10 text-xs text-[#E6E5E4] hover:bg-[#E6E5E4]/10 px-3.5 py-1.5 cursor-pointer transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-accent-text uppercase">In Edit Mode</span>
                  )}
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block mb-1">Tagline</label>
                    <input
                      type="text"
                      disabled={!isEditingProfile}
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      className="w-full rounded-lg border border-accent-soft bg-[#221E16]/30 px-3 py-2 text-[#E6E5E4] disabled:opacity-50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block mb-1">About Salon Description</label>
                    <textarea
                      disabled={!isEditingProfile}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-accent-soft bg-[#221E16]/30 px-3 py-2 text-[#E6E5E4] disabled:opacity-50 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block mb-1">Physical Address</label>
                    <input
                      type="text"
                      disabled={!isEditingProfile}
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full rounded-lg border border-accent-soft bg-[#221E16]/30 px-3 py-2 text-[#E6E5E4] disabled:opacity-50 focus:outline-none"
                    />
                  </div>

                  {/* Working Hours list */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block">Working Hours Configuration</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.keys(editHours).map((day) => (
                        <div key={day} className="space-y-1">
                          <p className="font-mono text-[9px] text-[#ADA69A]">{day}</p>
                          <input
                            type="text"
                            disabled={!isEditingProfile}
                            value={editHours[day as keyof WorkingHours] || ''}
                            onChange={(e) => updateWorkingHours(day, e.target.value)}
                            className="w-full rounded-md border border-accent-soft bg-[#221E16]/30 px-2.5 py-1.5 text-[10px] text-[#E6E5E4] disabled:opacity-50 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {isEditingProfile && (
                    <div className="flex space-x-2 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setEditTagline(salon.tagline);
                          setEditDescription(salon.description);
                          setEditAddress(salon.address);
                          setEditHours(salon.workingHours);
                        }}
                        className="rounded bg-[#221E16] border border-[#221E16] px-4 py-2 font-semibold text-[#ADA69A] hover:bg-[#2B251B] transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="rounded bg-[#574D3C] px-5 py-2 font-semibold text-white hover:bg-[#796D59] transition disabled:opacity-50 flex items-center space-x-1.5"
                      >
                        {savingProfile ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {dashTab === 'audit' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-[#272219] bg-gradient-to-r from-[#14110D] via-[#1D1912] to-[#100E0A]">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#E6E5E4] bg-[#574D3C]/20 px-2.5 py-1 rounded-md border border-[#574D3C]/30 mb-2 inline-block">
                      Automated Sentiment & Artistry Inspector
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-[#E6E5E4]">
                      Studio Quality & Sentiment Auditor
                    </h3>
                    <p className="text-xs text-[#ADA69A] max-w-xl mt-1">
                      Synthesizes client feedback, punctuality, color-matching accuracy, and tear-proof durability to deliver actionable operational intelligence.
                    </p>
                  </div>
                  <button
                    onClick={fetchQualityAudit}
                    disabled={loadingAudit}
                    className="py-2.5 px-4 rounded-xl bg-[#574D3C] hover:bg-[#796D59] text-[#E6E5E4] text-xs font-mono font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50 self-start sm:self-auto shrink-0 transition-all"
                  >
                    {loadingAudit ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    <span>{loadingAudit ? 'Auditing Reviews...' : 'Re-run Quality Audit'}</span>
                  </button>
                </div>

                {loadingAudit ? (
                  <div className="p-12 text-center rounded-2xl border border-[#221E16] bg-[#110E0A] space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-accent-text mx-auto" />
                    <p className="font-serif text-lg text-[#E6E5E4]">Evaluating Customer Sentiment...</p>
                    <p className="text-xs text-[#948873]">Parsing verified reviews and extracting actionable director recommendations...</p>
                  </div>
                ) : auditData ? (
                  <div className="space-y-6">
                    {/* Top KPI Score Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 rounded-xl border border-[#262118] bg-[#110F0B] space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#948873]">Artistry Quality Index</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-4xl font-bold text-[#E6E5E4]">{auditData.overallScore}</span>
                          <span className="text-xs text-emerald-400 font-mono">/ 100 Exemplary</span>
                        </div>
                        <p className="text-[11px] text-[#ADA69A]">Benchmark against top Parisian & Milan ateliers.</p>
                      </div>

                      <div className="p-5 rounded-xl border border-[#262118] bg-[#110F0B] space-y-2 md:col-span-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#948873]">Sentiment Breakdown</span>
                        <div className="space-y-2 pt-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-400 font-medium">Positive {auditData.sentimentDistribution?.positive || 94}%</span>
                            <span className="text-amber-300 font-medium">Neutral {auditData.sentimentDistribution?.neutral || 5}%</span>
                            <span className="text-[#ADA69A] font-medium">Constructive {auditData.sentimentDistribution?.constructive || 1}%</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-[#1F1B14] overflow-hidden flex">
                            <div style={{ width: `${auditData.sentimentDistribution?.positive || 94}%` }} className="bg-emerald-500 h-full" />
                            <div style={{ width: `${auditData.sentimentDistribution?.neutral || 5}%` }} className="bg-amber-400 h-full" />
                            <div style={{ width: `${auditData.sentimentDistribution?.constructive || 1}%` }} className="bg-rose-500 h-full" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Strengths & Improvements Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Strengths */}
                      <div className="p-5 rounded-xl border border-[#221E16] bg-[#110E0A] space-y-3">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 font-semibold">
                          <Check className="h-4 w-4" />
                          Validated Artistry Strengths
                        </h4>
                        <ul className="space-y-2.5">
                          {auditData.strengths?.map((str: string, i: number) => (
                            <li key={i} className="text-xs text-[#E6E5E4] flex items-start gap-2 bg-[#18150F] p-3 rounded-lg border border-[#28231A]">
                              <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Constructive Refinements */}
                      <div className="p-5 rounded-xl border border-[#221E16] bg-[#110E0A] space-y-3">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-[#E6E5E4] flex items-center gap-1.5 font-semibold">
                          <AlertCircle className="h-4 w-4 text-[#E6E5E4]" />
                          Refinement Opportunities
                        </h4>
                        <ul className="space-y-2.5">
                          {auditData.improvements?.map((imp: string, i: number) => (
                            <li key={i} className="text-xs text-[#ADA69A] flex items-start gap-2 bg-[#18150F] p-3 rounded-lg border border-[#28231A]">
                              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Actionable Implementation Plan */}
                    <div className="p-6 rounded-2xl border border-[#3A3225] bg-[#14110C] space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-[#E6E5E4] flex items-center gap-2 font-semibold">
                        <TrendingUp className="h-4 w-4 text-accent-text" />
                        Studio Director Actionable Roadmap
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {auditData.actionablePlan?.map((plan: string, i: number) => (
                          <div key={i} className="p-3.5 rounded-xl border border-[#2B251B] bg-[#0C0B08] space-y-1">
                            <span className="text-[10px] font-mono text-accent-text font-bold">INITIATIVE 0{i + 1}</span>
                            <p className="text-xs text-[#E6E5E4] leading-relaxed">{plan}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Calendar, MapPin, Clock, DollarSign, XCircle, Star, MessageSquarePlus, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Booking, Review, User } from '../types';

interface ClientPortalProps {
  currentUser: User | null;
  userEmail: string;
  setUserEmail: (email: string) => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export default function ClientPortal({ 
  currentUser,
  userEmail, 
  setUserEmail,
  onOpenAuth 
}: ClientPortalProps) {
  const [emailInput, setEmailInput] = useState(userEmail);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync email input if userEmail changes
  useEffect(() => {
    setEmailInput(userEmail);
  }, [userEmail]);

  // Review states
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Fetch bookings on mount or when email updates
  useEffect(() => {
    if (userEmail) {
      fetchBookings();
    }
  }, [userEmail]);

  const fetchBookings = async () => {
    setLoadingBookings(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings?email=${encodeURIComponent(userEmail)}`);
      if (!res.ok) throw new Error('Failed to retrieve bookings.');
      const data = await res.json();
      // Sort bookings: newest first
      data.sort((a: Booking, b: Booking) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setUserEmail(emailInput);
  };

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this beauty booking?')) return;
    
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (err) {
      console.error('Failed to cancel appointment', err);
    }
  };

  const handleOpenReviewForm = (booking: Booking) => {
    setSelectedBookingForReview(booking);
    setReviewRating(5);
    setReviewText('');
    setReviewSuccess(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview || !reviewText.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: selectedBookingForReview.salonId,
          clientName: selectedBookingForReview.clientName,
          rating: reviewRating,
          text: reviewText
        })
      });

      if (res.ok) {
        setReviewSuccess(true);
        // Mark the booking as completed/reviewed locally so they don't review twice in same session if desired
        setTimeout(() => {
          setSelectedBookingForReview(null);
          setReviewSuccess(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Review submission failed', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return <span className="rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-[9px] font-mono text-yellow-500 uppercase">Pending Review</span>;
      case 'confirmed':
        return <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[9px] font-mono text-blue-400 uppercase">Confirmed</span>;
      case 'completed':
        return <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-mono text-emerald-400 uppercase">Completed</span>;
      case 'cancelled':
        return <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[9px] font-mono text-red-400 uppercase">Cancelled</span>;
    }
  };

  const formattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Account Status / Sync bar */}
      {currentUser ? (
        <div className="rounded-2xl border border-[#574D3C]/30 bg-gradient-to-r from-[#17140F] to-[#100E0A] p-5 shadow-lg mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-full overflow-hidden border border-[#574D3C]/60 bg-[#201C15] flex items-center justify-center shrink-0">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
              ) : (
                <span className="font-serif text-lg text-[#E6E5E4]">{currentUser.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif text-base font-semibold text-[#E6E5E4]">{currentUser.name}</h3>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#574D3C]/20 text-[#E6E5E4] border border-[#574D3C]/40">
                  {currentUser.role === 'provider' ? 'Studio Director' : 'VIP Client'}
                </span>
              </div>
              <p className="text-xs text-[#A79F92]">
                Syncing makeup appointments for <span className="text-[#E6E5E4] font-mono">{userEmail}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onOpenAuth('signin')}
              className="text-xs font-mono text-[#E6E5E4] hover:text-white px-3 py-1.5 rounded-lg border border-[#2B251B] bg-[#15120D] hover:border-[#574D3C]/50 transition-colors"
            >
              Switch Account
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#574D3C]/40 bg-gradient-to-br from-[#18150F] to-[#100E0A] p-6 shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 rounded-full bg-[#574D3C]/20 px-3 py-1 text-[11px] text-[#E6E5E4] border border-[#574D3C]/40 mb-2">
                <Sparkles className="h-3 w-3 text-[#E6E5E4]" />
                <span>Leish! Member Portal</span>
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#E6E5E4]">Sign in to Access Your Appointments</h2>
              <p className="text-xs text-[#ADA69A] max-w-md mt-1">
                Keep track of upcoming sessions, manage booking cancellations, and write verified reviews for your favorite ateliers.
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                className="rounded-xl border border-[#2F291E] bg-[#12100C] px-4 py-2.5 text-xs font-medium text-[#E6E5E4] hover:border-[#574D3C] hover:bg-[#1A1610] transition-all"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="rounded-xl bg-[#574D3C] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#574D3C]/20 hover:brightness-110 transition-all"
              >
                Create Account
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#221E16]">
            <p className="text-[11px] font-mono text-[#918570] mb-2 uppercase tracking-wider">
              Or Lookup Guest Reservation By Email:
            </p>
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#746853]" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="w-full rounded-xl border border-accent-soft bg-[#15120D] pl-10 pr-4 py-2 text-xs text-[#E6E5E4] placeholder-[#746853] focus:border-accent-strong focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border border-[#3F3729] bg-[#1F1B14] px-4 py-2 text-xs font-medium text-[#E6E5E4] hover:border-[#574D3C] transition-colors shrink-0"
              >
                Find My Bookings
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#221E16] pb-3">
          <h2 className="font-serif text-xl font-bold text-[#E6E5E4]">Appointments Feed</h2>
          <span className="font-mono text-xs text-[#ADA69A]">{bookings.length} reservations</span>
        </div>

        {loadingBookings ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-accent-text" />
          </div>
        ) : error ? (
          <div className="text-center py-12 border border-[#574D3C]/20 bg-[#574D3C]/5 rounded-xl text-xs text-[#E6E5E4] space-y-2">
            <AlertCircle className="h-6 w-6 text-accent-text mx-auto" />
            <p>{error}</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 border border-[#221E16] rounded-2xl bg-[#14110C] space-y-3">
            <Calendar className="h-8 w-8 text-[#746853] mx-auto" />
            <div className="space-y-1">
              <p className="font-serif text-sm font-semibold text-[#E6E5E4]">No booked appointments found</p>
              <p className="text-xs text-[#ADA69A] max-w-xs mx-auto">Discover hair, nails, and facials on our home tab to lock in your first premium reservation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border border-[#221E16] bg-[#14110C] p-5 sm:p-6 hover:border-[#3C3427] transition-all duration-300 space-y-4"
              >
                {/* 1. Header block */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#221E16]/50 pb-3 gap-2">
                  <div>
                    <h3 className="font-sans font-bold text-sm text-[#E6E5E4]">{booking.serviceName}</h3>
                    <p className="text-xs text-[#E6E5E4] font-serif mt-0.5">{booking.salonName}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(booking.status)}
                    <span className="text-[10px] font-mono text-[#746853]">#{booking.id}</span>
                  </div>
                </div>

                {/* 2. Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-[#746853] uppercase">Schedule</p>
                    <div className="flex items-center space-x-1 text-[#ADA69A]">
                      <Calendar className="h-3.5 w-3.5 text-accent-text shrink-0" />
                      <span className="truncate">{formattedDate(booking.date)}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[9px] text-[#746853] uppercase">Time</p>
                    <div className="flex items-center space-x-1 text-[#ADA69A]">
                      <Clock className="h-3.5 w-3.5 text-accent-text shrink-0" />
                      <span>{booking.time} ({booking.serviceDuration} min)</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[9px] text-[#746853] uppercase">Specialist</p>
                    <div className="flex items-center space-x-1 text-[#ADA69A]">
                      <CheckCircle className="h-3.5 w-3.5 text-accent-text shrink-0" />
                      <span className="truncate">{booking.staffName}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[9px] text-[#746853] uppercase">Paid Amount</p>
                    <div className="flex items-center space-x-1 text-[#E6E5E4]">
                      <DollarSign className="h-3.5 w-3.5 text-accent-text shrink-0" />
                      <span className="font-bold text-sm font-serif">${booking.servicePrice}</span>
                    </div>
                  </div>
                </div>

                {booking.isLocationEvent && booking.eventVenue && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-200/90 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                    <span className="font-mono text-[10px] uppercase font-bold text-amber-400">On-Location Destination:</span>
                    <span className="truncate">{booking.eventVenue}</span>
                  </div>
                )}

                {booking.attachedMoodboard && (
                  <div className="p-3 rounded-lg bg-[#574D3C]/10 border border-[#574D3C]/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-[#E6E5E4] font-semibold">
                        Attached Artistry Lookbook
                      </span>
                      <span className="text-xs font-serif font-bold text-[#E6E5E4]">
                        {booking.attachedMoodboard.lookName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {booking.attachedMoodboard.palette?.map((swatch, idx) => (
                        <div 
                          key={idx} 
                          title={swatch.name}
                          className="h-3 w-3 rounded-full border border-white/20"
                          style={{ backgroundColor: swatch.hex }}
                        />
                      ))}
                      <span className="text-[10px] text-[#ADA69A] ml-2 truncate">
                        {booking.attachedMoodboard.lipFormula}
                      </span>
                    </div>
                  </div>
                )}

                {booking.notes && (
                  <p className="text-xs leading-relaxed text-[#746853] italic bg-[#221E16]/20 p-2.5 rounded-lg border border-[#221E16]">
                    Notes: "{booking.notes}"
                  </p>
                )}

                {/* 3. Action Buttons */}
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#221E16]/50">
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="inline-flex items-center space-x-1.5 rounded-lg border border-[#574D3C]/20 bg-[#574D3C]/5 text-red-400 hover:bg-[#574D3C]/10 px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Cancel Appointment</span>
                    </button>
                  )}

                  {booking.status === 'completed' && (
                    <button
                      onClick={() => handleOpenReviewForm(booking)}
                      className="inline-flex items-center space-x-1.5 rounded-lg border border-[#E6E5E4]/10 bg-[#E6E5E4]/5 text-[#E6E5E4] hover:bg-[#E6E5E4]/10 px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5 text-[#E6E5E4]" />
                      <span>Leave Studio Review</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Submission Popup overlay */}
      <AnimatePresence>
        {selectedBookingForReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBookingForReview(null)}
              className="absolute inset-0 bg-[#0F0D0A]/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-[#221E16] bg-[#14110C] p-6 shadow-2xl"
            >
              {reviewSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="font-serif text-lg font-medium text-[#E6E5E4]">Review Submitted!</h3>
                  <p className="text-xs text-[#ADA69A]">Thank you for sharing your experience at {selectedBookingForReview.salonName}.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-base font-semibold text-[#E6E5E4]">Leave Customer Review</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForReview(null)}
                      className="text-[#ADA69A] hover:text-[#E6E5E4]"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#ADA69A]">
                    Rate your {selectedBookingForReview.serviceName} at {selectedBookingForReview.salonName}.
                  </p>

                  {/* Rating Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block">Rating Star Scale</label>
                    <div className="flex space-x-1.5 pt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="text-[#ADA69A] hover:scale-115 transition-transform"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-[#3C3427]'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-[#E6E5E4] uppercase block">Detailed Feedback</label>
                    <textarea
                      required
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Tell other clients about the service, stylist attention, and salon environment..."
                      rows={4}
                      className="w-full rounded-lg border border-accent-soft bg-[#221E16]/40 px-3 py-2.5 text-xs sm:text-sm text-[#E6E5E4] placeholder-[#746853] focus:border-accent-strong focus:outline-none focus:ring-1 focus:ring-accent-strong"
                    />
                  </div>

                  {/* CTAs */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForReview(null)}
                      className="w-1/3 rounded-lg border border-[#221E16] py-2 text-xs font-semibold text-[#ADA69A] hover:bg-[#221E16]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="flex-1 flex items-center justify-center space-x-1.5 rounded-lg bg-[#574D3C] py-2 text-xs font-semibold text-[#E6E5E4] hover:bg-[#796D59] disabled:opacity-50"
                    >
                      {submittingReview ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Post Review</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

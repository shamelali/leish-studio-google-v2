/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Star, MapPin, Clock, Calendar, MessageSquare, Sparkles, Loader2, Car, Calculator } from 'lucide-react';
import { Salon, Service, Review } from '../types';

interface SalonDetailsProps {
  salon: Salon;
  onBack: () => void;
  onInitiateBooking: (service: Service) => void;
}

interface AISummary {
  vibe: string;
  bestFor: string;
  tip: string;
}

const categoryLabels: Record<string, string> = {
  bridal: 'Bridal & Ceremony',
  editorial: 'Editorial & Red Carpet',
  'soft-glam': 'Soft Glam',
  airbrush: 'HD Airbrush',
  masterclass: 'Masterclass',
};

export default function SalonDetails({ salon, onBack, onInitiateBooking }: SalonDetailsProps) {
  const [activeTab, setActiveTab] = useState<'services' | 'staff' | 'reviews'>('services');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  // AI summary states
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Venue travel calculator state
  const [venueInput, setVenueInput] = useState('');
  const [calculatingTravel, setCalculatingTravel] = useState(false);
  const [travelQuote, setTravelQuote] = useState<{
    distanceMiles: number;
    estimatedDriveMinutes: number;
    totalTravelFee: number;
    baseKitFee: number;
    mileageFee: number;
  } | null>(null);

  const handleEstimateTravel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueInput.trim()) return;
    setCalculatingTravel(true);
    try {
      const res = await fetch('/api/venue/estimate-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon.id,
          venue: venueInput
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTravelQuote(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCalculatingTravel(false);
    }
  };

  // Fetch reviews for this salon
  useEffect(() => {
    const fetchReviews = async () => {
      setLoadingReviews(true);
      try {
        const res = await fetch(`/api/reviews/${salon.id}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data);
        }
      } catch (err) {
        console.error('Failed to load reviews', err);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
    fetchAISummary();
  }, [salon.id]);

  const fetchAISummary = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch('/api/gemini/summarize-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: salon.id })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data);
      }
    } catch (err) {
      console.error('Failed to compile AI review summary', err);
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back to discovery button */}
      <button
        onClick={onBack}
        className="inline-flex items-center space-x-2 rounded-full border border-[#221F1D] bg-[#141211] px-4 py-2 text-xs font-semibold text-[#C5BDB6] transition-all hover:bg-[#1E1A17] hover:text-[#FAF8F5] mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Marketplace</span>
      </button>

      {/* Salon Cover & Hero header */}
      <div className="relative h-[250px] sm:h-[350px] w-full overflow-hidden rounded-2xl border border-[#221F1D]">
        <img
          src={salon.image}
          alt={salon.name}
          className="h-full w-full object-cover brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0B0A] via-[#0D0B0A]/40 to-transparent" />
        
        {/* Absolute Details over image */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3">
          <div className="inline-flex items-center rounded-full bg-[#9A1A18] px-3 py-0.5 text-[10px] font-mono tracking-widest text-[#FAF8F5] uppercase">
            {categoryLabels[salon.category] || salon.category} Studio
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#FAF8F5] sm:text-4xl md:text-5xl">
            {salon.name}
          </h1>
          <p className="font-serif text-sm sm:text-base italic text-[#E9D2C4]">
            {salon.tagline}
          </p>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-xs text-[#C5BDB6] font-mono">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-[#FAF8F5]">{salon.rating}</span>
              <span>({salon.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4 text-[#9A1A18]" />
              <span>{salon.address}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Columns (Services list & Staff info & Reviews) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tabs header */}
          <div className="flex space-x-1 border-b border-[#221F1D] pb-px">
            {(['services', 'staff', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-xs sm:text-sm font-semibold tracking-wide border-b-2 transition-all capitalize cursor-pointer ${
                  activeTab === tab
                    ? 'border-[#9A1A18] text-[#FAF8F5]'
                    : 'border-transparent text-[#C5BDB6] hover:text-[#FAF8F5]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="min-h-[300px]">
            {activeTab === 'services' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  {salon.services.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-xl border border-[#221F1D] bg-[#141211] p-5 hover:border-[#383330] transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-sans font-bold text-sm text-[#FAF8F5]">{service.name}</h3>
                          <span className="text-[10px] font-mono text-[#E9D2C4] bg-[#1E1A17] px-2 py-0.5 rounded">
                            {service.duration} mins
                          </span>
                        </div>
                        <p className="text-xs text-[#C5BDB6] leading-relaxed font-serif italic">
                          {service.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end shrink-0 pt-2 sm:pt-0">
                        <span className="font-serif font-bold text-base text-[#FAF8F5] sm:mb-2">
                          ${service.price}
                        </span>
                        <button
                          onClick={() => onInitiateBooking(service)}
                          className="rounded-lg bg-[#9A1A18] px-4 py-2 text-xs font-semibold text-[#FAF8F5] hover:bg-[#C82A27] transition-all duration-300 flex items-center space-x-1.5 shadow-md shadow-[#9A1A18]/10 cursor-pointer"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Reserve Slot</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'staff' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {salon.staff.map((staff) => (
                  <div
                    key={staff.id}
                    className="flex items-center space-x-4 rounded-xl border border-[#221F1D] bg-[#141211] p-4"
                  >
                    <img
                      src={staff.avatar}
                      alt={staff.name}
                      className="h-16 w-16 rounded-full object-cover grayscale border border-[#383330]"
                    />
                    <div>
                      <h3 className="font-sans font-bold text-sm text-[#FAF8F5]">{staff.name}</h3>
                      <p className="text-xs text-[#E9D2C4] font-serif">{staff.role}</p>
                      <div className="flex items-center space-x-1 mt-1 text-[10px] font-mono text-[#C5BDB6]">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-[#FAF8F5]">{staff.rating}</span>
                        <span>Expertise</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {loadingReviews ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-[#9A1A18]" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-10 border border-[#221F1D] rounded-xl bg-[#141211]">
                    <p className="text-xs text-[#C5BDB6]">No customer reviews posted yet. Be the first to share your experience!</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-[#221F1D] bg-[#141211] p-5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-[#FAF8F5]">{review.clientName}</p>
                          <p className="text-[10px] text-[#6E645E] font-mono">{review.date}</p>
                        </div>
                        <div className="flex space-x-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-[#383330]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed text-[#C5BDB6] font-serif italic">
                        "{review.text}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (Working Hours & Gemini AI Summarized Reviews Card) */}
        <div className="space-y-6">
          {/* 1. Working Hours Box */}
          <div className="rounded-xl border border-[#221F1D] bg-[#141211] p-5 space-y-4">
            <h3 className="flex items-center space-x-2 font-serif text-sm font-semibold text-[#FAF8F5]">
              <Clock className="h-4 w-4 text-[#9A1A18]" />
              <span>Salon Working Hours</span>
            </h3>
            <div className="space-y-2 text-xs">
              {Object.entries(salon.workingHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between border-b border-[#221F1D]/50 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-[#C5BDB6] font-mono">{day}</span>
                  <span className={`font-semibold ${hours === 'Closed' ? 'text-[#9A1A18]' : 'text-[#FAF8F5]'}`}>
                    {hours}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Gemini AI Review Insights Card */}
          <div className="rounded-xl border border-[#9A1A18]/20 bg-[#1E1311]/40 p-5 space-y-4 relative overflow-hidden">
            {/* Visual Aura */}
            <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[#9A1A18]/10 blur-xl" />
            
            <div className="flex items-center justify-between">
              <h3 className="flex items-center space-x-2 font-serif text-sm font-semibold text-[#FAF8F5]">
                <Sparkles className="h-4 w-4 text-[#9A1A18]" />
                <span>AI Review Takeaways</span>
              </h3>
              <span className="rounded bg-[#9A1A18]/10 px-2 py-0.5 text-[8px] font-mono text-[#E9D2C4] uppercase">
                Gemini
              </span>
            </div>

            {loadingAI ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#9A1A18]" />
                <span className="text-[10px] text-[#C5BDB6] font-mono animate-pulse">Reading reviews...</span>
              </div>
            ) : aiSummary ? (
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-[#E9D2C4] uppercase">Atmosphere</p>
                  <p className="text-[#C5BDB6] italic font-serif leading-relaxed">"{aiSummary.vibe}"</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-[#E9D2C4] uppercase">What They Do Best</p>
                  <p className="text-[#C5BDB6] italic font-serif leading-relaxed">"{aiSummary.bestFor}"</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-[#E9D2C4] uppercase">Expert Booking Tip</p>
                  <p className="text-[#C5BDB6] italic font-serif leading-relaxed">"{aiSummary.tip}"</p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#C5BDB6]">Review takeaways will formulate shortly.</p>
            )}
          </div>

          {/* 3. On-Location Venue Travel Calculator Card */}
          <div className="rounded-xl border border-[#2B221E] bg-[#14100E] p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center space-x-2 font-serif text-sm font-semibold text-[#FAF8F5]">
                <Car className="h-4 w-4 text-[#9A1A18]" />
                <span>On-Location Travel Quote</span>
              </h3>
              <span className="text-[10px] font-mono text-[#E9D2C4] uppercase">Mobile MUA</span>
            </div>
            <p className="text-xs text-[#8E867E]">
              Hosting a wedding suite, gala, or hotel prep? Calculate our mobile glam squad travel rate to your venue.
            </p>

            <form onSubmit={handleEstimateTravel} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={venueInput}
                  onChange={(e) => setVenueInput(e.target.value)}
                  placeholder="e.g. The Ritz-Carlton, Penthouse Ballroom"
                  className="flex-1 rounded-lg border border-[#2E241F] bg-[#0A0807] px-3 py-2 text-xs text-[#FAF8F5] placeholder-[#5C534D] focus:border-[#9A1A18] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={calculatingTravel || !venueInput.trim()}
                  className="px-3 py-2 rounded-lg bg-[#9A1A18] hover:bg-[#C82A27] text-[#FAF8F5] text-xs font-mono disabled:opacity-50 shrink-0 font-semibold transition-colors"
                >
                  {calculatingTravel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Quote'}
                </button>
              </div>

              {travelQuote && (
                <div className="p-3 rounded-lg bg-[#1B1412] border border-[#3A2821] text-xs space-y-1.5 mt-2">
                  <div className="flex justify-between font-medium text-[#FAF8F5]">
                    <span>Distance: {travelQuote.distanceMiles} miles</span>
                    <span>~{travelQuote.estimatedDriveMinutes} mins drive</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#A89F91]">
                    <span>Kit setup ($50) + mileage (${travelQuote.mileageFee})</span>
                    <span className="font-serif font-bold text-sm text-[#E9D2C4]">${travelQuote.totalTravelFee}</span>
                  </div>
                  <p className="text-[10px] text-[#786D65] italic">
                    Includes sanitized pro lighting, artist mirrors, and on-time arrival guarantee.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

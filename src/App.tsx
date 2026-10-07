/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Star, MapPin, Calendar, Heart, Shield, RefreshCw, Loader2, Compass, Building2, User as UserIconAlt, Map as MapIcon, ShieldCheck, Car, Image as ImageIcon, Check, Filter, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import Navbar from './components/Navbar';
import SalonCard from './components/SalonCard';
import SalonDetails from './components/SalonDetails';
import AIStylist from './components/AIStylist';
import BookingModal from './components/BookingModal';
import ClientPortal from './components/ClientPortal';
import ProviderDashboard from './components/ProviderDashboard';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import LookbookStudio from './components/LookbookStudio';
import MUACard from './components/MUACard';
import InteractiveMap from './components/InteractiveMap';
import WorkspaceHub from './components/WorkspaceHub';
import LoadingSpinner from './components/LoadingSpinner';
import { Salon, Service, Booking, User, LookbookItem } from './types';
import { useSalons } from './lib/api';
import { useStore } from './lib/store';

export default function App() {
  const {
    currentUser, setCurrentUser,
    activeTab, setActiveTab,
    selectedSalon, setSelectedSalon,
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    listingTypeFilter, setListingTypeFilter,
  } = useStore();

  const { data: salons = [], isLoading, error } = useSalons();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [authPromptMessage, setAuthPromptMessage] = useState<string | undefined>(undefined);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Booking states
  const [activeBookingSalon, setActiveBookingSalon] = useState<Salon | null>(null);
  const [activeBookingService, setActiveBookingService] = useState<Service | null>(null);
  const [activeBookingMoodboard, setActiveBookingMoodboard] = useState<LookbookItem | null>(null);

  // Client identifier preset
  const [userEmail, setUserEmail] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('leish_auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.email) return u.email;
      }
    } catch {}
    return 'shamelali@gmail.com';
  });

  // Hero Section Image Gallery curation
  const CURATED_HERO_IMAGES = [
    {
      id: 'backstage-glam',
      title: 'Haute Couture Backstage',
      desc: 'Editorial contouring and backstage lighting',
      url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1600',
    },
    {
      id: 'golden-radiance',
      title: 'Golden Glow & Brushes',
      desc: 'Champagne radiance and metallic luxury pigments',
      url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=1600',
    },
    {
      id: 'bridal-elegance',
      title: 'Bridal Atelier Grace',
      desc: 'Soft veil artistry and porcelain airbrushed skin',
      url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=1600',
    },
    {
      id: 'avant-garde',
      title: 'Avant-Garde Studio',
      desc: 'High-fashion editorial graphic liner & runway bold',
      url: 'https://images.unsplash.com/photo-1503236823255-94609f598e71?auto=format&fit=crop&q=80&w=1600',
    },
    {
      id: 'velvet-atelier',
      title: 'Velvet Atelier Palette',
      desc: 'Handcrafted pigment mixing and bespoke kits',
      url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=1600',
    },
  ];

  const [currentHeroImage, setCurrentHeroImage] = useState<string>(() => {
    return localStorage.getItem('leish_hero_image') || CURATED_HERO_IMAGES[0].url;
  });
  const [heroPickerOpen, setHeroPickerOpen] = useState(false);
  const [customHeroUrl, setCustomHeroUrl] = useState('');

  // Rating filter & sorting state
  const [minRatingFilter, setMinRatingFilter] = useState<number | 'all'>('all');
  const [topRatedOnly, setTopRatedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'rating-desc' | 'reviews-desc' | 'default'>('rating-desc');

  // Categories list exclusively for MVP launch with makeup studios
  const categories = [
    { id: 'all', label: 'All Studios' },
    { id: 'bridal', label: 'Bridal & Ceremony' },
    { id: 'editorial', label: 'Editorial & Red Carpet' },
    { id: 'soft-glam', label: 'Soft Glam & Natural' },
    { id: 'airbrush', label: 'Airbrush & HD Camera' },
    { id: 'masterclass', label: 'Masterclasses & Lessons' },
  ];

  const handleAuthSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setUserEmail(user.email);
    try {
      localStorage.setItem('leish_auth_user', JSON.stringify(user));
      localStorage.setItem('leish_auth_token', token);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('leish_auth_user');
      localStorage.removeItem('leish_auth_token');
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateUser = (updated: User) => {
    setCurrentUser(updated);
    setUserEmail(updated.email);
    try {
      localStorage.setItem('leish_auth_user', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin', prompt?: string) => {
    setAuthModalMode(mode);
    setAuthPromptMessage(prompt);
    setAuthModalOpen(true);
  };

  const initiateBooking = (salon: Salon, service: Service) => {
    setActiveBookingSalon(salon);
    setActiveBookingService(service);
    setActiveBookingMoodboard(null);
  };

  const handleBookLook = (salon: Salon, service: Service, moodboard: LookbookItem) => {
    setActiveBookingSalon(salon);
    setActiveBookingService(service);
    setActiveBookingMoodboard(moodboard);
  };

  const handleBookingSuccess = (booking: Booking) => {
    setTimeout(() => {
      setActiveBookingSalon(null);
      setActiveBookingService(null);
      setActiveBookingMoodboard(null);
      setActiveTab('client');
    }, 1800);
  };

  // Filtered and Sorted Salons computation
  const filteredSalons = salons
    .filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;

      const effectiveMinRating = topRatedOnly ? 4.8 : (minRatingFilter === 'all' ? 0 : Number(minRatingFilter));
      const matchesRating = s.rating >= effectiveMinRating;

      return matchesSearch && matchesCategory && matchesRating;
    })
    .sort((a, b) => {
      if (sortBy === 'rating-desc') {
        return b.rating - a.rating;
      }
      if (sortBy === 'reviews-desc') {
        return b.reviewCount - a.reviewCount;
      }
      return 0;
    });

  const filteredMUAs = filteredSalons.filter(s => s.type === 'mua');
  const filteredStudios = filteredSalons.filter(s => s.type !== 'mua');

  if (isLoading) return <LoadingSpinner size="lg" message="Synchronizing artists and studios..." />;
  if (error) return <div className="min-h-screen bg-[#0F0D0A] flex items-center justify-center text-red-400">Error loading salons</div>;

  return (
    <div className="min-h-screen bg-[#0F0D0A] text-[#E6E5E4] flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {activeTab === 'explore' && (
            <motion.div
              key="explore-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {!selectedSalon ? (
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
                  <div className="relative rounded-3xl overflow-hidden border border-[#221E16] min-h-[460px] flex flex-col justify-end p-6 sm:p-12 shadow-2xl">
                    <img
                      src={currentHeroImage}
                      alt="Leish! Haute Couture Makeup Artistry"
                      className="absolute inset-0 h-full w-full object-cover object-center filter brightness-[0.38] scale-105 transition-all duration-700"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F0D0A] via-[#0F0D0A]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0F0D0A]/95 via-[#0F0D0A]/50 to-transparent" />

                    <div className="absolute top-10 right-10 w-96 h-96 rounded-full bg-[#574D3C]/15 blur-3xl pointer-events-none" />

                    <div className="absolute top-6 right-6 z-20">
                      <button
                        type="button"
                        onClick={() => setHeroPickerOpen(!heroPickerOpen)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-[#E6E5E4] text-xs font-mono backdrop-blur-md transition-all shadow-xl hover:border-[#574D3C] cursor-pointer"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-[#E6E5E4]" />
                        <span>Curate Hero Image</span>
                      </button>

                      {heroPickerOpen && (
                        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#3E3628] bg-[#0F0D0A]/95 backdrop-blur-xl p-4 shadow-2xl space-y-3 z-30">
                          <div className="flex items-center justify-between border-b border-[#221E16] pb-2">
                            <span className="text-xs font-mono font-bold text-[#E6E5E4] uppercase">
                              Select Editorial Hero Photo
                            </span>
                            <button
                              type="button"
                              onClick={() => setHeroPickerOpen(false)}
                              className="text-xs text-[#968B78] hover:text-white"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {CURATED_HERO_IMAGES.map((img) => {
                              const isSelected = currentHeroImage === img.url;
                              return (
                                <button
                                  key={img.id}
                                  type="button"
                                  onClick={() => {
                                    setCurrentHeroImage(img.url);
                                    localStorage.setItem('leish_hero_image', img.url);
                                    setHeroPickerOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#574D3C]/20 border-[#574D3C]'
                                      : 'bg-[#221E16] border-[#221E16] hover:border-[#3E3628]'
                                  }`}
                                >
                                  <img
                                    src={img.url}
                                    alt={img.title}
                                    className="h-12 w-12 rounded-lg object-cover shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-[#E6E5E4] truncate block">
                                        {img.title}
                                      </span>
                                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 ml-1" />}
                                    </div>
                                    <span className="text-[10px] text-[#ADA69A] line-clamp-1 block">
                                      {img.desc}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-[#221E16] space-y-2">
                            <span className="text-[10px] font-mono text-[#ADA69A] block">Or enter custom image URL:</span>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={customHeroUrl}
                                onChange={(e) => setCustomHeroUrl(e.target.value)}
                                placeholder="https://..."
                                className="flex-1 rounded-lg border border-accent-soft bg-[#221E16] px-2.5 py-1.5 text-xs text-[#E6E5E4] focus:border-accent-strong focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (customHeroUrl.trim()) {
                                    setCurrentHeroImage(customHeroUrl.trim());
                                    localStorage.setItem('leish_hero_image', customHeroUrl.trim());
                                    setHeroPickerOpen(false);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#574D3C] text-white text-xs font-bold cursor-pointer"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative z-10 max-w-3xl space-y-6">
                      <div className="inline-flex items-center space-x-2 rounded-full border border-[#574D3C]/60 bg-black/60 backdrop-blur-md px-4 py-1.5 text-xs text-[#E6E5E4] font-mono shadow-md">
                        <Sparkles className="h-3.5 w-3.5 text-[#E6E5E4]" />
                        <span>Curated Haute Makeup Studios & Independent MUAs</span>
                      </div>

                      <div className="space-y-3">
                        <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#E6E5E4] leading-tight">
                          Couture Makeup & <br />
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E6E5E4] via-[#E6E5E4] to-[#E6E5E4]">
                            Red Carpet Artistry
                          </span>
                        </h1>

                        <p className="text-sm sm:text-base text-[#D2D0CC] max-w-xl leading-relaxed">
                          Leish! separates and connects you directly with both verified Independent Makeup Artists (MUAs) with mobile glam kits and premier physical boutique ateliers.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] font-mono text-[#E6E5E4]">
                        <span className="px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm flex items-center gap-1.5">
                          <UserIconAlt className="h-3 w-3 text-accent-text" />
                          <span>4 Verified Celebrity MUAs</span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 text-accent-text" />
                          <span>6 Flagship Beauty Ateliers</span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm flex items-center gap-1.5">
                          <Car className="h-3 w-3 text-emerald-400" />
                          <span>Klang Valley Dispatch</span>
                        </span>
                      </div>

                      <div className="rounded-2xl border border-[#3E3628] bg-[#0F0D0A]/95 backdrop-blur-md p-3.5 shadow-xl space-y-3 max-w-2xl">
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#968B78]" />
                          <input
                            id="hero-search"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search MUA artists by name, studios, bridal cut-creases, soft glam..."
                            className="w-full rounded-xl border border-accent-soft bg-[#221E16] pl-11 pr-4 py-3 text-xs sm:text-sm text-[#E6E5E4] placeholder-[#968B78] focus:border-accent-strong focus:outline-none"
                          />
                        </div>

                        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide border transition-all duration-300 shrink-0 cursor-pointer ${
                                selectedCategory === cat.id
                                  ? 'bg-[#574D3C] border-[#574D3C] text-[#E6E5E4]'
                                  : 'bg-[#1C1811] border-[#2B251B] text-[#ADA69A] hover:border-[#3E3628] hover:text-[#E6E5E4]'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#241F17] pb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-accent-text block font-bold">
                        Aesthetic Directory
                      </span>
                      <h2 className="font-serif text-2xl font-bold text-[#E6E5E4]">
                        Explore by Category
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0F0D0A] border border-[#221E16] overflow-x-auto scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setListingTypeFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
                          listingTypeFilter === 'all'
                            ? 'bg-[#574D3C] text-white shadow-sm font-bold'
                            : 'text-[#ADA69A] hover:text-white'
                        }`}
                      >
                        All Listings ({filteredSalons.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setListingTypeFilter('muas')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
                          listingTypeFilter === 'muas'
                            ? 'bg-[#574D3C] text-white shadow-sm font-bold'
                            : 'text-[#ADA69A] hover:text-white'
                        }`}
                      >
                        <UserIconAlt className="h-3.5 w-3.5" />
                        <span>Independent MUAs ({filteredMUAs.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setListingTypeFilter('studios')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
                          listingTypeFilter === 'studios'
                            ? 'bg-[#574D3C] text-white shadow-sm font-bold'
                            : 'text-[#ADA69A] hover:text-white'
                        }`}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Luxury Studios ({filteredStudios.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setListingTypeFilter('map')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
                          listingTypeFilter === 'map'
                            ? 'bg-[#574D3C] text-white shadow-sm font-bold'
                            : 'text-[#ADA69A] hover:text-white'
                        }`}
                      >
                        <MapIcon className="h-3.5 w-3.5" />
                        <span>Map Locator</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-16">
                    {(listingTypeFilter === 'all' || listingTypeFilter === 'muas') && (
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#241F17] pb-3">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#E6E5E4]">
                              <ShieldCheck className="h-4 w-4 text-emerald-400" />
                              <span>Verified Freelance & Celebrity Artists</span>
                            </div>
                            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#E6E5E4]">
                              Independent Makeup Artists (MUAs)
                            </h3>
                            <p className="text-xs text-[#ADA69A]">
                              Elite pro artists with customized pro kits, mobile on-location dispatch, and direct personal booking.
                            </p>
                          </div>
                          <span className="font-mono text-xs text-[#968B78] shrink-0">
                            {filteredMUAs.length} Available Artists
                          </span>
                        </div>

                        {filteredMUAs.length === 0 ? (
                          <div className="text-center py-12 border border-[#221E16] rounded-2xl bg-[#0F0D0A] text-[#ADA69A] text-xs">
                            No independent MUAs match your current category or keyword filter.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filteredMUAs.map((mua) => (
                              <MUACard
                                key={mua.id}
                                mua={mua}
                                onClick={() => setSelectedSalon(mua)}
                                onBookDirect={() => {
                                  if (mua.services[0]) {
                                    initiateBooking(mua, mua.services[0]);
                                  }
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(listingTypeFilter === 'all' || listingTypeFilter === 'studios') && (
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#241F17] pb-3">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#E6E5E4]">
                              <Building2 className="h-4 w-4 text-accent-text" />
                              <span>Flagship Boutiques & Academies</span>
                            </div>
                            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#E6E5E4]">
                              Luxury Makeup Studios & Ateliers
                            </h3>
                            <p className="text-xs text-[#ADA69A]">
                              Multi-chair bridal salons, private master suites, and certified hands-on masterclass studios.
                            </p>
                          </div>
                          <span className="font-mono text-xs text-[#968B78] shrink-0">
                            {filteredStudios.length} Premier Ateliers
                          </span>
                        </div>

                        {filteredStudios.length === 0 ? (
                          <div className="text-center py-12 border border-[#221E16] rounded-2xl bg-[#0F0D0A] text-[#ADA69A] text-xs">
                            No makeup studios match your current category or keyword filter.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStudios.map((salon) => (
                              <SalonCard
                                key={salon.id}
                                salon={salon}
                                onClick={() => setSelectedSalon(salon)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(listingTypeFilter === 'all' || listingTypeFilter === 'map') && (
                      <div className="space-y-4 pt-4 border-t border-[#241F17]">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-serif text-xl font-bold text-[#E6E5E4] flex items-center gap-2">
                              <MapIcon className="h-5 w-5 text-accent-text" />
                              <span>Klang Valley Atelier & MUA Locator</span>
                            </h3>
                            <p className="text-xs text-[#ADA69A] mt-0.5">
                              Powered by Google Maps Platform. View studio storefronts, bridal suite addresses, and MUA dispatch centers.
                            </p>
                          </div>
                        </div>

                        <InteractiveMap
                          locations={salons}
                          selectedId={selectedSalon?.id}
                          onSelect={(selected) => setSelectedSalon(selected)}
                          filterType={listingTypeFilter === 'muas' ? 'mua' : listingTypeFilter === 'studios' ? 'studio' : 'all'}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#221E16] pt-12 text-center text-xs text-[#ADA69A] font-serif italic">
                    <div className="space-y-1">
                      <Shield className="h-5 w-5 text-accent-text mx-auto mb-1" />
                      <p className="font-sans font-bold text-xs not-italic text-[#E6E5E4]">Dual-Vetted Talent</p>
                      <p>Every independent MUA and studio director is verified for sanitation and artistry standards.</p>
                    </div>
                    <div className="space-y-1 border-t border-[#221E16] sm:border-t-0 sm:border-x sm:border-[#221E16] py-4 sm:py-0">
                      <Star className="h-5 w-5 text-amber-400 mx-auto mb-1 fill-amber-400" />
                      <p className="font-sans font-bold text-xs not-italic text-[#E6E5E4]">Real Unbiased Reviews</p>
                      <p>Verifiable, client-submitted testimonials analyzed by AI quality audits.</p>
                    </div>
                    <div className="space-y-1">
                      <Calendar className="h-5 w-5 text-accent-text mx-auto mb-1" />
                      <p className="font-sans font-bold text-xs not-italic text-[#E6E5E4]">Direct & Studio Bookings</p>
                      <p>Schedule on-location glam squads or reserve private chairs instantly.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                  <SalonDetails
                    salon={selectedSalon}
                    onBack={() => setSelectedSalon(null)}
                    onInitiateBooking={(service) => initiateBooking(selectedSalon, service)}
                  />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'workspace' && (
            <motion.div
              key="workspace-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
            >
              <WorkspaceHub />
            </motion.div>
          )}

          {activeTab === 'lookbook' && (
            <motion.div
              key="lookbook-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LookbookStudio
                salons={salons}
                onBookLook={handleBookLook}
              />
            </motion.div>
          )}

          {activeTab === 'ai-stylist' && (
            <motion.div
              key="ai-stylist-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AIStylist
                salons={salons}
                onInitiateBooking={initiateBooking}
              />
            </motion.div>
          )}

          {activeTab === 'client' && (
            <motion.div
              key="client-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ClientPortal
                currentUser={currentUser}
                userEmail={userEmail}
                setUserEmail={setUserEmail}
                onOpenAuth={handleOpenAuth}
              />
            </motion.div>
          )}

          {activeTab === 'provider' && (
            <motion.div
              key="provider-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ProviderDashboard
                salons={salons}
                onSalonUpdated={() => {}}
                currentUser={currentUser}
                onOpenAuth={handleOpenAuth}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {activeBookingSalon && activeBookingService && (
          <BookingModal
            isOpen={true}
            salon={activeBookingSalon}
            service={activeBookingService}
            currentUser={currentUser}
            attachedMoodboard={activeBookingMoodboard}
            onClose={() => {
              setActiveBookingSalon(null);
              setActiveBookingService(null);
              setActiveBookingMoodboard(null);
            }}
            onBookingSuccess={handleBookingSuccess}
            onOpenAuth={handleOpenAuth}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authModalOpen && (
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => {
              setAuthModalOpen(false);
              setAuthPromptMessage(undefined);
            }}
            initialMode={authModalMode}
            onAuthSuccess={handleAuthSuccess}
            salons={salons}
            promptMessage={authPromptMessage}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileModalOpen && (
          <ProfileModal
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onSignOut={handleSignOut}
            salons={salons}
            onOpenSalonPortal={() => setActiveTab('provider')}
            onOpenBookings={() => setActiveTab('client')}
          />
        )}
      </AnimatePresence>

      <footer className="border-t border-[#221E16] bg-[#080705] py-8 text-center mt-20">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center justify-center space-y-1.5 text-center">
          <p className="text-xs font-mono tracking-wide text-[#ADA69A]">
            2026 Leish! Aesthetic Marketplace. All rights reserved.
          </p>
          <p className="text-[11px] font-mono text-[#7D705B]">
            (Managed by Duta Integra Solutions)
          </p>
        </div>
      </footer>
    </div>
  );
}

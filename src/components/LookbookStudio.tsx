/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Palette, 
  Search, 
  Calendar, 
  ShieldCheck, 
  Sun, 
  Camera, 
  Compass, 
  Flame, 
  Check, 
  Copy, 
  RefreshCw,
  Layers,
  Sparkle,
  ArrowRight,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { LookbookItem, Salon, Service } from '../types';

interface LookbookStudioProps {
  salons: Salon[];
  onBookLook: (salon: Salon, service: Service, moodboard: LookbookItem) => void;
}

const PRESET_LOOKS = [
  {
    id: 'preset-bridal',
    name: 'Gilded Velvet Champagne Bridal',
    category: 'bridal',
    tagline: 'Waterproof 18-hour radiance tailored for tearful ceremonies & golden hour photography.',
    undertone: 'Neutral Warm',
    lighting: 'Golden Hour & Ballroom Chandelier',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'preset-redcarpet',
    name: 'Cinematic High-Impact Red Carpet',
    category: 'editorial',
    tagline: 'Camera-flash proof bone structure contour with razor-sharp smoked almond eye.',
    undertone: 'Cool Olive',
    lighting: 'Flash Photography & Step-and-Repeat',
    image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'preset-softglam',
    name: 'Dewy Cashmere Peach Soft Glam',
    category: 'soft-glam',
    tagline: 'Blurred feather-light skin tint, brushed laminated brows, and honey-glazed lips.',
    undertone: 'Warm Peach',
    lighting: 'Natural Morning Daylight',
    image: 'https://images.unsplash.com/photo-1503236823255-94609f598e71?auto=format&fit=crop&q=80&w=1000'
  },
  {
    id: 'preset-airbrush',
    name: '4K Micro-Mist Ceramic Airbrush',
    category: 'airbrush',
    tagline: 'High-definition poreless canvas formulated for 4K video lenses and ultra-closeups.',
    undertone: 'Rich Golden',
    lighting: 'Studio Ring-Light & 4K Cinema Lenses',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=1000'
  }
];

export default function LookbookStudio({ salons, onBookLook }: LookbookStudioProps) {
  const [selectedAesthetic, setSelectedAesthetic] = useState<string>('bridal');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [skinUndertone, setSkinUndertone] = useState<string>('Neutral Warm');
  const [occasion, setOccasion] = useState<string>('Luxury Wedding Ceremony');
  const [lighting, setLighting] = useState<string>('Golden Hour & Flash Photography');
  
  const [currentLook, setCurrentLook] = useState<LookbookItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Generate Lookbook on Mount or Preset Selection
  const handleGenerateLook = async (overridePrompt?: string, overrideAesthetic?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/gemini/trends-lookbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: overridePrompt || customPrompt,
          aesthetic: overrideAesthetic || selectedAesthetic,
          occasion,
          skinUndertone,
          lighting
        })
      });

      if (!res.ok) throw new Error('Lookbook generation failed');
      const data: LookbookItem = await res.json();
      setCurrentLook(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    handleGenerateLook();
  }, []);

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const handleInitiateBookingWithLook = () => {
    if (!currentLook) return;
    const targetSalon = salons.find(s => s.id === currentLook.recommendedSalonId) || salons[0];
    const targetService = targetSalon.services.find(s => 
      s.name.toLowerCase().includes(currentLook.recommendedServiceName?.toLowerCase() || '') ||
      s.category === currentLook.category
    ) || targetSalon.services[0];

    onBookLook(targetSalon, targetService, currentLook);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[#3A2820]/40 bg-gradient-to-r from-[#171210] via-[#211613] to-[#120E0D] p-8 sm:p-12 mb-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-[#9A1A18]/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 rounded-full border border-[#9A1A18]/40 bg-[#9A1A18]/10 px-4 py-1.5 text-xs font-mono tracking-widest text-[#E9D2C4] mb-4">
            <TrendingUp className="h-3.5 w-3.5 text-[#E9D2C4]" />
            <span>2026 RUNWAY & BRIDAL SEARCH GROUNDED</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold tracking-tight text-[#FAF8F5] mb-4">
            AI Virtual Lookbook & Moodboard
          </h1>
          <p className="text-sm sm:text-base text-[#C5BDB6] leading-relaxed">
            Design and visualize bespoke makeup aesthetics synchronized with current 2026 Milan/Paris couture runways and celebrity red carpets. Generate full formula specifications and attach your personalized moodboard directly to your luxury studio booking ticket.
          </p>
        </div>
      </div>

      {/* Preset Inspiration Pills */}
      <div className="mb-10">
        <h2 className="text-xs font-mono uppercase tracking-widest text-[#A89F91] mb-4 flex items-center gap-2">
          <Sparkle className="h-3.5 w-3.5 text-[#9A1A18]" />
          Signature Artistry Blueprints
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRESET_LOOKS.map(preset => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedAesthetic(preset.category);
                setSkinUndertone(preset.undertone);
                setLighting(preset.lighting);
                handleGenerateLook(preset.name, preset.category);
              }}
              className={`group text-left p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                selectedAesthetic === preset.category
                  ? 'border-[#9A1A18] bg-[#1E1614] shadow-lg shadow-[#9A1A18]/20 ring-1 ring-[#9A1A18]'
                  : 'border-[#221F1D] bg-[#120F0E] hover:border-[#3E2B25] hover:bg-[#171311]'
              }`}
            >
              <div className="h-28 w-full rounded-xl overflow-hidden mb-3 relative">
                <img 
                  src={preset.image} 
                  alt={preset.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 text-[10px] font-mono uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded text-[#E9D2C4] backdrop-blur-sm">
                  {preset.category}
                </span>
              </div>
              <h3 className="font-serif text-sm font-semibold text-[#FAF8F5] mb-1 group-hover:text-[#E9D2C4] transition-colors">
                {preset.name}
              </h3>
              <p className="text-xs text-[#8E867E] line-clamp-2 leading-relaxed">
                {preset.tagline}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Designer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Custom Artistry Controls */}
        <div className="lg:col-span-4 bg-[#120F0E] border border-[#221F1D] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#221F1D]">
            <h3 className="font-serif text-lg font-medium text-[#FAF8F5] flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#9A1A18]" />
              Artistry Parameters
            </h3>
            {loading && <RefreshCw className="h-4 w-4 text-[#E9D2C4] animate-spin" />}
          </div>

          {/* Custom Prompt */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A89F91] mb-2">
              Bespoke Look Vision / Notes
            </label>
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder="e.g. 90s supermodel brown-toned lip, subtle fox-eye liner, golden hour dewy underpainting for a destination sunset reception..."
              rows={3}
              className="w-full rounded-xl border border-[#2B231F] bg-[#0A0807] p-3 text-xs text-[#FAF8F5] placeholder-[#5C534D] focus:border-[#9A1A18] focus:outline-none focus:ring-1 focus:ring-[#9A1A18] resize-none"
            />
          </div>

          {/* Aesthetic Category */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A89F91] mb-2">
              Aesthetic Category
            </label>
            <select
              value={selectedAesthetic}
              onChange={e => setSelectedAesthetic(e.target.value)}
              className="w-full rounded-xl border border-[#2B231F] bg-[#0A0807] px-3 py-2.5 text-xs text-[#FAF8F5] focus:border-[#9A1A18] focus:outline-none"
            >
              <option value="bridal">Bridal & Ceremony Artistry</option>
              <option value="editorial">High-Fashion & Red Carpet Glam</option>
              <option value="soft-glam">Soft Glam & Dewy Radiance</option>
              <option value="airbrush">4K Ultra-HD Airbrush</option>
              <option value="masterclass">Masterclass Avant-Garde</option>
            </select>
          </div>

          {/* Skin Undertone */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A89F91] mb-2">
              Skin Undertone & Complexion Base
            </label>
            <select
              value={skinUndertone}
              onChange={e => setSkinUndertone(e.target.value)}
              className="w-full rounded-xl border border-[#2B231F] bg-[#0A0807] px-3 py-2.5 text-xs text-[#FAF8F5] focus:border-[#9A1A18] focus:outline-none"
            >
              <option value="Neutral Warm">Neutral Warm (Golden Peach)</option>
              <option value="Cool Olive">Cool Olive (Subtle Muted Undertone)</option>
              <option value="Warm Olive">Warm Olive (Luminous Mediterranean)</option>
              <option value="Deep Rich Golden">Deep Rich Golden (Warm Espresso Radiance)</option>
              <option value="Fair Cool Rosy">Fair Cool Rosy (Porcelain Pink)</option>
              <option value="Medium Tan Golden">Medium Tan Golden (Sun-Kissed Amber)</option>
            </select>
          </div>

          {/* Lighting Environment */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A89F91] mb-2">
              Primary Lighting Environment
            </label>
            <select
              value={lighting}
              onChange={e => setLighting(e.target.value)}
              className="w-full rounded-xl border border-[#2B231F] bg-[#0A0807] px-3 py-2.5 text-xs text-[#FAF8F5] focus:border-[#9A1A18] focus:outline-none"
            >
              <option value="Golden Hour & Ballroom Chandelier">Golden Hour & Ballroom Chandelier</option>
              <option value="Flash Photography & Step-and-Repeat">Flash Photography & Step-and-Repeat</option>
              <option value="Natural Morning Daylight">Natural Morning Daylight</option>
              <option value="Studio 5000K Clean Lighting">Studio 5000K Clean Balanced Lighting</option>
              <option value="Dim Evening Candlelight">Dim Evening Candlelight & Romance</option>
            </select>
          </div>

          <button
            onClick={() => handleGenerateLook()}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#9A1A18] to-[#751311] hover:from-[#B12220] hover:to-[#8E1917] text-[#FAF8F5] text-xs font-mono uppercase tracking-widest font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#9A1A18]/25 transition-all duration-300 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Synthesizing Runway Trends...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-[#E9D2C4]" />
                <span>Formulate Moodboard</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: High-End Lookbook Spec Sheet */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="min-h-[500px] rounded-3xl border border-[#221F1D] bg-[#120F0E] flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-2 border-[#9A1A18]/20 border-t-[#9A1A18] animate-spin" />
                <Sparkles className="h-6 w-6 text-[#E9D2C4] absolute inset-0 m-auto" />
              </div>
              <p className="font-serif text-xl text-[#FAF8F5]">Consulting Global 2026 Beauty Trends</p>
              <p className="text-xs text-[#8E867E] max-w-sm">
                Grounding runway color charts, glass-skin underpainting methods, and long-wear pigments with Google Search...
              </p>
            </div>
          ) : currentLook ? (
            <div className="rounded-3xl border border-[#302622] bg-[#130F0E] overflow-hidden shadow-2xl">
              {/* Hero Banner with Curated Editorial Reference */}
              <div className="relative h-64 sm:h-80 w-full overflow-hidden">
                <img 
                  src={currentLook.heroImage} 
                  alt={currentLook.lookName}
                  className="h-full w-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#130F0E] via-[#130F0E]/40 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-[#9A1A18] text-[#FAF8F5] mb-2 font-semibold shadow-md">
                      {currentLook.category} Artistry Specification
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#FAF8F5] tracking-tight">
                      {currentLook.lookName}
                    </h2>
                  </div>

                  <button
                    onClick={handleInitiateBookingWithLook}
                    className="self-start sm:self-auto py-2.5 px-5 rounded-full bg-[#FAF8F5] hover:bg-[#E9D2C4] text-[#130F0E] text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-2 shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#9A1A18]" />
                    <span>Book This Look</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Spec Details Body */}
              <div className="p-6 sm:p-8 space-y-8">
                {/* Vibe & Runway Trend Insight */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-[#261E1A] bg-[#0E0C0B]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#A89F91] block mb-1">
                      Artistry Concept & Vibe
                    </span>
                    <p className="text-xs text-[#FAF8F5] leading-relaxed">
                      {currentLook.vibeDescription}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-[#9A1A18]/30 bg-[#9A1A18]/5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#E9D2C4] block mb-1 flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-[#E9D2C4]" />
                      2026 Runway & Red Carpet Grounding
                    </span>
                    <p className="text-xs text-[#C5BDB6] leading-relaxed">
                      {currentLook.groundedTrendContext}
                    </p>
                  </div>
                </div>

                {/* Harmonized Color Palette Swatches */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#FAF8F5] flex items-center gap-2">
                      <Palette className="h-3.5 w-3.5 text-[#9A1A18]" />
                      Harmonized Pigment Palette
                    </h4>
                    <span className="text-[11px] text-[#8E867E]">Click hex code to copy</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {currentLook.colorPalette.map((swatch, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleCopyHex(swatch.hex)}
                        className="cursor-pointer group rounded-xl p-3 border border-[#2B231F] bg-[#0E0C0B] hover:border-[#9A1A18] transition-all"
                      >
                        <div 
                          className="h-12 w-full rounded-lg shadow-inner mb-2 border border-white/10 group-hover:scale-102 transition-transform"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        <p className="text-xs font-medium text-[#FAF8F5] truncate">{swatch.name}</p>
                        <p className="text-[10px] font-mono text-[#8E867E] flex items-center justify-between mt-1">
                          <span>{swatch.hex}</span>
                          {copiedHex === swatch.hex ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3-Pillar Artistry Breakdown (Complexion, Eyes, Lips) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Complexion */}
                  <div className="p-5 rounded-2xl border border-[#241D19] bg-[#0E0C0B] space-y-3">
                    <div className="flex items-center gap-2 text-[#E9D2C4]">
                      <Sparkles className="h-4 w-4 text-[#9A1A18]" />
                      <h4 className="font-serif text-sm font-semibold text-[#FAF8F5]">Complexion Artistry</h4>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E867E] block">Finish & Glow</span>
                      <p className="text-xs text-[#FAF8F5] font-medium">{currentLook.complexion.finish}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E867E] block">Coverage</span>
                      <p className="text-xs text-[#C5BDB6]">{currentLook.complexion.coverage}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E867E] block">Lead Technique</span>
                      <p className="text-xs text-[#C5BDB6]">{currentLook.complexion.technique}</p>
                    </div>
                  </div>

                  {/* Eye Artistry */}
                  <div className="p-5 rounded-2xl border border-[#241D19] bg-[#0E0C0B] space-y-3">
                    <div className="flex items-center gap-2 text-[#E9D2C4]">
                      <Sun className="h-4 w-4 text-[#9A1A18]" />
                      <h4 className="font-serif text-sm font-semibold text-[#FAF8F5]">Lid & Brow Sculpt</h4>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E867E] block">Eye Design</span>
                      <p className="text-xs text-[#FAF8F5] font-medium">{currentLook.eyeArtistry.style}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E867E] block">Lash Application</span>
                      <p className="text-xs text-[#C5BDB6]">{currentLook.eyeArtistry.lashStyle}</p>
                    </div>
                  </div>

                  {/* Lip Formula */}
                  <div className="p-5 rounded-2xl border border-[#241D19] bg-[#0E0C0B] space-y-3">
                    <div className="flex items-center gap-2 text-[#E9D2C4]">
                      <Layers className="h-4 w-4 text-[#9A1A18]" />
                      <h4 className="font-serif text-sm font-semibold text-[#FAF8F5]">Lip Architecture</h4>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E867E] block">Shade Formula</span>
                      <p className="text-xs text-[#FAF8F5] font-medium">{currentLook.lipFormula.shade}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E867E] block">Texture Finish</span>
                      <p className="text-xs text-[#C5BDB6]">{currentLook.lipFormula.finish}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E867E] block">Contour Liner</span>
                      <p className="text-xs text-[#C5BDB6]">{currentLook.lipFormula.liner}</p>
                    </div>
                  </div>
                </div>

                {/* Longevity & Setting Shield */}
                <div className="p-5 rounded-2xl border border-[#2E231F] bg-[#16110F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#E9D2C4] flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Longevity & Event Durability Guarantee
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentLook.longevityFeatures.map((feat, i) => (
                        <span key={i} className="inline-flex items-center text-[11px] text-[#FAF8F5] bg-black/40 px-2.5 py-1 rounded-md border border-[#3E2D26]">
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-mono uppercase text-[#8E867E] block">Calibrated Lighting</span>
                    <span className="text-xs text-[#FAF8F5] font-medium">{currentLook.lightingBestFor}</span>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-4 border-t border-[#221F1D] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-[#8E867E] flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-[#9A1A18]" />
                    <span>Recommended Studio: <strong className="text-[#FAF8F5]">{salons.find(s => s.id === currentLook.recommendedSalonId)?.name || 'Maison Leish'}</strong></span>
                  </div>

                  <button
                    onClick={handleInitiateBookingWithLook}
                    className="w-full sm:w-auto py-3 px-8 rounded-full bg-gradient-to-r from-[#9A1A18] to-[#7F1513] hover:from-[#B12220] hover:to-[#8E1917] text-[#FAF8F5] text-xs font-mono uppercase tracking-widest font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#9A1A18]/30 transition-all duration-300"
                  >
                    <span>Reserve With This Moodboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, MapPin, ArrowRight, ShieldCheck, Car, Sparkles, Award } from 'lucide-react';
import { Salon } from '../types';

interface MUACardProps {
  mua: Salon;
  onClick: () => void;
  onBookDirect?: (e: React.MouseEvent) => void;
  key?: string;
}

export default function MUACard({ mua, onClick, onBookDirect }: MUACardProps) {
  const leadService = mua.services[0];
  const startingPrice = mua.startingPrice || (leadService ? leadService.price : 150);

  return (
    <div 
      onClick={onClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#2B231F] bg-[#14100E] hover:border-[#9A1A18]/60 hover:shadow-xl hover:shadow-[#9A1A18]/10 transition-all duration-300 cursor-pointer"
    >
      {/* Top Banner & Artist Portrait */}
      <div className="relative h-60 w-full overflow-hidden bg-[#1E1714]">
        <img
          src={mua.image}
          alt={mua.name}
          className="h-full w-full object-cover object-top filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14100E] via-[#14100E]/30 to-transparent" />
        
        {/* Verified MUA Badge */}
        <div className="absolute top-3 left-3 flex items-center space-x-1.5 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 border border-[#9A1A18]/50">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono tracking-widest text-[#FAF8F5] uppercase font-bold">
            Verified Pro MUA
          </span>
        </div>

        {/* Experience Pill */}
        {mua.yearsExperience && (
          <div className="absolute top-3 right-3 flex items-center space-x-1 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-0.5 border border-white/10 text-[10px] font-mono text-[#E9D2C4]">
            <Award className="h-3 w-3 text-[#E9D2C4]" />
            <span>{mua.yearsExperience}+ Yrs</span>
          </div>
        )}

        {/* Top-Rated Haute Elite MUA Badge */}
        {mua.rating >= 4.9 && (
          <div className="absolute top-11 left-3 flex items-center space-x-1 rounded-full bg-black/80 backdrop-blur-md px-2.5 py-0.5 border border-amber-400/60 shadow-md">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[9px] font-mono text-amber-300 font-bold">
              Top-Rated Elite ★{mua.rating}
            </span>
          </div>
        )}

        {/* Category Pill floating above bottom */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-[#9A1A18] text-[#FAF8F5] font-semibold shadow-sm">
            {mua.category} Specialist
          </span>
          <div className="flex items-center space-x-1 bg-black/60 px-2 py-0.5 rounded text-xs font-mono text-[#FAF8F5]">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold">{mua.rating}</span>
            <span className="text-[#8E867E]">({mua.reviewCount})</span>
          </div>
        </div>
      </div>

      {/* Artist Body Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#FAF8F5] group-hover:text-[#E9D2C4] transition-colors leading-snug">
              {mua.name}
            </h3>
            <p className="text-xs text-[#E9D2C4] font-medium mt-0.5">
              {mua.artistTitle || mua.tagline}
            </p>
          </div>

          <p className="text-[11px] text-[#A89F91] line-clamp-2 leading-relaxed">
            {mua.description}
          </p>

          {/* Pro Kit Brands */}
          {mua.kitBrands && mua.kitBrands.length > 0 && (
            <div className="pt-1">
              <span className="text-[9px] font-mono uppercase text-[#736A63] block mb-1">Kit Essentials</span>
              <div className="flex flex-wrap gap-1">
                {mua.kitBrands.slice(0, 3).map((brand, i) => (
                  <span key={i} className="text-[10px] font-mono bg-[#1E1714] text-[#C5BDB6] px-2 py-0.5 rounded border border-[#2D231E]">
                    {brand}
                  </span>
                ))}
                {mua.kitBrands.length > 3 && (
                  <span className="text-[10px] font-mono text-[#736A63] py-0.5 px-1">
                    +{mua.kitBrands.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Travel & Pricing Footer */}
        <div className="pt-3 border-t border-[#261E1A] space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[#8E867E]">
            <div className="flex items-center space-x-1.5 truncate max-w-[65%]">
              <Car className="h-3.5 w-3.5 text-[#9A1A18] shrink-0" />
              <span className="truncate text-[11px]">{mua.travelRadius || `Based in ${mua.location}`}</span>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono text-[#736A63] block">Per Face</span>
              <span className="font-serif font-bold text-sm text-[#E9D2C4]">From ${startingPrice}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-mono text-[#C5BDB6] group-hover:text-[#FAF8F5] flex items-center gap-1 transition-colors">
              <span>View Portfolio & Services</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </span>

            {onBookDirect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookDirect(e);
                }}
                className="px-3 py-1 rounded-full bg-[#9A1A18] hover:bg-[#C82A27] text-[#FAF8F5] text-[11px] font-mono uppercase tracking-wider font-semibold transition-colors"
              >
                Book Artist
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

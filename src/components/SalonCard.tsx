/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star, MapPin, ArrowRight } from 'lucide-react';
import { Salon } from '../types';

interface SalonCardProps {
  salon: Salon;
  onClick: () => void;
  key?: string;
}

const categoryLabels: Record<string, string> = {
  bridal: 'Bridal & Ceremony',
  editorial: 'Editorial & Red Carpet',
  'soft-glam': 'Soft Glam',
  airbrush: 'HD Airbrush',
  masterclass: 'Masterclass',
};

export default function SalonCard({ salon, onClick }: SalonCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#221F1D] bg-[#141211] hover:border-[#383330] hover:shadow-lg hover:shadow-[#0D0B0A]/50 transition-all duration-300 cursor-pointer"
    >
      {/* Cover Image */}
      <div className="relative h-48 w-full overflow-hidden bg-[#1E1A17]">
        <img
          src={salon.image}
          alt={salon.name}
          className="h-full w-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0B0A]/85 to-transparent" />
        
        {/* Absolute category tag */}
        <span className="absolute left-4 top-4 rounded-full bg-[#9A1A18] px-3 py-0.5 text-[9px] font-mono tracking-widest text-white uppercase shadow-md">
          {categoryLabels[salon.category] || salon.category}
        </span>

        {/* Top-Rated Highlight Badge */}
        {salon.rating >= 4.9 && (
          <span className="absolute right-4 top-4 rounded-full bg-black/80 border border-amber-400/60 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-mono font-bold text-amber-300 flex items-center gap-1 shadow-md">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            <span>Top-Rated ★{salon.rating}</span>
          </span>
        )}
      </div>

      {/* Card Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-bold text-base text-[#FAF8F5] group-hover:text-[#E9D2C4] transition-colors truncate max-w-[70%]">
              {salon.name}
            </h3>
            
            {/* Star Rating summary */}
            <div className="flex items-center space-x-1 text-xs font-mono">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-[#FAF8F5]">{salon.rating}</span>
            </div>
          </div>

          <p className="font-serif text-xs italic text-[#C5BDB6] line-clamp-1">
            "{salon.tagline}"
          </p>

          <p className="text-[11px] text-[#807670] line-clamp-2 leading-relaxed">
            {salon.description}
          </p>
        </div>

        {/* Location & CTA footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#221F1D] text-[11px] font-mono text-[#807670]">
          <div className="flex items-center space-x-1">
            <MapPin className="h-3.5 w-3.5 text-[#9A1A18]" />
            <span>{salon.location}</span>
          </div>

          <span className="flex items-center space-x-1 text-[#E9D2C4] font-semibold group-hover:text-[#FAF8F5] transition-colors">
            <span>Discover Menu</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}

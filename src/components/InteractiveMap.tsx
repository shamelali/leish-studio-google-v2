/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { Salon } from '../types';
import { MapPin, Star, Building2, User, ArrowRight } from 'lucide-react';

interface InteractiveMapProps {
  locations: Salon[];
  selectedId?: string | null;
  onSelect: (salon: Salon) => void;
  filterType?: 'all' | 'studio' | 'mua';
}

const DEFAULT_CENTER = { lat: 3.1390, lng: 101.6869 }; // Kuala Lumpur, Malaysia

// Studio and MUA geographic mapping — Malaysian locations
const COORDINATE_MAP: Record<string, { lat: number; lng: number }> = {
  'salon-1': { lat: 3.1357, lng: 101.6869 }, // Maison Leish (Bukit Bintang, KL)
  'salon-2': { lat: 3.1478, lng: 101.6953 }, // L'Éclat (Bangsar, KL)
  'salon-3': { lat: 3.1129, lng: 101.6634 }, // Velvet Glow (Petaling Jaya)
  'salon-4': { lat: 3.1629, lng: 101.6869 }, // Noor Bridal (Ampang, KL)
  'salon-5': { lat: 3.0853, lng: 101.6489 }, // Aura Airbrush (Cheras, KL)
  'salon-6': { lat: 3.1428, lng: 101.6717 }, // MUA Masterclass Academy (Mont Kiara, KL)
  'mua-1': { lat: 3.1578, lng: 101.7012 },   // Jean-Marc Laurent (KLCC, KL)
  'mua-2': { lat: 3.1694, lng: 101.6723 },   // Amira Zahra (Setapak, KL)
  'mua-3': { lat: 3.1067, lng: 101.6521 },   // Sasha Morello (Subang Jaya)
  'mua-4': { lat: 3.1389, lng: 101.6603 },   // Elena Rose (Bangsar South, KL)
};

export default function InteractiveMap({ locations, selectedId, onSelect, filterType = 'all' }: InteractiveMapProps) {
  const [activeSalon, setActiveSalon] = useState<Salon | null>(null);

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDQs8wDqWfdsYxDVP4pNp1rJuPRp2Vt6pQ';

  const filtered = locations.filter(loc => {
    if (filterType === 'studio') return loc.type !== 'mua';
    if (filterType === 'mua') return loc.type === 'mua';
    return true;
  });

  return (
    <div className="relative h-[420px] w-full rounded-2xl overflow-hidden border border-[#221E16] shadow-2xl bg-[#0F0D0A]">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={12}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          disableDefaultUI={false}
          className="h-full w-full"
          style={{ width: '100%', height: '100%' }}
        >
          {filtered.map((item) => {
            const coords = COORDINATE_MAP[item.id] || DEFAULT_CENTER;
            const isMUA = item.type === 'mua';
            const isSelected = selectedId === item.id || activeSalon?.id === item.id;

            return (
              <AdvancedMarker
                key={item.id}
                position={coords}
                onClick={() => setActiveSalon(item)}
                title={item.name}
              >
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-lg cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'bg-[#574D3C] border-[#E6E5E4] text-white scale-110 z-30'
                    : isMUA
                      ? 'bg-[#221E16] border-[#574D3C] text-[#E6E5E4] hover:scale-105'
                      : 'bg-[#14110C] border-[#3C3427] text-[#E6E5E4] hover:scale-105'
                }`}>
                  {isMUA ? (
                    <User className="h-3 w-3 text-[#E6E5E4]" />
                  ) : (
                    <Building2 className="h-3 w-3 text-[#E6E5E4]" />
                  )}
                  <span className="text-[11px] font-mono font-bold tracking-tight">
                    {item.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono flex items-center">
                    ★{item.rating}
                  </span>
                </div>
              </AdvancedMarker>
            );
          })}

          {activeSalon && (
            <InfoWindow
              position={COORDINATE_MAP[activeSalon.id] || DEFAULT_CENTER}
              onCloseClick={() => setActiveSalon(null)}
            >
              <div className="p-2 max-w-[220px] text-[#0F0D0A]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#574D3C] text-white">
                    {activeSalon.type === 'mua' ? 'Pro MUA' : 'Atelier'}
                  </span>
                  <div className="flex items-center text-xs font-mono font-bold text-amber-600">
                    ★ {activeSalon.rating}
                  </div>
                </div>

                <h4 className="font-serif font-bold text-sm leading-tight text-[#0F0D0A]">
                  {activeSalon.name}
                </h4>

                <p className="text-[11px] text-[#5A503E] mt-1 line-clamp-2">
                  {activeSalon.artistTitle || activeSalon.tagline}
                </p>

                <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-accent-text">
                    From ${activeSalon.startingPrice || (activeSalon.services[0]?.price ?? 150)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(activeSalon);
                      setActiveSalon(null);
                    }}
                    className="flex items-center gap-1 text-[11px] font-mono text-stone-900 font-bold hover:text-accent-text"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Floating Map Legend */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-2 rounded-full bg-black/80 backdrop-blur-md px-3 py-1.5 border border-[#221E16] text-[10px] font-mono text-[#E6E5E4]">
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-[#574D3C]" />
          <span>Independent MUAs</span>
        </div>
        <span className="text-[#5A503E]">|</span>
        <div className="flex items-center space-x-1">
          <span className="h-2 w-2 rounded-full bg-[#E6E5E4]" />
          <span>Luxury Studios</span>
        </div>
      </div>
    </div>
  );
}

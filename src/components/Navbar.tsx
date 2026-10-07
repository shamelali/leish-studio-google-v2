/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  User as UserIcon,
  LayoutDashboard,
  Search,
  LogIn,
  UserPlus,
  ChevronDown,
  LogOut,
  Settings,
  Scissors,
  Menu,
  X,
  Palette,
  HardDrive
} from 'lucide-react';
import { useStore } from '../lib/store';

interface NavbarProps {
  activeTab: 'explore' | 'lookbook' | 'ai-stylist' | 'workspace' | 'client' | 'provider';
  setActiveTab: (tab: 'explore' | 'lookbook' | 'ai-stylist' | 'workspace' | 'client' | 'provider') => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onOpenProfile: () => void;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenAuth,
  onOpenProfile,
}: NavbarProps) {
  const { currentUser, logout } = useStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    logout();
    setDropdownOpen(false);
    setActiveTab('explore');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#221F1D] bg-[#0D0B0A]/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div
          className="flex cursor-pointer items-center space-x-2"
          onClick={() => {
            setActiveTab('explore');
            setMobileMenuOpen(false);
          }}
        >
          <div className="flex items-baseline font-serif text-3xl font-semibold tracking-tight text-[#FAF8F5]">
            <span>Lei</span>
            <span className="text-[#9A1A18] italic font-bold">sh</span>
            <span className="text-[#FAF8F5] text-2xl ml-0.5">!</span>
          </div>
          <span className="hidden text-xs font-mono tracking-widest text-[#E9D2C4] sm:block uppercase pt-2 pl-2 border-l border-[#221F1D]">
            Aesthetic Market
          </span>
        </div>

        <nav className="hidden md:flex space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex items-center space-x-1.5 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 ${
              activeTab === 'explore'
                ? 'bg-[#9A1A18] text-[#FAF8F5] shadow-lg shadow-[#9A1A18]/20'
                : 'text-[#C5BDB6] hover:bg-[#1E1A17] hover:text-[#FAF8F5]'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Discover</span>
          </button>

          <button
            onClick={() => setActiveTab('lookbook')}
            className={`flex items-center space-x-1.5 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 ${
              activeTab === 'lookbook'
                ? 'bg-gradient-to-r from-[#9A1A18] to-[#801412] text-[#FAF8F5] shadow-lg shadow-[#9A1A18]/20 border border-[#FAF8F5]/10'
                : 'text-[#C5BDB6] hover:bg-[#1E1A17] hover:text-[#FAF8F5]'
            }`}
          >
            <Palette className="h-3.5 w-3.5 text-[#E9D2C4]" />
            <span>AI Lookbook</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-stylist')}
            className={`flex items-center space-x-1.5 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 ${
              activeTab === 'ai-stylist'
                ? 'bg-[#9A1A18] text-[#FAF8F5] shadow-lg shadow-[#9A1A18]/20 border border-[#FAF8F5]/10'
                : 'text-[#C5BDB6] hover:bg-[#1E1A17] hover:text-[#FAF8F5]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#E9D2C4]" />
            <span>AI Advisor</span>
          </button>

          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center space-x-1.5 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 ${
              activeTab === 'workspace'
                ? 'bg-[#9A1A18] text-[#FAF8F5] shadow-lg shadow-[#9A1A18]/20'
                : 'text-[#C5BDB6] hover:bg-[#1E1A17] hover:text-[#FAF8F5]'
            }`}
          >
            <HardDrive className="h-3.5 w-3.5 text-blue-400" />
            <span>Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('client')}
            className={`flex items-center space-x-1.5 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 ${
              activeTab === 'client'
                ? 'bg-[#9A1A18] text-[#FAF8F5] shadow-lg shadow-[#9A1A18]/20'
                : 'text-[#C5BDB6] hover:bg-[#1E1A17] hover:text-[#FAF8F5]'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>My Bookings</span>
          </button>

          <button
            onClick={() => setActiveTab('provider')}
            className={`flex items-center space-x-1.5 rounded-full px-3.5 py-2 text-xs sm:text-sm font-medium tracking-wide transition-all duration-300 ${
              activeTab === 'provider'
                ? 'bg-[#FAF8F5] text-[#0D0B0A] font-semibold'
                : 'text-[#C5BDB6] hover:bg-[#1E1A17] hover:text-[#FAF8F5]'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Salon Portal</span>
          </button>
        </nav>

        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2.5 rounded-full border border-[#2E2824] bg-[#161311] py-1.5 pl-2 pr-3.5 text-xs text-[#FAF8F5] hover:border-[#9A1A18]/60 transition-all"
              >
                <div className="h-7 w-7 rounded-full overflow-hidden bg-[#241F1C] border border-[#9A1A18]/50 flex items-center justify-center shrink-0">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5 text-[#E9D2C4]" />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-medium text-xs text-[#FAF8F5] max-w-[100px] truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] font-mono text-[#A89E96] capitalize">
                    {currentUser.role === 'provider' ? 'Salon Director' : 'VIP Client'}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#8C827A]" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#2A2421] bg-[#14110F] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-[#221F1D] mb-1">
                    <p className="text-xs font-semibold text-[#FAF8F5] truncate">{currentUser.name}</p>
                    <p className="text-[11px] font-mono text-[#8C827A] truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#9A1A18]/20 text-[#E9D2C4] border border-[#9A1A18]/40">
                      {currentUser.role === 'provider' ? 'Salon Partner' : 'Client Account'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-[#C5BDB6] rounded-xl hover:bg-[#1E1A17] hover:text-[#FAF8F5] transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-[#8C827A]" />
                    <span>Profile & Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setActiveTab('client');
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-[#C5BDB6] rounded-xl hover:bg-[#1E1A17] hover:text-[#FAF8F5] transition-colors"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#8C827A]" />
                    <span>My Bookings</span>
                  </button>

                  {currentUser.role === 'provider' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        setActiveTab('provider');
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-[#C5BDB6] rounded-xl hover:bg-[#1E1A17] hover:text-[#FAF8F5] transition-colors"
                    >
                      <Scissors className="h-3.5 w-3.5 text-[#9A1A18]" />
                      <span>Salon Management</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-[#221F1D]" />

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-red-400 rounded-xl hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                className="flex items-center space-x-1.5 rounded-full border border-[#2E2824] bg-[#14110F] px-3.5 py-1.5 text-xs font-medium text-[#FAF8F5] hover:border-[#9A1A18] hover:bg-[#1B1714] transition-all"
              >
                <LogIn className="h-3.5 w-3.5 text-[#E9D2C4]" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="flex items-center space-x-1.5 rounded-full bg-gradient-to-r from-[#9A1A18] to-[#801412] px-3.5 py-1.5 text-xs font-semibold text-[#FAF8F5] shadow-md shadow-[#9A1A18]/25 hover:brightness-110 active:scale-95 transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#8C827A] hover:bg-[#1A1613] hover:text-[#FAF8F5]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#221F1D] bg-[#120F0D] px-4 py-4 space-y-2">
          <button
            onClick={() => {
              setActiveTab('explore');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
              activeTab === 'explore' ? 'bg-[#9A1A18] text-white' : 'text-[#C5BDB6] hover:bg-[#1C1815]'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Discover Salons</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('lookbook');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
              activeTab === 'lookbook' ? 'bg-[#9A1A18] text-white' : 'text-[#C5BDB6] hover:bg-[#1C1815]'
            }`}
          >
            <Palette className="h-4 w-4 text-[#E9D2C4]" />
            <span>AI Virtual Lookbook</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ai-stylist');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
              activeTab === 'ai-stylist' ? 'bg-[#9A1A18] text-white' : 'text-[#C5BDB6] hover:bg-[#1C1815]'
            }`}
          >
            <Sparkles className="h-4 w-4 text-[#E9D2C4]" />
            <span>AI Stylist Advisor</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('workspace');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
              activeTab === 'workspace' ? 'bg-[#9A1A18] text-white' : 'text-[#C5BDB6] hover:bg-[#1C1815]'
            }`}
          >
            <HardDrive className="h-4 w-4 text-blue-400" />
            <span>Workspace & Google Suite</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('client');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
              activeTab === 'client' ? 'bg-[#9A1A18] text-white' : 'text-[#C5BDB6] hover:bg-[#1C1815]'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>My Bookings</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('provider');
              setMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
              activeTab === 'provider' ? 'bg-[#FAF8F5] text-black font-semibold' : 'text-[#C5BDB6] hover:bg-[#1C1815]'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Salon Provider Portal</span>
          </button>

          {!currentUser ? (
            <div className="pt-3 border-t border-[#221F1D] grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signin');
                }}
                className="w-full py-2.5 rounded-xl border border-[#2E2824] bg-[#181412] text-xs font-medium text-center text-[#FAF8F5]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signup');
                }}
                className="w-full py-2.5 rounded-xl bg-[#9A1A18] text-xs font-semibold text-center text-white"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-[#221F1D] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenProfile();
                }}
                className="flex items-center space-x-2 text-xs text-[#E9D2C4]"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>My Profile ({currentUser.name})</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

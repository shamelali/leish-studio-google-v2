/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Phone, 
  Sparkles, 
  Scissors, 
  Building2, 
  LogOut, 
  Check, 
  Calendar,
  ShieldCheck,
  Edit2
} from 'lucide-react';
import { User, Salon } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUpdateUser: (updated: User) => void;
  onSignOut: () => void;
  salons: Salon[];
  onOpenSalonPortal?: () => void;
  onOpenBookings?: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onSignOut,
  salons,
  onOpenSalonPortal,
  onOpenBookings
}: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhone(currentUser.phone || '');
      setBio(currentUser.bio || '');
    }
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  const linkedSalon = salons.find(s => s.id === currentUser.salonId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          name,
          phone,
          bio
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      onUpdateUser(data.user);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md rounded-3xl border border-[#2B251B] bg-[#100E0A] p-6 sm:p-8 shadow-2xl text-[#E6E5E4]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-[#918570] hover:bg-[#221E16] hover:text-[#E6E5E4] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* User Avatar & Headline */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-[#574D3C] shadow-lg shadow-[#574D3C]/20 bg-[#1F1A13] flex items-center justify-center">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-10 w-10 text-[#ADA69A]" />
              )}
            </div>
            <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#100E0A] ${
              currentUser.role === 'provider' ? 'bg-[#574D3C]' : 'bg-[#E6E5E4]'
            }`} />
          </div>

          <h3 className="font-serif text-2xl font-medium tracking-tight text-[#E6E5E4]">
            {currentUser.name}
          </h3>
          <p className="text-xs font-mono text-[#A79F92] mt-0.5">{currentUser.email}</p>

          <div className="mt-2.5 inline-flex items-center space-x-1.5 rounded-full border border-[#574D3C]/30 bg-[#574D3C]/15 px-3 py-1 text-xs text-[#E6E5E4]">
            {currentUser.role === 'provider' ? (
              <>
                <Building2 className="h-3 w-3 text-[#E6E5E4]" />
                <span className="font-medium">Makeup Studio Director & MUA</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-[#E6E5E4]" />
                <span className="font-medium">VIP Makeup Client</span>
              </>
            )}
          </div>
        </div>

        {/* Profile Content / Editing */}
        {!isEditing ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#221E16] bg-[#17140F] p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between text-[#918570]">
                <span className="flex items-center space-x-2">
                  <Phone className="h-3.5 w-3.5 text-accent-text" />
                  <span>Phone Number</span>
                </span>
                <span className="text-[#E6E5E4] font-mono">{currentUser.phone || 'Not provided'}</span>
              </div>

              {currentUser.role === 'provider' && linkedSalon && (
                <div className="flex items-center justify-between text-[#918570] pt-2 border-t border-[#2B251B]">
                  <span className="flex items-center space-x-2">
                    <Building2 className="h-3.5 w-3.5 text-accent-text" />
                    <span>Associated Studio</span>
                  </span>
                  <span className="text-[#E6E5E4] font-medium">{linkedSalon.name}</span>
                </div>
              )}

              {currentUser.bio && (
                <div className="pt-2 border-t border-[#2B251B]">
                  <p className="text-[#918570] mb-1 font-mono uppercase tracking-wider text-[10px]">Aesthetic Bio</p>
                  <p className="text-[#ADA69A] italic leading-relaxed">"{currentUser.bio}"</p>
                </div>
              )}
            </div>

            {/* Quick Action Navigation */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {currentUser.role === 'provider' ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSalonPortal?.();
                  }}
                  className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border border-[#574D3C]/40 bg-[#574D3C]/10 text-xs text-[#E6E5E4] hover:bg-[#574D3C]/20 transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5 text-[#E6E5E4]" />
                  <span>Manage Atelier</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBookings?.();
                  }}
                  className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border border-[#574D3C]/40 bg-[#574D3C]/10 text-xs text-[#E6E5E4] hover:bg-[#574D3C]/20 transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5 text-[#E6E5E4]" />
                  <span>View Bookings</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center space-x-1.5 p-2.5 rounded-xl border border-[#2B251B] bg-[#1B1711] text-xs text-[#E6E5E4] hover:border-[#3F3729] transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5 text-[#918570]" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="w-full mt-3 flex items-center justify-center space-x-2 rounded-xl border border-red-500/20 bg-red-950/20 py-2.5 text-xs font-medium text-red-300 hover:bg-red-950/40 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out of Leish!</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-mono uppercase tracking-wider text-[#A79F92] mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-accent-soft bg-[#15120D] py-2 px-3 text-[#E6E5E4] focus:border-accent-strong focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono uppercase tracking-wider text-[#A79F92] mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-accent-soft bg-[#15120D] py-2 px-3 text-[#E6E5E4] focus:border-accent-strong focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono uppercase tracking-wider text-[#A79F92] mb-1">
                Bio / Style Preferences
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-accent-soft bg-[#15120D] py-2 px-3 text-[#E6E5E4] focus:border-accent-strong focus:outline-none resize-none"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#2B251B] bg-[#17140F] text-[#918570] hover:text-[#E6E5E4]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#574D3C] font-medium text-[#E6E5E4] shadow-lg shadow-[#574D3C]/20 flex items-center justify-center space-x-1.5"
              >
                {isSaving ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

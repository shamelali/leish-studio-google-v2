/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Loader2,
  Palette,
  MapPin,
  Car,
  Sparkles,
  Calculator
} from 'lucide-react';
import { Salon, Service, StaffMember, Booking, User, LookbookItem } from '../types';
import { useCreateBooking } from '../lib/api';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: Salon;
  service: Service;
  currentUser: User | null;
  onBookingSuccess: (booking: Booking) => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  attachedMoodboard?: LookbookItem | null;
}

const bookingFormSchema = z.object({
  clientName: z.string().min(1, 'Name is required').max(100),
  clientEmail: z.string().email('Invalid email address'),
  clientPhone: z.string().min(1, 'Phone number is required'),
  notes: z.string().max(1000).optional(),
  isLocationEvent: z.boolean().optional(),
  eventVenue: z.string().max(200).optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function BookingModal({
  isOpen,
  onClose,
  salon,
  service,
  currentUser,
  onBookingSuccess,
  onOpenAuth,
  attachedMoodboard
}: BookingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(salon.staff[0] || null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLocationEvent, setIsLocationEvent] = useState<boolean>(false);
  const [eventVenue, setEventVenue] = useState<string>('');
  const [calculatingTravel, setCalculatingTravel] = useState<boolean>(false);
  const [travelQuote, setTravelQuote] = useState<{
    distanceMiles: number;
    estimatedDriveMinutes: number;
    totalTravelFee: number;
    baseKitFee: number;
    mileageFee: number;
  } | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: currentUser?.name || '',
      clientEmail: currentUser?.email || '',
      clientPhone: currentUser?.phone || '',
      notes: '',
      isLocationEvent: false,
      eventVenue: '',
    },
  });

  const createBooking = useCreateBooking();

  React.useEffect(() => {
    if (currentUser) {
      reset({
        clientName: currentUser.name,
        clientEmail: currentUser.email,
        clientPhone: currentUser.phone || '',
      });
    }
  }, [currentUser, reset]);

  React.useEffect(() => {
    if (attachedMoodboard) {
      reset({
        ...getValues(),
        notes: `[Attached Lookbook: "${attachedMoodboard.lookName}"]\nLip: ${attachedMoodboard.lipFormula.shade}\nComplexion: ${attachedMoodboard.complexion.finish}`,
      });
    }
  }, [attachedMoodboard, reset]);

  if (!isOpen) return null;

  const handleEstimateTravel = async () => {
    if (!eventVenue.trim()) return;
    setCalculatingTravel(true);
    try {
      const res = await fetch('/api/venue/estimate-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salonId: salon.id, venue: eventVenue }),
      });
      if (!res.ok) throw new Error('Could not calculate venue distance');
      const data = await res.json();
      setTravelQuote(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCalculatingTravel(false);
    }
  };

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const dayOfWeek = nextDate.toLocaleDateString('en-US', { weekday: 'long' });
      const isSunday = dayOfWeek === 'Sunday';
      const isClosed = salon.workingHours[dayOfWeek as keyof typeof salon.workingHours] === 'Closed';
      if (!isSunday && !isClosed) {
        dates.push({
          formatted: nextDate.toISOString().split('T')[0],
          displayDay: nextDate.toLocaleDateString('en-US', { weekday: 'short' }),
          displayNum: nextDate.getDate(),
          displayMonth: nextDate.toLocaleDateString('en-US', { month: 'short' }),
        });
      }
    }
    return dates;
  };

  const timeSlots = [
    '09:00 AM', '10:30 AM', '11:00 AM', '12:30 PM',
    '01:30 PM', '03:00 PM', '04:30 PM', '05:00 PM', '06:30 PM',
  ];

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedDate || !selectedTime) return;
      setStep(2);
    }
  };

  const handleBackStep = () => {
    if (step === 2) setStep(1);
  };

  const onSubmit = async (data: BookingFormData) => {
    if (isLocationEvent && !eventVenue.trim()) return;

    try {
      const bookingData = {
        salonId: salon.id,
        serviceId: service.id,
        staffId: selectedStaff?.id,
        date: selectedDate,
        time: selectedTime,
        clientName: data.clientName,
        clientEmail: currentUser ? currentUser.email : data.clientEmail,
        clientPhone: data.clientPhone,
        notes: data.notes,
        isLocationEvent,
        eventVenue: isLocationEvent ? eventVenue : undefined,
        travelSurcharge: (isLocationEvent && travelQuote) ? travelQuote.totalTravelFee : (isLocationEvent ? 50 : 0),
        attachedMoodboard: attachedMoodboard ? {
          lookName: attachedMoodboard.lookName,
          palette: attachedMoodboard.colorPalette,
          lipFormula: `${attachedMoodboard.lipFormula.shade} (${attachedMoodboard.lipFormula.finish})`,
          eyeStyle: attachedMoodboard.eyeArtistry.style,
        } : undefined,
      };

      const result = await createBooking.mutateAsync(bookingData);
      setConfirmedBooking(result);
      setStep(3);
      onBookingSuccess(result);
    } catch (err: any) {
      console.error(err);
    }
  };

  const formattedDateString = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step !== 3 ? onClose : undefined}
        className="absolute inset-0 bg-[#0D0B0A]/85 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[#221F1D] bg-[#141211] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#221F1D] px-6 py-4">
          <div>
            <h3 className="font-serif text-lg font-medium text-[#FAF8F5]">
              {step === 3 ? 'Booking Confirmed' : 'Configure Appointment'}
            </h3>
            {step !== 3 && (
              <p className="text-xs text-[#C5BDB6] mt-0.5">
                {salon.name} &bull; {service.name}
              </p>
            )}
          </div>
          {step !== 3 && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-[#C5BDB6] transition-colors hover:bg-[#1E1A17] hover:text-[#FAF8F5]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div>
                  <label className="text-xs font-mono tracking-wider text-[#E9D2C4] uppercase block mb-3">
                    Choose Specialist
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {salon.staff.map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => setSelectedStaff(staff)}
                        className={`flex items-center space-x-3 rounded-xl border p-3 text-left transition-all duration-300 ${
                          selectedStaff?.id === staff.id
                            ? 'border-[#9A1A18] bg-[#9A1A18]/5'
                            : 'border-[#221F1D] bg-[#1E1A17]/30 hover:border-[#383330]'
                        }`}
                      >
                        <img
                          src={staff.avatar}
                          alt={staff.name}
                          className="h-10 w-10 rounded-full object-cover grayscale"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#FAF8F5]">{staff.name}</p>
                          <p className="truncate text-[10px] text-[#C5BDB6]">{staff.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-mono tracking-wider text-[#E9D2C4] uppercase block">
                      Select Date
                    </label>
                    {selectedDate && (
                      <span className="text-xs text-[#FAF8F5] font-serif">
                        {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#221F1D]">
                    {getAvailableDates().map((d) => (
                      <button
                        key={d.formatted}
                        type="button"
                        onClick={() => setSelectedDate(d.formatted)}
                        className={`flex flex-col items-center justify-center shrink-0 rounded-xl w-14 py-3 border transition-all duration-300 ${
                          selectedDate === d.formatted
                            ? 'border-[#9A1A18] bg-[#9A1A18]/10 text-[#FAF8F5]'
                            : 'border-[#221F1D] bg-[#1E1A17]/30 text-[#C5BDB6] hover:border-[#383330] hover:text-[#FAF8F5]'
                        }`}
                      >
                        <span className="text-[10px] font-mono uppercase tracking-tight">{d.displayDay}</span>
                        <span className="text-base font-serif font-bold mt-1">{d.displayNum}</span>
                        <span className="text-[9px] opacity-70 mt-0.5">{d.displayMonth}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono tracking-wider text-[#E9D2C4] uppercase block mb-3">
                    Available Time Slots
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`rounded-lg py-2 text-center text-xs border transition-all duration-300 ${
                          selectedTime === time
                            ? 'border-[#9A1A18] bg-[#9A1A18] text-[#FAF8F5]'
                            : 'border-[#221F1D] bg-[#1E1A17]/30 text-[#C5BDB6] hover:border-[#383330] hover:text-[#FAF8F5]'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-[#9A1A18] py-3.5 text-sm font-semibold text-[#FAF8F5] transition-all duration-300 hover:bg-[#C82A27] shadow-lg shadow-[#9A1A18]/20"
                >
                  <span>Continue to Details</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {attachedMoodboard && (
                    <div className="rounded-xl border border-[#9A1A18]/50 bg-[#9A1A18]/10 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#E9D2C4] font-semibold flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#E9D2C4]" />
                          Attached Custom Lookbook
                        </span>
                        <span className="text-[10px] text-[#A89F91] capitalize">{attachedMoodboard.category}</span>
                      </div>
                      <p className="text-xs font-serif font-bold text-[#FAF8F5]">{attachedMoodboard.lookName}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        {attachedMoodboard.colorPalette.map((swatch, idx) => (
                          <div
                            key={idx}
                            title={swatch.name}
                            className="h-4 w-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: swatch.hex }}
                          />
                        ))}
                        <span className="text-[10px] text-[#C5BDB6] ml-2 truncate">
                          Lip: {attachedMoodboard.lipFormula.shade}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-[#221F1D] bg-[#1E1A17]/40 p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between border-b border-[#221F1D]/50 pb-2">
                      <span className="text-[#C5BDB6]">Makeup Artist:</span>
                      <span className="font-semibold text-[#FAF8F5]">{selectedStaff?.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-[#221F1D]/50 pb-2">
                      <span className="text-[#C5BDB6]">Appointment:</span>
                      <span className="font-semibold text-[#FAF8F5]">
                        {formattedDateString(selectedDate)} at {selectedTime}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#221F1D]/50 pb-2">
                      <span className="text-[#C5BDB6]">Base Service Fee:</span>
                      <span className="text-[#FAF8F5] font-medium">RM{service.price}</span>
                    </div>
                    {isLocationEvent && (
                      <div className="flex justify-between border-b border-[#221F1D]/50 pb-2 text-amber-200/90">
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          On-Location Travel & Kit Fee:
                        </span>
                        <span className="font-medium">+RM{travelQuote ? travelQuote.totalTravelFee : 50}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1">
                      <span className="text-[#C5BDB6]">Total Estimated:</span>
                      <span className="font-serif font-bold text-base text-[#E9D2C4]">
                        RM{service.price + (isLocationEvent && travelQuote ? travelQuote.totalTravelFee : (isLocationEvent ? 50 : 0))}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#221F1D] bg-[#120F0E] p-3 space-y-3">
                    <label className="text-[10px] font-mono tracking-wider text-[#E9D2C4] uppercase block">
                      Appointment Location
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsLocationEvent(false)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                          !isLocationEvent
                            ? 'border-[#9A1A18] bg-[#9A1A18]/20 text-[#FAF8F5]'
                            : 'border-[#221F1D] text-[#8E867E] hover:border-[#383330]'
                        }`}
                      >
                        In Studio Atelier
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsLocationEvent(true)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                          isLocationEvent
                            ? 'border-[#9A1A18] bg-[#9A1A18]/20 text-[#FAF8F5]'
                            : 'border-[#221F1D] text-[#8E867E] hover:border-[#383330]'
                        }`}
                      >
                        On-Location / Venue
                      </button>
                    </div>

                    {isLocationEvent && (
                      <div className="pt-2 space-y-2 border-t border-[#221F1D]">
                        <label className="text-[10px] font-mono tracking-wider text-[#A89F91] uppercase block">
                          Event Venue / Hotel Suite Address
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={eventVenue}
                            onChange={(e) => setEventVenue(e.target.value)}
                            placeholder="e.g. The Majestic Hotel, Grand Ballroom / Suite 902"
                            className="flex-1 rounded-lg border border-[#2B231F] bg-[#0A0807] px-3 py-2 text-xs text-[#FAF8F5] placeholder-[#5C534D] focus:border-[#9A1A18] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleEstimateTravel}
                            disabled={calculatingTravel || !eventVenue.trim()}
                            className="px-3 py-2 rounded-lg bg-[#221B18] hover:bg-[#322722] text-[#FAF8F5] text-xs font-mono disabled:opacity-50 shrink-0 border border-[#3E2F29] flex items-center gap-1.5"
                          >
                            {calculatingTravel ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calculator className="h-3 w-3 text-[#E9D2C4]" />}
                            <span>Calculate</span>
                          </button>
                        </div>

                        {travelQuote && (
                          <div className="p-2.5 rounded-lg bg-black/40 border border-[#2C221D] text-[11px] text-[#C5BDB6] space-y-1">
                            <div className="flex justify-between text-[#FAF8F5]">
                              <span>Estimated Distance: <strong>{travelQuote.distanceMiles} km</strong></span>
                              <span>Drive Time: ~{travelQuote.estimatedDriveMinutes} mins</span>
                            </div>
                            <div className="flex justify-between text-[#8E867E]">
                              <span>Base mobile kit (RM50) + mileage (RM{travelQuote.mileageFee})</span>
                              <span className="text-[#E9D2C4] font-semibold">RM{travelQuote.totalTravelFee} total</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-mono tracking-wider text-[#E9D2C4] uppercase block mb-1.5">
                        Client Full Name
                      </label>
                      <input
                        type="text"
                        {...register('clientName')}
                        placeholder="e.g. Amanda Seyfried"
                        className="w-full rounded-xl border border-[#221F1D] bg-[#1E1A17]/40 px-4 py-3 text-sm text-[#FAF8F5] placeholder-[#6E645E] focus:border-[#9A1A18] focus:outline-none focus:ring-1 focus:ring-[#9A1A18]"
                      />
                      {errors.clientName && (
                        <p className="text-[10px] text-red-400 mt-1">{errors.clientName.message}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-mono tracking-wider text-[#E9D2C4] uppercase block">
                          Email Address
                        </label>
                        {!currentUser && (
                          <button
                            type="button"
                            onClick={() => onOpenAuth('signin')}
                            className="text-[11px] text-[#E9D2C4] hover:underline"
                          >
                            Sign in to auto-fill
                          </button>
                        )}
                      </div>
                      <input
                        type="email"
                        {...register('clientEmail')}
                        disabled={!!currentUser}
                        placeholder="client@example.com"
                        className={`w-full rounded-xl border border-[#221F1D] px-4 py-3 text-sm focus:outline-none transition-colors ${
                          currentUser
                            ? 'bg-[#1E1A17]/20 text-[#C5BDB6]/70 cursor-not-allowed'
                            : 'bg-[#1E1A17]/40 text-[#FAF8F5] placeholder-[#6E645E] focus:border-[#9A1A18] focus:ring-1 focus:ring-[#9A1A18]'
                        }`}
                      />
                      {errors.clientEmail && (
                        <p className="text-[10px] text-red-400 mt-1">{errors.clientEmail.message}</p>
                      )}
                      <p className="text-[10px] text-[#6E645E] mt-1 font-mono">
                        {currentUser ? 'Booked on this verified account.' : 'Your appointment ticket will be emailed here.'}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-mono tracking-wider text-[#E9D2C4] uppercase block mb-1.5">
                        Telephone Number
                      </label>
                      <input
                        type="tel"
                        {...register('clientPhone')}
                        placeholder="e.g. (555) 019-2834"
                        className="w-full rounded-xl border border-[#221F1D] bg-[#1E1A17]/40 px-4 py-3 text-sm text-[#FAF8F5] placeholder-[#6E645E] focus:border-[#9A1A18] focus:outline-none focus:ring-1 focus:ring-[#9A1A18]"
                      />
                      {errors.clientPhone && (
                        <p className="text-[10px] text-red-400 mt-1">{errors.clientPhone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-mono tracking-wider text-[#E9D2C4] uppercase block mb-1.5">
                        Add Special Instructions (Optional)
                      </label>
                      <textarea
                        {...register('notes')}
                        placeholder="e.g. Skin sensitivity, dress color, ceremony lighting, preferred lipstick finish..."
                        rows={2}
                        className="w-full rounded-xl border border-[#221F1D] bg-[#1E1A17]/40 px-4 py-3 text-sm text-[#FAF8F5] placeholder-[#6E645E] focus:border-[#9A1A18] focus:outline-none focus:ring-1 focus:ring-[#9A1A18] resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={handleBackStep}
                      className="w-1/3 rounded-xl border border-[#221F1D] py-3.5 text-xs font-semibold text-[#C5BDB6] transition-all duration-300 hover:bg-[#1E1A17] hover:text-[#FAF8F5]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={createBooking.isPending}
                      className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-[#9A1A18] py-3.5 text-xs font-semibold text-[#FAF8F5] transition-all duration-300 hover:bg-[#C82A27] disabled:opacity-50"
                    >
                      {createBooking.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Reserving Slot...</span>
                        </>
                      ) : (
                        <span>Confirm Luxury Booking</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 3 && confirmedBooking && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-6"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-serif text-2xl font-semibold text-[#FAF8F5]">Your ritual is scheduled!</h4>
                  <p className="text-sm text-[#C5BDB6] max-w-sm mx-auto">
                    We have successfully registered your beauty reservation at <span className="text-[#FAF8F5] font-semibold">{salon.name}</span>.
                  </p>
                </div>

                <div className="rounded-xl border border-dashed border-[#383330] bg-[#1E1A17]/60 p-5 text-left max-w-sm mx-auto space-y-3 relative font-mono text-xs">
                  <div className="flex justify-between text-[#C5BDB6] uppercase text-[10px]">
                    <span>Receipt/Pass No.</span>
                    <span className="text-[#FAF8F5]">{confirmedBooking.id}</span>
                  </div>

                  <div className="border-t border-[#383330] pt-3">
                    <p className="text-[#C5BDB6] text-[10px] uppercase">Service</p>
                    <p className="text-[#FAF8F5] font-bold text-sm font-sans">{confirmedBooking.serviceName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[#C5BDB6] text-[10px] uppercase">Date</p>
                      <p className="text-[#FAF8F5] font-semibold">{confirmedBooking.date}</p>
                    </div>
                    <div>
                      <p className="text-[#C5BDB6] text-[10px] uppercase">Time</p>
                      <p className="text-[#FAF8F5] font-semibold">{confirmedBooking.time}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[#C5BDB6] text-[10px] uppercase">Stylist</p>
                      <p className="text-[#FAF8F5] font-semibold">{confirmedBooking.staffName}</p>
                    </div>
                    <div>
                      <p className="text-[#C5BDB6] text-[10px] uppercase">Total Fee</p>
                      <p className="text-[#E9D2C4] font-bold font-serif text-sm">
                        RM{confirmedBooking.servicePrice + (confirmedBooking.travelSurcharge || 0)}
                      </p>
                    </div>
                  </div>

                  {confirmedBooking.isLocationEvent && (
                    <div className="border-t border-[#383330] pt-2 text-[11px] text-amber-200/90">
                      <p className="text-[10px] uppercase text-[#8E867E]">On-Location Destination</p>
                      <p className="truncate font-sans font-medium">{confirmedBooking.eventVenue}</p>
                    </div>
                  )}

                  {confirmedBooking.attachedMoodboard && (
                    <div className="border-t border-[#383330] pt-2 text-[11px]">
                      <p className="text-[10px] uppercase text-[#E9D2C4] flex items-center gap-1 font-semibold">
                        <Sparkles className="h-2.5 w-2.5 text-[#E9D2C4]" />
                        Attached Lookbook
                      </p>
                      <p className="text-[#FAF8F5] font-sans truncate">{confirmedBooking.attachedMoodboard.lookName}</p>
                    </div>
                  )}

                  <div className="border-t border-[#383330] pt-2 text-center text-[10px] text-[#6E645E]">
                    Confirmation sent to {confirmedBooking.clientEmail}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-[#FAF8F5] py-3.5 text-xs font-semibold text-[#0D0B0A] transition-all duration-300 hover:bg-[#FAF8F5]/90"
                >
                  Return to Discovery
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

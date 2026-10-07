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
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Scissors,
  Building2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { User, Salon } from '../types';
import { authApi } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onAuthSuccess: (user: User, token: string) => void;
  salons?: Salon[];
  promptMessage?: string;
}

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  role: z.enum(['client', 'provider']).optional(),
  phone: z.string().optional(),
  salonId: z.string().optional(),
  bio: z.string().max(500).optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'signin',
  onAuthSuccess,
  salons = [],
  promptMessage
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'client',
      phone: '',
      salonId: salons[0]?.id || 'salon-1',
      bio: '',
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      loginForm.reset();
      registerForm.reset();
    }
  }, [isOpen, initialMode, loginForm, registerForm]);

  if (!isOpen) return null;

  const handleLogin = async (data: LoginFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await authApi.login(data);
      setSuccessMessage(`Welcome back, ${response.user.name}!`);
      setTimeout(() => {
        onAuthSuccess(response.user, response.token);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in. Please check your credentials.');
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await authApi.register(data);
      setSuccessMessage('Account created successfully! Signing you in...');
      setTimeout(() => {
        onAuthSuccess(response.user, response.token);
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    loginForm.setValue('email', demoEmail);
    loginForm.setValue('password', demoPass);
    setErrorMessage(null);
    try {
      const response = await authApi.login({ email: demoEmail, password: demoPass });
      setSuccessMessage(`Logged in as ${response.user.name}`);
      setTimeout(() => {
        onAuthSuccess(response.user, response.token);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-md my-8 rounded-3xl border border-[#2A2421] bg-[#120F0D] p-6 sm:p-8 shadow-2xl shadow-black/90 text-[#FAF8F5]"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-[#8C827A] hover:bg-[#1E1A17] hover:text-[#FAF8F5] transition-colors"
          aria-label="Close authentication modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-baseline font-serif text-3xl font-semibold tracking-tight text-[#FAF8F5] mb-1">
            <span>Lei</span>
            <span className="text-[#9A1A18] italic font-bold">sh</span>
            <span className="text-[#FAF8F5] text-2xl ml-0.5">!</span>
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#E9D2C4]">
            Aesthetic Marketplace
          </p>
          {promptMessage && (
            <div className="mt-3 inline-block rounded-xl border border-[#9A1A18]/40 bg-[#9A1A18]/10 px-3.5 py-1.5 text-xs text-[#E9D2C4]">
              {promptMessage}
            </div>
          )}
        </div>

        <div className="flex rounded-xl bg-[#1C1815] p-1 mb-6 border border-[#2A2421]">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-medium tracking-wide rounded-lg transition-all duration-200 ${
              mode === 'signin'
                ? 'bg-[#9A1A18] text-[#FAF8F5] shadow-md font-semibold'
                : 'text-[#8C827A] hover:text-[#FAF8F5]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(null); }}
            className={`flex-1 py-2 text-xs font-medium tracking-wide rounded-lg transition-all duration-200 ${
              mode === 'signup'
                ? 'bg-[#9A1A18] text-[#FAF8F5] shadow-md font-semibold'
                : 'text-[#8C827A] hover:text-[#FAF8F5]'
            }`}
          >
            Create Account
          </button>
        </div>

        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 flex items-start space-x-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 flex items-center space-x-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-xs text-emerald-200"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {mode === 'signin' ? (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A89E96] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C827A]" />
                <input
                  type="email"
                  {...loginForm.register('email')}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#2A2421] bg-[#161311] py-2.5 pl-10 pr-3 text-sm text-[#FAF8F5] placeholder-[#5A524D] focus:border-[#9A1A18] focus:outline-none transition-colors"
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-[10px] text-red-400 mt-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A89E96]">
                  Password
                </label>
                <span className="text-[11px] text-[#A89E96]">Demo Pass: password123</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C827A]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...loginForm.register('password')}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#2A2421] bg-[#161311] py-2.5 pl-10 pr-10 text-sm text-[#FAF8F5] placeholder-[#5A524D] focus:border-[#9A1A18] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C827A] hover:text-[#FAF8F5]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-[10px] text-red-400 mt-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full mt-2 flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#9A1A18] to-[#801412] py-3 px-4 text-sm font-semibold text-[#FAF8F5] shadow-lg shadow-[#9A1A18]/25 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loginForm.formState.isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Leish!</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A89E96] mb-2">
                I want to join as:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => registerForm.setValue('role', 'client')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    registerForm.watch('role') === 'client'
                      ? 'border-[#9A1A18] bg-[#9A1A18]/15 text-[#FAF8F5]'
                      : 'border-[#2A2421] bg-[#161311] text-[#8C827A] hover:border-[#3D3530]'
                  }`}
                >
                  <Sparkles className={`h-4 w-4 mb-1.5 ${registerForm.watch('role') === 'client' ? 'text-[#E9D2C4]' : 'text-[#8C827A]'}`} />
                  <span className="text-xs font-medium">Makeup Client</span>
                  <span className="text-[10px] text-[#A89E96] mt-0.5">Book glam & trials</span>
                </button>

                <button
                  type="button"
                  onClick={() => registerForm.setValue('role', 'provider')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    registerForm.watch('role') === 'provider'
                      ? 'border-[#9A1A18] bg-[#9A1A18]/15 text-[#FAF8F5]'
                      : 'border-[#2A2421] bg-[#161311] text-[#8C827A] hover:border-[#3D3530]'
                  }`}
                >
                  <Building2 className={`h-4 w-4 mb-1.5 ${registerForm.watch('role') === 'provider' ? 'text-[#E9D2C4]' : 'text-[#8C827A]'}`} />
                  <span className="text-xs font-medium">Studio / MUA</span>
                  <span className="text-[10px] text-[#A89E96] mt-0.5">Makeup Artist Director</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A89E96] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C827A]" />
                <input
                  type="text"
                  {...registerForm.register('name')}
                  placeholder="e.g. Camille Laurent"
                  className="w-full rounded-xl border border-[#2A2421] bg-[#161311] py-2.5 pl-10 pr-3 text-sm text-[#FAF8F5] placeholder-[#5A524D] focus:border-[#9A1A18] focus:outline-none transition-colors"
                />
              </div>
              {registerForm.formState.errors.name && (
                <p className="text-[10px] text-red-400 mt-1">{registerForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A89E96] mb-1.5">
                Phone Number <span className="text-[10px] text-[#716862] normal-case">(For booking SMS alerts)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C827A]" />
                <input
                  type="tel"
                  {...registerForm.register('phone')}
                  placeholder="+60 12-345 6789"
                  className="w-full rounded-xl border border-[#2A2421] bg-[#161311] py-2.5 pl-10 pr-3 text-sm text-[#FAF8F5] placeholder-[#5A524D] focus:border-[#9A1A18] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {registerForm.watch('role') === 'provider' && (
              <div className="p-3 rounded-xl border border-[#2A2421] bg-[#161311] space-y-2.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#E9D2C4] flex items-center space-x-1">
                  <Building2 className="h-3.5 w-3.5 text-[#9A1A18]" />
                  <span>Associate with Makeup Studio</span>
                </label>
                <select
                  {...registerForm.register('salonId')}
                  className="w-full rounded-lg border border-[#3D3530] bg-[#1F1B18] py-2 px-3 text-xs text-[#FAF8F5] focus:border-[#9A1A18] focus:outline-none"
                >
                  {salons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A89E96] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C827A]" />
                <input
                  type="email"
                  {...registerForm.register('email')}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#2A2421] bg-[#161311] py-2.5 pl-10 pr-3 text-sm text-[#FAF8F5] placeholder-[#5A524D] focus:border-[#9A1A18] focus:outline-none transition-colors"
                />
              </div>
              {registerForm.formState.errors.email && (
                <p className="text-[10px] text-red-400 mt-1">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A89E96] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C827A]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...registerForm.register('password')}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#2A2421] bg-[#161311] py-2.5 pl-10 pr-10 text-sm text-[#FAF8F5] placeholder-[#5A524D] focus:border-[#9A1A18] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C827A] hover:text-[#FAF8F5]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {registerForm.formState.errors.password && (
                <p className="text-[10px] text-red-400 mt-1">{registerForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={registerForm.formState.isSubmitting}
              className="w-full mt-2 flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#9A1A18] to-[#801412] py-3 px-4 text-sm font-semibold text-[#FAF8F5] shadow-lg shadow-[#9A1A18]/25 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {registerForm.formState.isSubmitting ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create My Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[#221F1D]">
          <p className="text-[11px] font-mono uppercase tracking-wider text-center text-[#7E746E] mb-3">
            Instant Demo Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('shamelali@gmail.com', 'password123')}
              className="flex items-center justify-center space-x-1.5 p-2 rounded-lg border border-[#2A2421] bg-[#181412] text-xs text-[#C5BDB6] hover:bg-[#201B17] hover:border-[#9A1A18]/50 hover:text-white transition-all"
            >
              <Sparkles className="h-3 w-3 text-[#E9D2C4]" />
              <span className="truncate">Client: Shamel</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('director@atelierleish.com', 'password123')}
              className="flex items-center justify-center space-x-1.5 p-2 rounded-lg border border-[#2A2421] bg-[#181412] text-xs text-[#C5BDB6] hover:bg-[#201B17] hover:border-[#9A1A18]/50 hover:text-white transition-all"
            >
              <Scissors className="h-3 w-3 text-[#9A1A18]" />
              <span className="truncate">Salon: Atelier</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center space-x-1.5 text-[11px] text-[#69615B]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#9A1A18]" />
          <span>Encrypted Beauty Profile • Leish! Aesthetic Security</span>
        </div>
      </motion.div>
    </div>
  );
}

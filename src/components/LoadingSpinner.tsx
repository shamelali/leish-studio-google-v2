/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-accent-text`} />
      {message && (
        <p className="text-xs font-mono text-[#ADA69A]">{message}</p>
      )}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen bg-[#0F0D0A] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center space-y-4"
      >
        <div className="flex items-baseline font-serif text-4xl font-semibold tracking-tight text-[#E6E5E4]">
          <span>Lei</span>
          <span className="text-accent-text italic font-bold">sh</span>
          <span className="text-[#E6E5E4] text-3xl ml-0.5">!</span>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-accent-text" />
        <p className="text-xs font-mono text-[#ADA69A]">Loading your beauty experience...</p>
      </motion.div>
    </div>
  );
}

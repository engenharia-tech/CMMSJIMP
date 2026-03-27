import React from 'react';
import { Wrench, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className, iconClassName, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {/* Background Glow */}
      <div className={cn(
        "absolute rounded-full blur-xl opacity-20 bg-blue-500",
        sizeClasses[size]
      )} />
      
      {/* Orange Cog as background */}
      <Cog 
        className={cn(
          "absolute text-orange-500 animate-[spin_15s_linear_infinite] drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]", 
          sizeClasses[size],
          iconClassName
        )} 
      />
      
      {/* Blue Wrench as foreground */}
      <Wrench 
        className={cn(
          "relative text-blue-600 -rotate-12 drop-shadow-[0_0_10px_rgba(37,99,235,0.5)]", 
          iconSizes[size],
          iconClassName
        )} 
      />
    </div>
  );
}

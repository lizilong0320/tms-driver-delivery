'use client';
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  const variants: Record<string, string> = {
    default: 'bg-primary text-white hover:bg-primary/90', destructive: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200', ghost: 'hover:bg-gray-100', link: 'text-primary underline-offset-4 hover:underline',
  };
  const sizes: Record<string, string> = { default: 'h-10 px-4 py-2', sm: 'h-9 px-3', lg: 'h-11 px-8', icon: 'h-10 w-10' };
  return React.createElement(Comp, { className: cn(base, variants[variant], sizes[size], className), ref, ...props });
});
Button.displayName = 'Button';
export { Button };

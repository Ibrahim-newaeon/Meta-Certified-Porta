import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const button = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)]',
        secondary:
          'border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--color-text)] hover:bg-[var(--surface-muted)]',
        danger:
          'bg-[var(--color-danger)] text-[var(--color-danger-fg-on)] hover:bg-[var(--color-danger-hover)]',
        dangerOutline:
          'border border-[var(--color-danger-border)] bg-[var(--surface)] text-[var(--color-danger-fg)] hover:bg-[var(--color-danger-bg)]',
        success:
          'bg-[var(--color-success)] text-[var(--color-success-fg-on)] hover:bg-[var(--color-success-hover)]',
        ghost:
          'text-[var(--color-text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--color-text)]',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
        iconSm: 'h-11 w-11 p-0 text-sm',
        iconMd: 'h-11 w-11 p-0 text-sm',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(button({ variant, size, block }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { button as buttonStyles };

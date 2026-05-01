import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badge = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-[var(--color-neutral-bg)] text-[var(--color-neutral-fg)]',
        info: 'bg-[var(--color-info-bg)] text-[var(--color-info-fg)]',
        success: 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)]',
        danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger-fg)]',
        warn: 'bg-[var(--color-warn-bg)] text-[var(--color-warn-fg)]',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badge>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}

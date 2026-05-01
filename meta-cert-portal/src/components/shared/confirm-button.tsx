'use client';
import { useState, useTransition } from 'react';
import { Dialog } from './dialog';
import { Button, type ButtonProps } from './button';

type Variant = 'danger' | 'primary' | 'neutral';

const TRIGGER_VARIANT: Record<Variant, NonNullable<ButtonProps['variant']>> = {
  danger: 'dangerOutline',
  primary: 'primary',
  neutral: 'secondary',
};

const CONFIRM_VARIANT: Record<Variant, NonNullable<ButtonProps['variant']>> = {
  danger: 'danger',
  primary: 'primary',
  neutral: 'primary',
};

type Props = {
  label: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  onConfirm: () => Promise<void> | void;
  triggerClassName?: string;
  triggerSize?: 'sm' | 'md' | 'lg';
};

export function ConfirmButton({
  label,
  title,
  description,
  confirmLabel = 'Confirm',
  pendingLabel,
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  triggerClassName,
  triggerSize = 'md',
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        variant={TRIGGER_VARIANT[variant]}
        size={triggerSize}
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={title}
        description={description}
        size="sm"
      >
        {error && (
          <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={CONFIRM_VARIANT[variant]}
            disabled={pending}
            onClick={() => {
              setError(null);
              start(async () => {
                try {
                  await onConfirm();
                  setOpen(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Something went wrong.');
                }
              });
            }}
          >
            {pending ? (pendingLabel ?? `${confirmLabel}…`) : confirmLabel}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

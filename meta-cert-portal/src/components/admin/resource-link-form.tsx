'use client';
import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createLinkResourceAction } from '@/app/admin/resources/actions';
import { Button } from '@/components/shared/button';
import { Input, FieldLabel } from '@/components/shared/input';

const EXAM_CODES = ['MCDMA', 'MCMBP', 'MCMSP', 'MCCM', 'MCCSP', 'MCMDA'];

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function ResourceLinkForm({ lessonId }: { lessonId: string }) {
  const [state, action] = useActionState(createLinkResourceAction, null);
  const [url, setUrl] = useState('');
  const titleId = useId();
  const urlId = useId();
  const orderId = useId();

  return (
    <form
      action={action}
      className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <div>
        <FieldLabel htmlFor={titleId}>Title</FieldLabel>
        <Input id={titleId} name="title" required className="mt-1" />
      </div>
      <div>
        <FieldLabel htmlFor={urlId}>URL</FieldLabel>
        <Input
          id={urlId}
          name="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.facebook.com/business/learn/..."
          className="mt-1"
        />
      </div>
      <fieldset>
        <legend className="text-xs font-medium text-[var(--color-text-muted)]">Exam tags</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {EXAM_CODES.map((c) => (
            <label
              key={c}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs hover:bg-[var(--surface-muted)]"
            >
              <input type="checkbox" name="examCodes" value={c} />
              <span className="font-mono">{c}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor={orderId}>Order</FieldLabel>
          <Input id={orderId} name="orderIndex" type="number" defaultValue={0} className="mt-1" />
        </div>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {state.error}
        </p>
      )}
      <Submit label="Add link" pendingLabel="Adding link…" />
    </form>
  );
}

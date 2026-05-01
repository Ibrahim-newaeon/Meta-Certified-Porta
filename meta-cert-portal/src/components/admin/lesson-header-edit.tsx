'use client';
import { useId, useState, useTransition } from 'react';
import { updateLessonAction } from '@/app/admin/lessons/actions';
import { Button } from '@/components/shared/button';
import { Input, Textarea, FieldLabel } from '@/components/shared/input';

export function LessonHeaderEdit({
  lesson,
  trackId,
}: {
  lesson: {
    id: string;
    title: string;
    summary: string | null;
    est_minutes: number | null;
    order_index: number;
  };
  trackId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const summaryId = useId();
  const orderId = useId();
  const estId = useId();

  if (!editing) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
        Edit lesson info
      </Button>
    );
  }

  return (
    <form
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await updateLessonAction(null, fd);
          if (res?.error) setError(res.error);
          else setEditing(false);
        });
      }}
      className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4"
    >
      <input type="hidden" name="id" value={lesson.id} />
      <input type="hidden" name="trackId" value={trackId} />
      <div>
        <FieldLabel htmlFor={titleId}>Title</FieldLabel>
        <Input id={titleId} name="title" defaultValue={lesson.title} required className="mt-1" />
      </div>
      <div>
        <FieldLabel htmlFor={summaryId}>Summary</FieldLabel>
        <Textarea
          id={summaryId}
          name="summary"
          defaultValue={lesson.summary ?? ''}
          rows={3}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel htmlFor={orderId}>Order</FieldLabel>
          <Input
            id={orderId}
            name="orderIndex"
            type="number"
            defaultValue={lesson.order_index}
            className="mt-1"
          />
        </div>
        <div>
          <FieldLabel htmlFor={estId}>Est minutes</FieldLabel>
          <Input
            id={estId}
            name="estMinutes"
            type="number"
            defaultValue={lesson.est_minutes ?? 10}
            className="mt-1"
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

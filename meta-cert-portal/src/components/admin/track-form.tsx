'use client';
import { useActionState, useId, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { createTrackAction, updateTrackAction } from '@/app/admin/tracks/actions';
import { Dialog } from '@/components/shared/dialog';
import { Button } from '@/components/shared/button';
import { Input, Textarea, FieldLabel } from '@/components/shared/input';

function Submit({ idleLabel = 'Save', pendingLabel = 'Saving…' }: { idleLabel?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="mt-1">{children(id)}</div>
    </div>
  );
}

export function TrackCreateForm() {
  const [state, action] = useActionState(createTrackAction, null);

  return (
    <form
      action={action}
      className="grid grid-cols-1 gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 md:grid-cols-2"
    >
      <Field label="Code (e.g. MCMBP)">
        {(id) => <Input id={id} name="code" required maxLength={8} className="uppercase" />}
      </Field>
      <Field label="Slug">
        {(id) => <Input id={id} name="slug" required className="lowercase" />}
      </Field>
      <div className="md:col-span-2">
        <Field label="Title">
          {(id) => <Input id={id} name="title" required />}
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Description">
          {(id) => <Textarea id={id} name="description" rows={3} />}
        </Field>
      </div>
      <Field label="Exam minutes">
        {(id) => <Input id={id} name="examMinutes" type="number" defaultValue={75} />}
      </Field>
      <Field label="Pass score (%)">
        {(id) => <Input id={id} name="passScore" type="number" defaultValue={70} />}
      </Field>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="isPublished" />
        Publish immediately
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300 md:col-span-2">
          {state.error}
        </p>
      )}
      <div className="md:col-span-2">
        <Submit idleLabel="Create track" pendingLabel="Creating track…" />
      </div>
    </form>
  );
}

export type TrackEditValues = {
  id: string;
  code: string;
  title: string;
  slug: string;
  description: string | null;
  examMinutes: number;
  passScore: number;
};

export function TrackEditButton({ track }: { track: TrackEditValues }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Edit track"
        size="lg"
      >
        <form
          action={(fd) => {
            setError(null);
            start(async () => {
              const res = await updateTrackAction(track.id, {
                code: String(fd.get('code') ?? ''),
                title: String(fd.get('title') ?? ''),
                slug: String(fd.get('slug') ?? ''),
                description: String(fd.get('description') ?? ''),
                examMinutes: Number(fd.get('examMinutes') ?? track.examMinutes),
                passScore: Number(fd.get('passScore') ?? track.passScore),
              });
              if (res?.error) setError(res.error);
              else setOpen(false);
            });
          }}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <Field label="Code">
            {(id) => (
              <Input
                id={id}
                name="code"
                defaultValue={track.code}
                required
                maxLength={8}
                className="uppercase"
              />
            )}
          </Field>
          <Field label="Slug">
            {(id) => (
              <Input
                id={id}
                name="slug"
                defaultValue={track.slug}
                required
                className="lowercase"
              />
            )}
          </Field>
          <div className="md:col-span-2">
            <Field label="Title">
              {(id) => <Input id={id} name="title" defaultValue={track.title} required />}
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Description">
              {(id) => (
                <Textarea
                  id={id}
                  name="description"
                  defaultValue={track.description ?? ''}
                  rows={3}
                />
              )}
            </Field>
          </div>
          <Field label="Exam minutes">
            {(id) => (
              <Input
                id={id}
                name="examMinutes"
                type="number"
                defaultValue={track.examMinutes}
              />
            )}
          </Field>
          <Field label="Pass score (%)">
            {(id) => (
              <Input id={id} name="passScore" type="number" defaultValue={track.passScore} />
            )}
          </Field>
          {error && (
            <p role="alert" className="text-sm text-rose-700 dark:text-rose-300 md:col-span-2">
              {error}
            </p>
          )}
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving changes…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

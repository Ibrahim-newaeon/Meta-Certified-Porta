'use client';
import { useActionState, useId, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  createModuleAction,
  updateModuleAction,
  deleteModuleAction,
  reorderModuleAction,
} from '@/app/admin/modules/actions';
import {
  createLessonAction,
  updateLessonAction,
  deleteLessonAction,
  reorderLessonAction,
} from '@/app/admin/lessons/actions';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { Button } from '@/components/shared/button';
import { useLessonSelect } from './lesson-bulk-select';

const INPUT_SM =
  'mt-1 block h-10 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm text-[var(--color-text)] focus:border-[var(--color-focus-ring)] focus:ring-2 focus:ring-[var(--color-focus-ring)]/20 focus:outline-none';
const LABEL = 'block text-xs font-medium text-[var(--color-text-muted)]';

function MiniSubmit({ label, pendingLabel }: { label: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (pendingLabel ?? `${label}…`) : label}
    </Button>
  );
}

// ---------- MODULE: create ----------
export function ModuleCreateInline({ trackId }: { trackId: string }) {
  const [state, action] = useActionState(createModuleAction, null);
  const titleId = useId();
  const orderId = useId();
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-2"
    >
      <input type="hidden" name="trackId" value={trackId} />
      <div className="min-w-0 flex-1">
        <label htmlFor={titleId} className={LABEL}>
          New module title
        </label>
        <input id={titleId} name="title" required className={INPUT_SM} />
      </div>
      <div className="w-20 shrink-0">
        <label htmlFor={orderId} className={LABEL}>
          Order
        </label>
        <input
          id={orderId}
          name="orderIndex"
          type="number"
          defaultValue={0}
          className={INPUT_SM}
        />
      </div>
      <MiniSubmit label="Add module" pendingLabel="Adding…" />
      {state?.error && (
        <p role="alert" className="w-full text-xs text-rose-700 dark:text-rose-300">
          {state.error}
        </p>
      )}
    </form>
  );
}

// ---------- MODULE: edit ----------
export function ModuleEditInline({
  module: m,
  trackId,
  onDone,
}: {
  module: { id: string; title: string; order_index: number; description?: string | null };
  trackId: string;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const orderId = useId();
  return (
    <form
      action={(fd) => {
        setError(null);
        start(async () => {
          const result = await updateModuleAction(null, fd);
          if (result?.error) setError(result.error);
          else onDone();
        });
      }}
      className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-2"
    >
      <input type="hidden" name="id" value={m.id} />
      <input type="hidden" name="trackId" value={trackId} />
      <div className="min-w-0 flex-1 sm:min-w-[240px]">
        <label htmlFor={titleId} className={LABEL}>
          Title
        </label>
        <input
          id={titleId}
          name="title"
          defaultValue={m.title}
          required
          className={INPUT_SM}
        />
      </div>
      <div className="w-20 shrink-0">
        <label htmlFor={orderId} className={LABEL}>
          Order
        </label>
        <input
          id={orderId}
          name="orderIndex"
          type="number"
          defaultValue={m.order_index}
          className={INPUT_SM}
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onDone} disabled={pending}>
        Cancel
      </Button>
      {error && (
        <p role="alert" className="w-full text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}

export function ModuleRowActions({
  module: m,
  trackId,
  isFirst,
  isLast,
  onEdit,
}: {
  module: { id: string; title: string };
  trackId: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="iconSm"
        aria-label={`Move module "${m.title}" up`}
        disabled={isFirst || pending}
        onClick={() => start(() => reorderModuleAction(m.id, trackId, 'up').then(() => {}))}
      >
        <span aria-hidden="true">↑</span>
      </Button>
      <Button
        variant="ghost"
        size="iconSm"
        aria-label={`Move module "${m.title}" down`}
        disabled={isLast || pending}
        onClick={() => start(() => reorderModuleAction(m.id, trackId, 'down').then(() => {}))}
      >
        <span aria-hidden="true">↓</span>
      </Button>
      <Button variant="secondary" size="sm" onClick={onEdit}>
        Edit
      </Button>
      <DeleteModuleButton id={m.id} trackId={trackId} title={m.title} />
    </div>
  );
}

// ---------- LESSON: create ----------
export function LessonCreateInline({ moduleId }: { moduleId: string }) {
  const [state, action] = useActionState(createLessonAction, null);
  const titleId = useId();
  const orderId = useId();
  const estId = useId();
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-2 rounded-md bg-[var(--surface)] p-2"
    >
      <input type="hidden" name="moduleId" value={moduleId} />
      <div className="min-w-0 flex-1">
        <label htmlFor={titleId} className={LABEL}>
          New lesson title
        </label>
        <input id={titleId} name="title" required className={INPUT_SM} />
      </div>
      <div className="w-20 shrink-0">
        <label htmlFor={orderId} className={LABEL}>
          Order
        </label>
        <input
          id={orderId}
          name="orderIndex"
          type="number"
          defaultValue={0}
          className={INPUT_SM}
        />
      </div>
      <div className="w-20 shrink-0">
        <label htmlFor={estId} className={LABEL}>
          Est min
        </label>
        <input
          id={estId}
          name="estMinutes"
          type="number"
          defaultValue={10}
          className={INPUT_SM}
        />
      </div>
      <MiniSubmit label="Add lesson" pendingLabel="Adding…" />
      {state?.error && (
        <p role="alert" className="w-full text-xs text-rose-700 dark:text-rose-300">
          {state.error}
        </p>
      )}
    </form>
  );
}

// ---------- LESSON: edit ----------
export function LessonEditInline({
  lesson,
  trackId,
  onDone,
}: {
  lesson: {
    id: string;
    title: string;
    summary?: string | null;
    order_index: number;
    est_minutes: number | null;
  };
  trackId: string;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const orderId = useId();
  const estId = useId();
  const summaryId = useId();
  return (
    <form
      action={(fd) => {
        setError(null);
        start(async () => {
          const result = await updateLessonAction(null, fd);
          if (result?.error) setError(result.error);
          else onDone();
        });
      }}
      className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-2"
    >
      <input type="hidden" name="id" value={lesson.id} />
      <input type="hidden" name="trackId" value={trackId} />
      <div className="min-w-0 flex-1 sm:min-w-[240px]">
        <label htmlFor={titleId} className={LABEL}>
          Title
        </label>
        <input
          id={titleId}
          name="title"
          defaultValue={lesson.title}
          required
          className={INPUT_SM}
        />
      </div>
      <div className="w-20 shrink-0">
        <label htmlFor={orderId} className={LABEL}>
          Order
        </label>
        <input
          id={orderId}
          name="orderIndex"
          type="number"
          defaultValue={lesson.order_index}
          className={INPUT_SM}
        />
      </div>
      <div className="w-20 shrink-0">
        <label htmlFor={estId} className={LABEL}>
          Est min
        </label>
        <input
          id={estId}
          name="estMinutes"
          type="number"
          defaultValue={lesson.est_minutes ?? 10}
          className={INPUT_SM}
        />
      </div>
      <div className="w-full">
        <label htmlFor={summaryId} className={LABEL}>
          Summary
        </label>
        <textarea
          id={summaryId}
          name="summary"
          defaultValue={lesson.summary ?? ''}
          rows={2}
          className="mt-1 block w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--color-text)] focus:border-[var(--color-focus-ring)] focus:ring-2 focus:ring-[var(--color-focus-ring)]/20 focus:outline-none"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={onDone} disabled={pending}>
        Cancel
      </Button>
      {error && (
        <p role="alert" className="w-full text-xs text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}

export function LessonRowActions({
  lesson,
  moduleId,
  trackId,
  isFirst,
  isLast,
  onEdit,
}: {
  lesson: { id: string; title: string };
  moduleId: string;
  trackId: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="iconSm"
        aria-label={`Move lesson "${lesson.title}" up`}
        disabled={isFirst || pending}
        onClick={() =>
          start(() => reorderLessonAction(lesson.id, moduleId, trackId, 'up').then(() => {}))
        }
      >
        <span aria-hidden="true">↑</span>
      </Button>
      <Button
        variant="ghost"
        size="iconSm"
        aria-label={`Move lesson "${lesson.title}" down`}
        disabled={isLast || pending}
        onClick={() =>
          start(() => reorderLessonAction(lesson.id, moduleId, trackId, 'down').then(() => {}))
        }
      >
        <span aria-hidden="true">↓</span>
      </Button>
      <Button variant="secondary" size="sm" onClick={onEdit}>
        Edit
      </Button>
      <DeleteLessonButton id={lesson.id} trackId={trackId} title={lesson.title} />
    </div>
  );
}

// ---------- DELETE ----------
export function DeleteModuleButton({
  id,
  trackId,
  title,
}: {
  id: string;
  trackId: string;
  title?: string;
}) {
  return (
    <ConfirmButton
      label="Delete"
      title={title ? `Delete module "${title}"?` : 'Delete module?'}
      description="All lessons and resources in this module will be removed. This cannot be undone."
      confirmLabel="Delete module"
      variant="danger"
      triggerSize="sm"
      onConfirm={async () => {
        await deleteModuleAction(id, trackId);
      }}
    />
  );
}

export function DeleteLessonButton({
  id,
  trackId,
  title,
}: {
  id: string;
  trackId: string;
  title?: string;
}) {
  return (
    <ConfirmButton
      label="Delete"
      title={title ? `Delete lesson "${title}"?` : 'Delete lesson?'}
      description="All resources for this lesson will be removed. This cannot be undone."
      confirmLabel="Delete lesson"
      variant="danger"
      triggerSize="sm"
      onConfirm={async () => {
        await deleteLessonAction(id, trackId);
      }}
    />
  );
}

// ---------- Combined module/lesson row that owns its own edit/view state ----------
export function ModuleRow({
  module: m,
  trackId,
  isFirst,
  isLast,
  children,
}: {
  module: { id: string; title: string; order_index: number; description?: string | null };
  trackId: string;
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      {editing ? (
        <ModuleEditInline module={m} trackId={trackId} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--color-text-subtle)]">#{m.order_index}</span>{' '}
            <span className="font-medium">{m.title}</span>
          </div>
          <ModuleRowActions
            module={m}
            trackId={trackId}
            isFirst={isFirst}
            isLast={isLast}
            onEdit={() => setEditing(true)}
          />
        </div>
      )}
      {children}
    </div>
  );
}

export function LessonRow({
  lesson,
  moduleId,
  trackId,
  isFirst,
  isLast,
  href,
}: {
  lesson: {
    id: string;
    title: string;
    summary?: string | null;
    order_index: number;
    est_minutes: number | null;
  };
  moduleId: string;
  trackId: string;
  isFirst: boolean;
  isLast: boolean;
  href: string;
}) {
  const [editing, setEditing] = useState(false);
  const select = useLessonSelect();
  if (editing) {
    return (
      <div className="px-2 py-1.5">
        <LessonEditInline
          lesson={lesson}
          trackId={trackId}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }
  const checked = select?.selected.has(lesson.id) ?? false;
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface-muted)] ${
        checked ? 'bg-[var(--color-warn-bg)]/40' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {select && (
          <input
            type="checkbox"
            aria-label={`Select lesson ${lesson.title}`}
            checked={checked}
            onChange={() => select.toggle(lesson.id)}
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
          />
        )}
        <a href={href} className="truncate text-sm text-[var(--color-text)] hover:underline">
          <span className="text-xs text-[var(--color-text-subtle)]">#{lesson.order_index}</span>{' '}
          {lesson.title}{' '}
          <span className="text-xs text-[var(--color-text-subtle)]">
            ({lesson.est_minutes ?? 0} min)
          </span>
        </a>
      </div>
      <LessonRowActions
        lesson={lesson}
        moduleId={moduleId}
        trackId={trackId}
        isFirst={isFirst}
        isLast={isLast}
        onEdit={() => setEditing(true)}
      />
    </div>
  );
}

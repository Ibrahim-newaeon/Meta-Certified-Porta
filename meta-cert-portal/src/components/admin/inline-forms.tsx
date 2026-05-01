'use client';
import { useActionState, useState, useTransition } from 'react';
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

function MiniSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-8 items-center rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? '…' : label}
    </button>
  );
}

// ---------- MODULE: create ----------
export function ModuleCreateInline({ trackId }: { trackId: string }) {
  const [state, action] = useActionState(createModuleAction, null);
  return (
    <form action={action} className="flex items-end gap-2 rounded-md border bg-slate-50 p-2">
      <input type="hidden" name="trackId" value={trackId} />
      <div className="flex-1">
        <label className="text-xs text-slate-600">New module title</label>
        <input
          name="title"
          required
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div className="w-20">
        <label className="text-xs text-slate-600">Order</label>
        <input
          name="orderIndex"
          type="number"
          defaultValue={0}
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <MiniSubmit label="Add module" />
      {state?.error && <p className="self-center text-xs text-red-600">{state.error}</p>}
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
      className="flex flex-wrap items-end gap-2 rounded-md border border-slate-300 bg-slate-50 p-2"
    >
      <input type="hidden" name="id" value={m.id} />
      <input type="hidden" name="trackId" value={trackId} />
      <div className="flex-1 min-w-[240px]">
        <label className="text-xs text-slate-600">Title</label>
        <input
          name="title"
          defaultValue={m.title}
          required
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div className="w-20">
        <label className="text-xs text-slate-600">Order</label>
        <input
          name="orderIndex"
          type="number"
          defaultValue={m.order_index}
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-8 items-center rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? '…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs hover:bg-white"
      >
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
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
  module: { id: string };
  trackId: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isFirst || pending}
        onClick={() => start(() => reorderModuleAction(m.id, trackId, 'up').then(() => {}))}
        className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-30"
        title="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={isLast || pending}
        onClick={() => start(() => reorderModuleAction(m.id, trackId, 'down').then(() => {}))}
        className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-30"
        title="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-slate-600 hover:text-slate-900"
      >
        Edit
      </button>
      <DeleteModuleButton id={m.id} trackId={trackId} />
    </div>
  );
}

// ---------- LESSON: create ----------
export function LessonCreateInline({ moduleId }: { moduleId: string }) {
  const [state, action] = useActionState(createLessonAction, null);
  return (
    <form action={action} className="flex items-end gap-2 rounded-md bg-white p-2">
      <input type="hidden" name="moduleId" value={moduleId} />
      <div className="flex-1">
        <label className="text-xs text-slate-600">New lesson title</label>
        <input
          name="title"
          required
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div className="w-20">
        <label className="text-xs text-slate-600">Order</label>
        <input
          name="orderIndex"
          type="number"
          defaultValue={0}
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div className="w-20">
        <label className="text-xs text-slate-600">Est min</label>
        <input
          name="estMinutes"
          type="number"
          defaultValue={10}
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <MiniSubmit label="Add lesson" />
      {state?.error && <p className="self-center text-xs text-red-600">{state.error}</p>}
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
      className="flex flex-wrap items-end gap-2 rounded-md border border-slate-300 bg-slate-50 p-2"
    >
      <input type="hidden" name="id" value={lesson.id} />
      <input type="hidden" name="trackId" value={trackId} />
      <div className="flex-1 min-w-[240px]">
        <label className="text-xs text-slate-600">Title</label>
        <input
          name="title"
          defaultValue={lesson.title}
          required
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div className="w-20">
        <label className="text-xs text-slate-600">Order</label>
        <input
          name="orderIndex"
          type="number"
          defaultValue={lesson.order_index}
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div className="w-20">
        <label className="text-xs text-slate-600">Est min</label>
        <input
          name="estMinutes"
          type="number"
          defaultValue={lesson.est_minutes ?? 10}
          className="mt-1 block h-8 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div className="w-full">
        <label className="text-xs text-slate-600">Summary</label>
        <textarea
          name="summary"
          defaultValue={lesson.summary ?? ''}
          rows={2}
          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-8 items-center rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? '…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs hover:bg-white"
      >
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
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
  lesson: { id: string };
  moduleId: string;
  trackId: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isFirst || pending}
        onClick={() =>
          start(() => reorderLessonAction(lesson.id, moduleId, trackId, 'up').then(() => {}))
        }
        className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-30"
        title="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={isLast || pending}
        onClick={() =>
          start(() => reorderLessonAction(lesson.id, moduleId, trackId, 'down').then(() => {}))
        }
        className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-30"
        title="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs text-slate-600 hover:text-slate-900"
      >
        Edit
      </button>
      <DeleteLessonButton id={lesson.id} trackId={trackId} />
    </div>
  );
}

// ---------- DELETE ----------
export function DeleteModuleButton({ id, trackId }: { id: string; trackId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('Delete module and all its lessons + resources?')) return;
        start(() => deleteModuleAction(id, trackId).then(() => {}));
      }}
      disabled={pending}
      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      Delete
    </button>
  );
}

export function DeleteLessonButton({ id, trackId }: { id: string; trackId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('Delete this lesson and its resources?')) return;
        start(() => deleteLessonAction(id, trackId).then(() => {}));
      }}
      disabled={pending}
      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      Delete
    </button>
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
    <div className="rounded-lg border bg-white p-3">
      {editing ? (
        <ModuleEditInline module={m} trackId={trackId} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">#{m.order_index}</span>{' '}
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
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50">
      <a href={href} className="text-sm text-slate-800 hover:underline">
        <span className="text-xs text-slate-400">#{lesson.order_index}</span>{' '}
        {lesson.title}{' '}
        <span className="text-xs text-slate-400">({lesson.est_minutes ?? 0} min)</span>
      </a>
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

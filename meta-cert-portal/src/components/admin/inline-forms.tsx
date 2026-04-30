'use client';
import { useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { createModuleAction, deleteModuleAction } from '@/app/admin/modules/actions';
import { createLessonAction, deleteLessonAction } from '@/app/admin/lessons/actions';

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

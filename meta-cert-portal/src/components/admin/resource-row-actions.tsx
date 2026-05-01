'use client';
import { useState, useTransition } from 'react';
import {
  reorderResourceAction,
  updateResourceAction,
  deleteResourceAction,
} from '@/app/admin/resources/actions';

export type ResourceEditValues = {
  id: string;
  kind: 'link' | 'pdf' | 'video';
  title: string;
  url: string | null;
  exam_codes: string[];
  order_index: number;
};

export function ResourceRowActions({
  resource,
  lessonId,
  isFirst,
  isLast,
}: {
  resource: ResourceEditValues;
  lessonId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={isFirst || pending}
          onClick={() =>
            start(() => reorderResourceAction(resource.id, lessonId, 'up').then(() => {}))
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
            start(() => reorderResourceAction(resource.id, lessonId, 'down').then(() => {}))
          }
          className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-30"
          title="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              !confirm('Delete this resource? This will also remove the underlying file/asset.')
            )
              return;
            start(() => deleteResourceAction(resource.id, lessonId).then(() => {}));
          }}
          disabled={pending}
          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {editing && (
        <ResourceEditDialog
          resource={resource}
          lessonId={lessonId}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function ResourceEditDialog({
  resource,
  lessonId,
  onClose,
}: {
  resource: ResourceEditValues;
  lessonId: string;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit {resource.kind} resource</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        <form
          action={(fd) => {
            setError(null);
            const tags = String(fd.get('examCodesCsv') ?? '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            tags.forEach((t) => fd.append('examCodes', t));
            fd.delete('examCodesCsv');
            start(async () => {
              const res = await updateResourceAction(null, fd);
              if (res?.error) setError(res.error);
              else onClose();
            });
          }}
          className="space-y-3"
        >
          <input type="hidden" name="id" value={resource.id} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <div>
            <label className="text-xs font-medium text-slate-600">Title</label>
            <input
              name="title"
              defaultValue={resource.title}
              required
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
          {resource.kind === 'link' && (
            <div>
              <label className="text-xs font-medium text-slate-600">URL</label>
              <input
                name="url"
                type="url"
                defaultValue={resource.url ?? ''}
                className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600">
              Exam codes (comma-separated)
            </label>
            <input
              name="examCodesCsv"
              defaultValue={resource.exam_codes.join(', ')}
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Order</label>
            <input
              name="orderIndex"
              type="number"
              defaultValue={resource.order_index}
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md border border-slate-300 px-4 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

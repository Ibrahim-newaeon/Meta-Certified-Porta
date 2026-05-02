'use client';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { Dialog } from '@/components/shared/dialog';
import { Button } from '@/components/shared/button';
import { bulkDeleteLessonsAction } from '@/app/admin/lessons/actions';

type Ctx = {
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
  clear: () => void;
  count: number;
};

const SelectCtx = createContext<Ctx | null>(null);

export function useLessonSelect() {
  return useContext(SelectCtx);
}

export function LessonBulkSelectProvider({
  trackId,
  children,
}: {
  trackId: string;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const ctx = useMemo<Ctx>(
    () => ({ selected, toggle, clear, count: selected.size }),
    [selected, toggle, clear],
  );

  function handleConfirm() {
    setError(null);
    const ids = Array.from(selected);
    start(async () => {
      const res = await bulkDeleteLessonsAction(ids, trackId);
      if (res?.error) {
        setError(res.error);
      } else {
        clear();
        setConfirmOpen(false);
      }
    });
  }

  return (
    <SelectCtx.Provider value={ctx}>
      {children}
      {selected.size > 0 && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <strong>{selected.size}</strong> lesson
              {selected.size === 1 ? '' : 's'} selected
              <button
                type="button"
                onClick={clear}
                className="ml-3 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline"
              >
                Clear
              </button>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={pending}
            >
              Delete selected
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={confirmOpen}
        onClose={() => !pending && setConfirmOpen(false)}
        title={`Delete ${selected.size} lesson${selected.size === 1 ? '' : 's'}?`}
        description="All resources for these lessons will be removed too. This cannot be undone."
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
            onClick={() => setConfirmOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={pending}>
            {pending ? `Deleting ${selected.size}…` : `Delete ${selected.size}`}
          </Button>
        </div>
      </Dialog>
    </SelectCtx.Provider>
  );
}

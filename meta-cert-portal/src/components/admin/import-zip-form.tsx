'use client';
import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import {
  bulkImportLessonsFromZipAction,
  type ImportResult,
} from '@/app/admin/tracks/[trackId]/import/actions';
import { Button } from '@/components/shared/button';
import { Input, FieldLabel } from '@/components/shared/input';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Importing… (this may take a minute)' : 'Import zip'}
    </Button>
  );
}

export function ImportZipForm({ trackId }: { trackId: string }) {
  const [state, action] = useActionState<ImportResult, FormData>(
    bulkImportLessonsFromZipAction,
    null,
  );
  const moduleId = useId();
  const fileId = useId();

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <input type="hidden" name="trackId" value={trackId} />

      <div>
        <FieldLabel htmlFor={moduleId}>New module title</FieldLabel>
        <Input
          id={moduleId}
          name="moduleTitle"
          defaultValue="Imported lessons"
          required
          maxLength={200}
          className="mt-1"
        />
      </div>

      <div>
        <FieldLabel htmlFor={fileId}>Zip file (.docx files inside, max 25 MB)</FieldLabel>
        <input
          id={fileId}
          name="zip"
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          required
          className="mt-1 block w-full text-sm file:mr-3 file:h-11 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:px-3 file:text-xs file:font-medium file:text-[var(--color-primary-fg)] hover:file:bg-[var(--color-primary-hover)]"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {state.error}
        </p>
      )}
      {state?.ok && state.imported && (
        <div
          role="status"
          className="rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm text-[var(--color-success-fg)]"
        >
          <strong>
            Imported {state.imported.lessons} lesson
            {state.imported.lessons === 1 ? '' : 's'}
          </strong>{' '}
          into module <em>{state.imported.module}</em>.
        </div>
      )}
      {state?.warning && (
        <div
          role="status"
          className="rounded-md border border-[var(--color-warn-fg)]/30 bg-[var(--color-warn-bg)] p-3 text-xs text-[var(--color-warn-fg)]"
        >
          {state.warning}
        </div>
      )}

      <Submit />
    </form>
  );
}

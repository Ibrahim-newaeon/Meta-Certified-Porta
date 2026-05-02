'use client';
import { useId, useState, useTransition } from 'react';
import {
  reorderResourceAction,
  updateResourceAction,
  deleteResourceAction,
  reExtractPdfResourceAction,
  reExtractLinkResourceAction,
} from '@/app/admin/resources/actions';
import { Dialog } from '@/components/shared/dialog';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { Button } from '@/components/shared/button';
import { Input, FieldLabel } from '@/components/shared/input';

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
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="iconSm"
          aria-label={`Move "${resource.title}" up`}
          disabled={isFirst || pending}
          onClick={() =>
            start(() => reorderResourceAction(resource.id, lessonId, 'up').then(() => {}))
          }
        >
          <span aria-hidden="true">↑</span>
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          aria-label={`Move "${resource.title}" down`}
          disabled={isLast || pending}
          onClick={() =>
            start(() => reorderResourceAction(resource.id, lessonId, 'down').then(() => {}))
          }
        >
          <span aria-hidden="true">↓</span>
        </Button>
        {(resource.kind === 'pdf' || resource.kind === 'link') && (
          <ReExtractButton resourceId={resource.id} kind={resource.kind} />
        )}
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <ConfirmButton
          label="Delete"
          title="Delete resource?"
          description="This will also remove the underlying file/asset. This cannot be undone."
          confirmLabel="Delete resource"
          pendingLabel="Deleting…"
          variant="danger"
          triggerSize="sm"
          onConfirm={async () => {
            await deleteResourceAction(resource.id, lessonId);
          }}
        />
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
  const titleId = useId();
  const urlId = useId();
  const codesId = useId();
  const orderId = useId();

  return (
    <Dialog
      open
      onClose={() => !pending && onClose()}
      title={`Edit ${resource.kind} resource`}
      size="md"
    >
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
          <FieldLabel htmlFor={titleId}>Title</FieldLabel>
          <Input
            id={titleId}
            name="title"
            defaultValue={resource.title}
            required
            className="mt-1"
          />
        </div>
        {resource.kind === 'link' && (
          <div>
            <FieldLabel htmlFor={urlId}>URL</FieldLabel>
            <Input
              id={urlId}
              name="url"
              type="url"
              defaultValue={resource.url ?? ''}
              className="mt-1"
            />
          </div>
        )}
        <div>
          <FieldLabel htmlFor={codesId}>Exam codes (comma-separated)</FieldLabel>
          <Input
            id={codesId}
            name="examCodesCsv"
            defaultValue={resource.exam_codes.join(', ')}
            className="mt-1"
          />
        </div>
        <div>
          <FieldLabel htmlFor={orderId}>Order</FieldLabel>
          <Input
            id={orderId}
            name="orderIndex"
            type="number"
            defaultValue={resource.order_index}
            className="mt-1"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving changes…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ReExtractButton({
  resourceId,
  kind,
}: {
  resourceId: string;
  kind: 'pdf' | 'link';
}) {
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{
    kind: 'ok' | 'err';
    message: string;
  } | null>(null);

  const action =
    kind === 'pdf' ? reExtractPdfResourceAction : reExtractLinkResourceAction;
  const tooltip =
    kind === 'pdf'
      ? 'Re-run text extraction on this PDF'
      : 'Re-fetch this URL and extract its text';

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        title={tooltip}
        disabled={pending}
        onClick={() => {
          setFeedback(null);
          start(async () => {
            const res = await action(resourceId);
            if (res?.error) {
              setFeedback({ kind: 'err', message: res.error });
            } else {
              setFeedback({ kind: 'ok', message: 'Re-extracted.' });
            }
          });
        }}
      >
        {pending ? 'Re-extracting…' : 'Re-extract'}
      </Button>
      {feedback && (
        <span
          role={feedback.kind === 'err' ? 'alert' : 'status'}
          className={`text-xs ${
            feedback.kind === 'err'
              ? 'text-rose-700 dark:text-rose-300'
              : 'text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {feedback.message}
        </span>
      )}
    </>
  );
}

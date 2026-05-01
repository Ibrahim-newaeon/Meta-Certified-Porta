import { requireUser } from '@/lib/auth/roles';
import { ChatPanel } from '@/components/ai-tutor/chat-panel';

export default async function TutorPage() {
  await requireUser();

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Tutor</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ask questions about your enrolled tracks. The tutor uses your study materials
          for context.
        </p>
      </div>
      <div className="rounded-lg border bg-white">
        <ChatPanel />
      </div>
    </div>
  );
}

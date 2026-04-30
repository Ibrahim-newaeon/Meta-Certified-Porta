// Database row types — regenerate with: pnpm db:types
// Until then, these are placeholders matching the planned schema.

export type UserRole = 'admin' | 'learner';
export type ResourceType = 'link' | 'pdf' | 'video';
export type CertificationExam =
  | 'digital_marketing_associate'
  | 'media_buying_professional'
  | 'marketing_science_professional'
  | 'community_manager'
  | 'creative_strategy_professional';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface CertificationTrack {
  id: string;
  title: string;
  exam: CertificationExam;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
}

export interface Module {
  id: string;
  track_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  estimated_minutes: number | null;
  created_at: string;
}

export interface Resource {
  id: string;
  lesson_id: string;
  type: ResourceType;
  title: string;
  url: string | null;          // for link/video
  storage_path: string | null; // for pdf in Supabase Storage
  mux_playback_id: string | null; // for hosted video
  metadata: Record<string, unknown>;
  created_at: string;
}

// Demo seed for local development.
//
// Creates an admin and a learner user, an enrolled track with two modules
// and three lessons (one link resource each), and a small practice quiz
// covering all three question kinds (single / multi / scenario).
//
// Idempotent — safe to re-run; existing rows are kept and only new ones
// are added.
//
// Usage (from meta-cert-portal/):
//   node scripts/seed-demo.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the env
// (or from .env.local — Node 20.6+ via --env-file=.env.local).
//
// Recommended:
//   node --env-file=.env.local scripts/seed-demo.mjs

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('[err] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
  console.error('       Try: node --env-file=.env.local scripts/seed-demo.mjs');
  process.exit(1);
}

const admin = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- demo data ----------
const ADMIN_EMAIL = 'admin@example.test';
const ADMIN_PASSWORD = 'admin-password-123';
const LEARNER_EMAIL = 'learner@example.test';
const LEARNER_PASSWORD = 'learner-password-123';

const TRACK = {
  code: 'MCMBP',
  slug: 'mcmbp',
};

// Module → lessons → link resources. Linked URLs are real Meta Blueprint
// pages so the link cards render with sensible content during click-through.
const CURRICULUM = [
  {
    title: 'Foundations',
    order: 0,
    lessons: [
      {
        title: 'Campaign objectives',
        order: 0,
        est: 8,
        link: {
          title: 'Meta — choose a campaign objective',
          url: 'https://www.facebook.com/business/help/1438417719786914',
        },
      },
      {
        title: 'Audiences and targeting',
        order: 1,
        est: 12,
        link: {
          title: 'Meta — about ad targeting',
          url: 'https://www.facebook.com/business/help/717368264947302',
        },
      },
    ],
  },
  {
    title: 'Advantage+ workflows',
    order: 1,
    lessons: [
      {
        title: 'Advantage+ Shopping Campaigns',
        order: 0,
        est: 15,
        link: {
          title: 'Meta — about Advantage+ Shopping campaigns',
          url: 'https://www.facebook.com/business/help/1740712421325096',
        },
      },
    ],
  },
];

// One quiz tied to the third lesson, exercising all three question kinds.
const QUIZ = {
  title: 'Advantage+ Shopping — practice',
  pass_score: 70,
  time_limit_s: 600, // 10 min for the mock-exam runner timer
  questions: [
    {
      kind: 'single',
      prompt:
        'Which campaign objective is required for Advantage+ Shopping campaigns?',
      explanation:
        'Advantage+ Shopping is built on the Sales objective with a conversion event.',
      options: [
        { label: 'Sales', is_correct: true },
        { label: 'Engagement', is_correct: false },
        { label: 'Awareness', is_correct: false },
        { label: 'Traffic', is_correct: false },
      ],
    },
    {
      kind: 'multi',
      prompt: 'Which signals improve Conversions API Event Match Quality (EMQ)?',
      explanation:
        'EMQ rises with deterministic identifiers — hashed email, phone, and external_id are the strongest. Click ID alone is not a personal identifier.',
      options: [
        { label: 'Hashed email', is_correct: true },
        { label: 'Hashed phone number', is_correct: true },
        { label: 'External ID (your CRM identifier)', is_correct: true },
        { label: 'Click ID by itself', is_correct: false },
        { label: 'A static UTM parameter', is_correct: false },
      ],
    },
    {
      kind: 'scenario',
      prompt: 'What should the buyer do first?',
      scenario:
        'A retailer launches an Advantage+ Shopping campaign. After 48 hours the campaign is still in "learning" phase and CPA is well above target. They have 8 ad sets running similar creative.',
      explanation:
        'Advantage+ Shopping consolidates structure on its own. Learning needs ~50 conversions; cutting volume or fragmenting more delays it. Wait for learning to complete, or consolidate ad sets.',
      options: [
        { label: 'Wait until learning completes before judging CPA', is_correct: true },
        { label: 'Pause the worst-performing ad sets immediately', is_correct: false },
        { label: 'Lower the budget by 50%', is_correct: false },
        { label: 'Duplicate the campaign with new creative', is_correct: false },
      ],
    },
  ],
};

// ---------- helpers ----------

async function ensureUser(email, password) {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);
  if (found) {
    // Reset the password back to the documented demo value so re-running
    // the seed always restores known credentials, even if the account's
    // password drifted (manual change, earlier seed with different value).
    const { data, error } = await admin.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUser ${email}: ${error.message}`);
    console.log(`[user] ${email} exists (${found.id}) — password reset`);
    return data.user;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  console.log(`[user] created ${email} (${data.user.id})`);
  return data.user;
}

async function setRole(userId, role) {
  const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}

async function getOrInsertTrack() {
  const { data: existing } = await admin
    .from('certification_tracks')
    .select('id')
    .eq('code', TRACK.code)
    .maybeSingle();
  if (existing) {
    // Make sure it's published so the learner can browse it
    await admin
      .from('certification_tracks')
      .update({ is_published: true })
      .eq('id', existing.id);
    return existing.id;
  }
  // Falls back if the seed.sql wasn't run; usually we hit the existing branch.
  const { data, error } = await admin
    .from('certification_tracks')
    .insert({
      code: TRACK.code,
      title: 'Meta Certified Media Buying Professional',
      slug: TRACK.slug,
      description:
        'Campaign creation, optimization, Advantage+ workflows, and auction dynamics.',
      is_published: true,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureModule(trackId, mod) {
  const { data: existing } = await admin
    .from('modules')
    .select('id')
    .eq('track_id', trackId)
    .eq('title', mod.title)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from('modules')
    .insert({ track_id: trackId, title: mod.title, order_index: mod.order })
    .select('id')
    .single();
  if (error) throw error;
  console.log(`[module] created ${mod.title}`);
  return data.id;
}

async function ensureLesson(moduleId, lesson) {
  const { data: existing } = await admin
    .from('lessons')
    .select('id')
    .eq('module_id', moduleId)
    .eq('title', lesson.title)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from('lessons')
    .insert({
      module_id: moduleId,
      title: lesson.title,
      order_index: lesson.order,
      est_minutes: lesson.est,
    })
    .select('id')
    .single();
  if (error) throw error;
  console.log(`[lesson] created ${lesson.title}`);
  return data.id;
}

async function ensureLink(lessonId, link) {
  const { data: existing } = await admin
    .from('resources')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('kind', 'link')
    .eq('url', link.url)
    .maybeSingle();
  if (existing) return existing.id;
  const { error } = await admin.from('resources').insert({
    lesson_id: lessonId,
    kind: 'link',
    title: link.title,
    url: link.url,
    exam_codes: [TRACK.code],
  });
  if (error) throw error;
  console.log(`[resource] linked ${link.title}`);
}

async function ensureEnrollment(userId, trackId) {
  const { data: existing } = await admin
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .maybeSingle();
  if (existing) return;
  const { error } = await admin.from('enrollments').insert({
    user_id: userId,
    track_id: trackId,
  });
  if (error) throw error;
  console.log(`[enroll] ${userId} → ${trackId}`);
}

async function ensureQuiz(lessonId) {
  const { data: existing } = await admin
    .from('quizzes')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('title', QUIZ.title)
    .maybeSingle();
  if (existing) {
    console.log(`[quiz] exists ${existing.id}`);
    return existing.id;
  }

  const { data: quiz, error: qErr } = await admin
    .from('quizzes')
    .insert({
      lesson_id: lessonId,
      title: QUIZ.title,
      kind: 'practice',
      pass_score: QUIZ.pass_score,
      time_limit_s: QUIZ.time_limit_s,
      question_count: QUIZ.questions.length,
      exam_codes: [TRACK.code],
    })
    .select('id')
    .single();
  if (qErr) throw qErr;

  for (let i = 0; i < QUIZ.questions.length; i++) {
    const q = QUIZ.questions[i];
    const { data: qRow, error: qrErr } = await admin
      .from('quiz_questions')
      .insert({
        quiz_id: quiz.id,
        kind: q.kind,
        prompt: q.prompt,
        scenario: q.scenario ?? null,
        explanation: q.explanation,
        order_index: i,
      })
      .select('id')
      .single();
    if (qrErr) throw qrErr;

    const { error: oErr } = await admin.from('quiz_question_options').insert(
      q.options.map((o, j) => ({
        question_id: qRow.id,
        label: o.label,
        is_correct: o.is_correct,
        order_index: j,
      }))
    );
    if (oErr) throw oErr;
  }

  console.log(`[quiz] created ${quiz.id} with ${QUIZ.questions.length} questions`);
  return quiz.id;
}

// ---------- main ----------

async function main() {
  console.log(`[seed] target ${URL}`);

  const [adminUser, learnerUser] = await Promise.all([
    ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD),
    ensureUser(LEARNER_EMAIL, LEARNER_PASSWORD),
  ]);

  await setRole(adminUser.id, 'admin');
  await setRole(learnerUser.id, 'learner');
  console.log(`[role] ${ADMIN_EMAIL} → admin, ${LEARNER_EMAIL} → learner`);

  const trackId = await getOrInsertTrack();
  console.log(`[track] ${TRACK.code} → ${trackId}`);

  let lastLessonId = null;
  for (const mod of CURRICULUM) {
    const moduleId = await ensureModule(trackId, mod);
    for (const lesson of mod.lessons) {
      const lessonId = await ensureLesson(moduleId, lesson);
      await ensureLink(lessonId, lesson.link);
      lastLessonId = lessonId;
    }
  }

  await ensureEnrollment(learnerUser.id, trackId);

  const quizId = await ensureQuiz(lastLessonId);

  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log(' Demo seed complete. Sign in at /login as:');
  console.log('');
  console.log(`   admin    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   learner  ${LEARNER_EMAIL} / ${LEARNER_PASSWORD}`);
  console.log('');
  console.log(' Try these URLs:');
  console.log(`   /tracks/${trackId}            (track detail, learner enrolled)`);
  console.log(`   /exam/${quizId}               (mock-exam runner)`);
  console.log('─────────────────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('[err]', err);
  process.exit(1);
});

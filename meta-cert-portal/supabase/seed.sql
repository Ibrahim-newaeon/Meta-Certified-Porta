-- ============================================================
-- seed.sql — Meta Blueprint certification tracks
-- ============================================================
insert into public.certification_tracks (code, title, slug, description, exam_minutes, pass_score, is_published) values
  ('MCDMA','Meta Certified Digital Marketing Associate','mcdma','Foundational Meta marketing certification covering campaign objectives, audiences, and ad formats.',75,70,true),
  ('MCMBP','Meta Certified Media Buying Professional','mcmbp','Campaign creation, optimization, Advantage+ workflows, and auction dynamics.',75,70,true),
  ('MCMSP','Meta Certified Marketing Science Professional','mcmsp','Measurement, attribution, lift studies, MMM, and the Conversions API.',75,70,true),
  ('MCCM','Meta Certified Community Manager','mccm','Building and managing communities on Meta platforms (Pages, Groups, moderation).',75,70,true),
  ('MCCSP','Meta Certified Creative Strategy Professional','mccsp','Creative strategy, Reels best practices, and structured creative testing frameworks.',75,70,true),
  ('MCMDA','Meta Certified Marketing Developer Associate','mcmda','Graph API and Marketing API fundamentals for marketers.',75,70,true)
on conflict (code) do nothing;

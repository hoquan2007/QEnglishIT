create or replace function public.get_site_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'learners', (select count(*) from profiles),
    'listening_questions', (select count(*) from questions where part <= 4),
    'grammar_questions', (select count(*) from grammar_questions) + (select count(*) from questions where part in (5,6)),
    'tests', (select count(*) from tests where is_published),
    'words', (select count(*) from vocab_words),
    'grammar_topics', (select count(*) from grammar_topics)
  );
$$;

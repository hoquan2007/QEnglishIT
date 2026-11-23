revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.record_study(text, text, int, int, int, int) from public, anon;
grant execute on function public.record_study(text, text, int, int, int, int) to authenticated;
-- get_leaderboard, has_role, increment_* stay callable on purpose (public counters / RLS helper).

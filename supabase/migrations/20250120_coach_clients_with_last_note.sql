-- Migration: 20250120_coach_clients_with_last_note.sql
-- Purpose: Provide helper function to fetch coach clients with last note timestamp and total count.
-- Status: COMPLETED
-- Executed: 2025-01-20

create or replace function public.coach_clients_with_last_note(
  p_coach_id uuid,
  p_offset integer default 0,
  p_limit integer default 20
)
returns table (
  user_id uuid,
  name text,
  email text,
  linked_at timestamptz,
  last_note_at timestamptz,
  total_count bigint
)
language sql
security definer
set search_path = public AS $$
  select
    cc.user_id,
    u.name,
    u.email,
    cc.created_at as linked_at,
    (
      select cn.created_at
      from coach_notes cn
      where cn.coach_id = cc.coach_id
        and cn.user_id = cc.user_id
      order by cn.created_at desc
      limit 1
    ) as last_note_at,
    count(*) over () as total_count
  from coach_clients cc
  join users u on u.id = cc.user_id
  where cc.coach_id = p_coach_id
  order by last_note_at desc nulls last, u.name
  offset coalesce(p_offset, 0)
  limit coalesce(p_limit, 20);
$$;

grant execute on function public.coach_clients_with_last_note(uuid, integer, integer) to authenticated;

do $$
begin
  perform 1 from pg_proc where proname = 'coach_clients_with_last_note';
  if not found then
    raise exception 'Function coach_clients_with_last_note was not created';
  end if;
end $$;

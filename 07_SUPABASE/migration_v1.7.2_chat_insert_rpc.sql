-- ================================================
-- 세종 OS Supabase 마이그레이션 v1.7.2
-- Chat 입력용 안전 생성 RPC (RLS 우회용)
-- ================================================

create or replace function create_record_from_chat(
  p_ai_code text,
  p_level int,
  p_mode text,
  p_title text,
  p_content text,
  p_metadata jsonb default '{}'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id text;
begin
  v_record_id :=
    'SEJONG-' || upper(coalesce(p_ai_code, 'CSR')) || '-' ||
    to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDD-HH24MISS') || '-' ||
    lpad((floor(random() * 900) + 100)::int::text, 3, '0');

  insert into records (
    record_id, ai_code, level, mode, title, content, status, metadata
  )
  values (
    v_record_id,
    upper(coalesce(p_ai_code, 'CSR')),
    p_level,
    p_mode,
    p_title,
    p_content,
    'WAIT_FOR_SYNC',
    coalesce(p_metadata, '{}'::jsonb)
  );

  return json_build_object(
    'success', true,
    'record_id', v_record_id
  );
end;
$$;

grant execute on function create_record_from_chat(text, int, text, text, text, jsonb) to anon;
grant execute on function create_record_from_chat(text, int, text, text, text, jsonb) to authenticated;

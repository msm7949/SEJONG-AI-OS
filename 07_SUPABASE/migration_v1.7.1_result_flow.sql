-- ================================================
-- 세종 OS Supabase 마이그레이션 v1.7.1
-- 승인 결과 저장/조회 흐름 추가
-- ================================================

-- 1) records 결과 컬럼 추가
alter table if exists records
  add column if not exists result text,
  add column if not exists executed_at timestamptz;

create index if not exists idx_records_executed_at on records(executed_at desc);

-- 2) 승인된 레코드에 결과 저장 RPC
create or replace function save_execution_result(
  p_record_id text,
  p_result text,
  p_executed_at timestamptz default now()
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record records%rowtype;
begin
  select * into v_record
  from records
  where record_id = p_record_id;

  if not found then
    return json_build_object('success', false, 'error', 'Record not found');
  end if;

  if v_record.status <> 'APPROVED' then
    return json_build_object(
      'success', false,
      'error', 'Record is not approved',
      'current_status', v_record.status
    );
  end if;

  update records
  set result = p_result,
      executed_at = p_executed_at
  where record_id = p_record_id;

  return json_build_object(
    'success', true,
    'record_id', p_record_id,
    'executed_at', p_executed_at
  );
end;
$$;

grant execute on function save_execution_result(text, text, timestamptz) to service_role;

-- 3) 샘플 조회 쿼리
-- select record_id, status, result, executed_at
-- from records
-- where status = 'APPROVED'
-- order by coalesce(executed_at, decided_at, created_at) desc
-- limit 20;

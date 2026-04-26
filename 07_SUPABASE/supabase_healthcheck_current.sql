-- ================================================
-- 세종 OS Supabase 현재 상태 점검
-- 목적: 운영 필수 함수/컬럼 반영 여부를 1회에 확인
-- ================================================

-- 1) records 핵심 컬럼 확인
select
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'records'
  and column_name in ('result', 'executed_at')
order by column_name;

-- 2) 필수 RPC 함수 존재 확인
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'make_hmn_decision',
    'ensure_wait_for_sync',
    'complete_wait_for_sync',
    'save_execution_result',
    'create_record_from_chat'
  )
order by p.proname;

-- 3) create_record_from_chat 실행 권한 확인
select
  grantee,
  privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name = 'create_record_from_chat'
order by grantee, privilege_type;

-- 4) 최근 레코드 상태 샘플 (운영 모니터링)
select
  record_id,
  status,
  level,
  mode,
  created_at,
  decided_at,
  executed_at
from records
order by created_at desc
limit 20;


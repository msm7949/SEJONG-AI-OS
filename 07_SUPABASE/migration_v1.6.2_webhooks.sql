-- ================================================
-- 세종 OS Supabase 마이그레이션 v1.6.2
-- N8N 웹훅 트리거 + WAIT_FOR_SYNC RPC 함수
-- ================================================
-- pg_net 확장을 사용하여 INSERT 시 N8N 웹훅 호출
-- N8N에서 카카오톡 / Discord / 이메일 3채널 알림 발송
-- WAIT_FOR_SYNC 상태 관리 RPC 함수 포함
-- ================================================

-- pg_net 확장 활성화 (Supabase에서 기본 제공)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ================================================
-- RPC 1. WAIT_FOR_SYNC 상태 확인/설정
-- N8N 워크플로우에서 호출: 새 레코드가 WAIT_FOR_SYNC인지 확인
-- ================================================
CREATE OR REPLACE FUNCTION ensure_wait_for_sync(
  p_record_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record FROM records WHERE record_id = p_record_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Record not found');
  END IF;

  -- 이미 WAIT_FOR_SYNC면 확인만
  IF v_record.status = 'WAIT_FOR_SYNC' THEN
    RETURN json_build_object(
      'success', true,
      'record_id', p_record_id,
      'status', 'WAIT_FOR_SYNC',
      'action', 'confirmed'
    );
  END IF;

  -- 아직 WAIT_FOR_SYNC가 아니면 상태 업데이트
  UPDATE records
  SET status = 'WAIT_FOR_SYNC'
  WHERE record_id = p_record_id;

  RETURN json_build_object(
    'success', true,
    'record_id', p_record_id,
    'status', 'WAIT_FOR_SYNC',
    'action', 'updated'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_wait_for_sync TO service_role;

-- ================================================
-- RPC 2. WAIT_FOR_SYNC 해제 (HMN 결정 완료)
-- N8N 워크플로우에서 호출: HMN 결정 후 상태 업데이트
-- ================================================
CREATE OR REPLACE FUNCTION complete_wait_for_sync(
  p_record_id TEXT,
  p_decision TEXT,
  p_memo TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record FROM records WHERE record_id = p_record_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Record not found');
  END IF;

  -- 결정값 유효성 검증
  IF p_decision NOT IN ('APPROVED', 'REJECTED', 'HOLD') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid decision');
  END IF;

  -- WAIT_FOR_SYNC 상태가 아니면 이미 처리된 것
  IF v_record.status != 'WAIT_FOR_SYNC' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Record not in WAIT_FOR_SYNC state',
      'current_status', v_record.status
    );
  END IF;

  -- records 상태 업데이트: WAIT_FOR_SYNC → APPROVED/REJECTED/HOLD
  UPDATE records
  SET status = p_decision,
      hmn_memo = p_memo,
      decided_at = NOW()
  WHERE record_id = p_record_id;

  RETURN json_build_object(
    'success', true,
    'record_id', p_record_id,
    'previous_status', 'WAIT_FOR_SYNC',
    'new_status', p_decision,
    'action', 'completed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_wait_for_sync TO service_role;

-- ================================================
-- 트리거 1. 새 레코드 생성 → N8N 알림
-- records INSERT → WAIT_FOR_SYNC 파이프라인 시작
-- ================================================
CREATE OR REPLACE FUNCTION notify_new_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url TEXT;
  v_payload JSONB;
  v_level_label TEXT;
BEGIN
  -- N8N 웹훅 URL (Supabase Vault에서 가져오기)
  -- 설정: INSERT INTO vault.secrets (name, secret)
  --       VALUES ('n8n_new_record_webhook', 'https://your-n8n.app.n8n.cloud/webhook/sejong-new-record');
  SELECT decrypted_secret INTO v_webhook_url
  FROM vault.decrypted_secrets
  WHERE name = 'n8n_new_record_webhook'
  LIMIT 1;

  IF v_webhook_url IS NULL THEN
    RAISE WARNING '[세종 OS] n8n_new_record_webhook not configured in vault';
    RETURN NEW;
  END IF;

  -- LEVEL 라벨 매핑
  v_level_label := CASE NEW.level
    WHEN 1 THEN 'L1 Critical'
    WHEN 2 THEN 'L2 High'
    WHEN 3 THEN 'L3 Medium'
    WHEN 4 THEN 'L4 Low'
    WHEN 5 THEN 'L5 Routine'
    ELSE 'Unknown'
  END;

  -- 페이로드 구성
  v_payload := jsonb_build_object(
    'event', 'new_record',
    'record_id', NEW.record_id,
    'title', NEW.title,
    'content', NEW.content,
    'ai_code', NEW.ai_code,
    'level', NEW.level,
    'level_label', v_level_label,
    'mode', NEW.mode,
    'status', NEW.status,
    'created_at', NEW.created_at,
    'approve_url', 'https://sejong-ai-os.vercel.app/approve'
  );

  -- N8N 웹훅 비동기 호출 → WAIT_FOR_SYNC 파이프라인 시작
  PERFORM net.http_post(
    url := v_webhook_url,
    body := v_payload::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Sejong-Event', 'new_record'
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_record
  AFTER INSERT ON records
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_record();

-- ================================================
-- 트리거 2. HMN 결정 → N8N 알림
-- hmn_decisions INSERT → WAIT_FOR_SYNC 해제 파이프라인 시작
-- ================================================
CREATE OR REPLACE FUNCTION notify_hmn_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url TEXT;
  v_payload JSONB;
  v_record RECORD;
  v_decision_label TEXT;
  v_level_label TEXT;
BEGIN
  -- N8N 웹훅 URL
  SELECT decrypted_secret INTO v_webhook_url
  FROM vault.decrypted_secrets
  WHERE name = 'n8n_hmn_decision_webhook'
  LIMIT 1;

  IF v_webhook_url IS NULL THEN
    RAISE WARNING '[세종 OS] n8n_hmn_decision_webhook not configured in vault';
    RETURN NEW;
  END IF;

  -- 관련 레코드 정보 조회
  SELECT * INTO v_record FROM records WHERE record_id = NEW.record_id;

  -- 결정 라벨 매핑
  v_decision_label := CASE NEW.decision
    WHEN 'APPROVED' THEN '승인'
    WHEN 'REJECTED' THEN '반려'
    WHEN 'HOLD' THEN '보류'
    ELSE NEW.decision
  END;

  v_level_label := CASE v_record.level
    WHEN 1 THEN 'L1 Critical'
    WHEN 2 THEN 'L2 High'
    WHEN 3 THEN 'L3 Medium'
    WHEN 4 THEN 'L4 Low'
    WHEN 5 THEN 'L5 Routine'
    ELSE 'Unknown'
  END;

  -- 페이로드 구성
  v_payload := jsonb_build_object(
    'event', 'hmn_decision',
    'record_id', NEW.record_id,
    'decision', NEW.decision,
    'decision_label', v_decision_label,
    'memo', COALESCE(NEW.memo, ''),
    'hmn_id', NEW.hmn_id,
    'title', COALESCE(v_record.title, ''),
    'level', COALESCE(v_record.level, 0),
    'level_label', v_level_label,
    'ai_code', COALESCE(v_record.ai_code, ''),
    'mode', COALESCE(v_record.mode, ''),
    'decided_at', NEW.created_at,
    'approve_url', 'https://sejong-ai-os.vercel.app/approve'
  );

  -- N8N 웹훅 비동기 호출 → WAIT_FOR_SYNC 해제 파이프라인 시작
  PERFORM net.http_post(
    url := v_webhook_url,
    body := v_payload::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Sejong-Event', 'hmn_decision'
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_hmn_decision
  AFTER INSERT ON hmn_decisions
  FOR EACH ROW
  EXECUTE FUNCTION notify_hmn_decision();

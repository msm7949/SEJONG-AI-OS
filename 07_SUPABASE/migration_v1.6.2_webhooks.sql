-- ================================================
-- 세종 OS Supabase 마이그레이션 v1.6.2
-- N8N 웹훅 트리거 (새 레코드 + HMN 결정 알림)
-- ================================================
-- pg_net 확장을 사용하여 INSERT 시 N8N 웹훅 호출
-- N8N에서 카카오톡 / Discord / 이메일 3채널 알림 발송
-- ================================================

-- pg_net 확장 활성화 (Supabase에서 기본 제공)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ================================================
-- 1. 새 레코드 생성 → N8N 알림
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
  -- N8N 웹훅 URL (Supabase Vault 또는 환경변수에서 가져오기)
  -- 설정 방법: Supabase SQL Editor에서 아래 실행
  --   INSERT INTO vault.secrets (name, secret)
  --   VALUES ('n8n_new_record_webhook', 'https://your-n8n.app.n8n.cloud/webhook/xxx');
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

  -- N8N 웹훅 비동기 호출
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
-- 2. HMN 결정 → N8N 알림
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

  -- N8N 웹훅 비동기 호출
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

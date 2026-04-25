-- ================================================
-- 세종 OS Supabase 마이그레이션 v1.6.3
-- HMN 승인 이후 Vercel 배포 트리거용 payload 강화
-- ================================================
-- 목적:
-- 1) hmn_decisions INSERT 시 N8N 웹훅 호출 유지
-- 2) LEVEL 3~5 + APPROVED 자동 배포 가능 여부 전달
-- 3) LEVEL 1~2는 수동 배포 확인이 가능하도록 정책 필드 전달
-- ================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 기존 트리거 제거 후 재생성(함수 시그니처는 유지)
DROP TRIGGER IF EXISTS trg_notify_hmn_decision ON hmn_decisions;

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
  v_deployment_eligible BOOLEAN;
BEGIN
  SELECT decrypted_secret INTO v_webhook_url
  FROM vault.decrypted_secrets
  WHERE name = 'n8n_hmn_decision_webhook'
  LIMIT 1;

  IF v_webhook_url IS NULL THEN
    RAISE WARNING '[세종 OS] n8n_hmn_decision_webhook not configured in vault';
    RETURN NEW;
  END IF;

  SELECT * INTO v_record FROM records WHERE record_id = NEW.record_id;

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

  -- EXECUTION POLICY:
  -- - LEVEL 1~2: 자동 배포 금지
  -- - LEVEL 3~5 + APPROVED: 자동 배포 허용
  v_deployment_eligible := (
    NEW.decision = 'APPROVED'
    AND COALESCE(v_record.level, 0) BETWEEN 3 AND 5
  );

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
    'approve_url', 'https://sejong-ai-os.vercel.app/approve',
    'deployment_eligible', v_deployment_eligible,
    'vercel_preview_url', COALESCE(
      NULLIF(current_setting('app.settings.vercel_preview_url', true), ''),
      'https://sejong-ai-os.vercel.app'
    )
  );

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

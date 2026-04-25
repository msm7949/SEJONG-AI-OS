-- ================================================
-- 세종 OS v1.7 — AI 포럼 자동 호출 트리거 추가
-- L1~L3 레코드 INSERT 시 AI 포럼 워크플로우 호출
-- 시간 기준: KST (한국 표준시)
-- ================================================

-- 기존 notify_new_record 트리거 업데이트
-- 새 레코드 INSERT 시:
--   1. N8N WF1 (기존 알림) 호출
--   2. L1~L3이면 N8N WF3 (AI 포럼) 추가 호출
CREATE OR REPLACE FUNCTION notify_new_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url TEXT;
  v_forum_url TEXT;
  v_payload JSONB;
  v_level_label TEXT;
BEGIN
  -- N8N 웹훅 URL (하드코딩 — Pro 업그레이드 후 Vault로 전환 예정)
  v_webhook_url := 'https://msm79499.app.n8n.cloud/webhook/sejong-new-record';
  v_forum_url := 'https://msm79499.app.n8n.cloud/webhook/sejong-ai-forum';

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
    'approve_url', 'https://unidlabs.ai/approve'
  );

  -- 1) N8N WF1 알림 호출 (모든 레벨)
  PERFORM net.http_post(
    url := v_webhook_url,
    body := v_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Sejong-Event', 'new_record'
    )
  );

  -- 2) L1~L3이면 AI 포럼 자동 호출
  IF NEW.level <= 3 THEN
    PERFORM net.http_post(
      url := v_forum_url,
      body := v_payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Sejong-Event', 'ai_forum_request'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 트리거 재생성 (기존 트리거 교체)
DROP TRIGGER IF EXISTS trg_notify_new_record ON records;
CREATE TRIGGER trg_notify_new_record
  AFTER INSERT ON records
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_record();

-- ================================================
-- 완료! L1~L3 레코드 INSERT 시:
--   → WF1: 3채널 알림 (기존)
--   → WF3: AI 포럼 자동화 (신규)
-- L4~L5는 WF1만 호출 (포럼 생략)
-- ================================================

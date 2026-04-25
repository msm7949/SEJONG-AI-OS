-- ================================================
-- 세종 OS Supabase 마이그레이션 v1.6.1
-- HMN 결정 RPC 함수 (SECURITY DEFINER)
-- ================================================
-- 프론트엔드(anon)는 records/ai_opinions SELECT만 허용 (schema_v1.6.sql)
-- HMN 결정은 이 RPC 함수를 통해서만 수행 가능 (보안 원칙 유지)
-- ================================================

CREATE OR REPLACE FUNCTION make_hmn_decision(
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
  v_decision_id UUID;
BEGIN
  -- 유효성 검증: 레코드 존재 + 대기 상태 확인
  SELECT * INTO v_record FROM records WHERE record_id = p_record_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Record not found');
  END IF;

  IF v_record.status != 'WAIT_FOR_SYNC' THEN
    RETURN json_build_object('success', false, 'error', 'Record already decided');
  END IF;

  -- 결정값 유효성 검증
  IF p_decision NOT IN ('APPROVED', 'REJECTED', 'HOLD') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid decision');
  END IF;

  -- hmn_decisions 이력 추가
  INSERT INTO hmn_decisions (record_id, decision, memo)
  VALUES (p_record_id, p_decision, p_memo)
  RETURNING id INTO v_decision_id;

  -- records 상태 업데이트
  UPDATE records
  SET status = p_decision,
      hmn_memo = p_memo,
      decided_at = NOW()
  WHERE record_id = p_record_id;

  RETURN json_build_object(
    'success', true,
    'decision_id', v_decision_id,
    'record_id', p_record_id,
    'decision', p_decision
  );
END;
$$;

-- anon 유저가 이 함수를 호출할 수 있도록 권한 부여
GRANT EXECUTE ON FUNCTION make_hmn_decision TO anon;
GRANT EXECUTE ON FUNCTION make_hmn_decision TO authenticated;

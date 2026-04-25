-- ================================================
-- 세종 OS Supabase 스키마 v1.6
-- 확정일: 2026-04-25 | 승인: HMN
-- ================================================

-- 1. RECORDS 테이블 (모든 AI 요청/결정 이력)
CREATE TABLE records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id     TEXT NOT NULL UNIQUE,
  -- 형식: SEJONG-{AI_CODE}-{YYYYMMDD}-{HHMMSS}-{SEQ}
  -- 예시: SEJONG-CLD-20260425-143022-001

  ai_code       TEXT NOT NULL,
  -- GPT | GEM | GRK | CLD | CPL | PPL | DSK | DEV | MNS | CSR | QVL

  level         INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  -- 1=Critical, 2=High, 3=Medium, 4=Low, 5=Routine

  mode          TEXT NOT NULL DEFAULT 'PROD' CHECK (mode IN ('DEV','STG','PROD')),

  title         TEXT NOT NULL,
  content       TEXT NOT NULL,

  status        TEXT NOT NULL DEFAULT 'WAIT_FOR_SYNC'
                CHECK (status IN ('WAIT_FOR_SYNC','APPROVED','REJECTED','HOLD','AUTO_DONE')),

  hmn_memo      TEXT,
  -- HMN 승인/반려 시 메모

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  decided_at    TIMESTAMPTZ,
  -- HMN 결정 시각

  metadata      JSONB DEFAULT '{}'
  -- 추가 데이터 자유롭게 저장
);

-- 2. AI_OPINIONS 테이블 (AI별 독립 의견)
CREATE TABLE ai_opinions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id     TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,

  ai_code       TEXT NOT NULL,
  opinion       TEXT NOT NULL,
  stance        TEXT CHECK (stance IN ('AGREE','DISAGREE','NEUTRAL','CONDITIONAL')),

  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HMN_DECISIONS 테이블 (HMN 결정 이력)
CREATE TABLE hmn_decisions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id     TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,

  decision      TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED','HOLD')),
  memo          TEXT,

  -- Phase 2: 추후 다중 HMN 지원시 사용
  hmn_id        TEXT DEFAULT 'HMN',

  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 인덱스
-- ================================================
CREATE INDEX idx_records_status    ON records(status);
CREATE INDEX idx_records_level     ON records(level);
CREATE INDEX idx_records_ai_code   ON records(ai_code);
CREATE INDEX idx_records_created   ON records(created_at DESC);
CREATE INDEX idx_opinions_record   ON ai_opinions(record_id);
CREATE INDEX idx_decisions_record  ON hmn_decisions(record_id);

-- ================================================
-- Row Level Security (RLS)
-- ================================================
ALTER TABLE records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_opinions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hmn_decisions ENABLE ROW LEVEL SECURITY;

-- N8N 서비스 롤 (service_role key 사용) — 전체 접근
-- 프론트엔드 (anon key) — 읽기만 허용

CREATE POLICY "service_all_records"
  ON records FOR ALL
  TO service_role USING (true);

CREATE POLICY "anon_read_records"
  ON records FOR SELECT
  TO anon USING (true);

CREATE POLICY "service_all_opinions"
  ON ai_opinions FOR ALL
  TO service_role USING (true);

CREATE POLICY "anon_read_opinions"
  ON ai_opinions FOR SELECT
  TO anon USING (true);

CREATE POLICY "service_all_decisions"
  ON hmn_decisions FOR ALL
  TO service_role USING (true);

CREATE POLICY "anon_read_decisions"
  ON hmn_decisions FOR SELECT
  TO anon USING (true);

-- ================================================
-- 샘플 데이터 (테스트용)
-- ================================================
INSERT INTO records (record_id, ai_code, level, mode, title, content, status)
VALUES (
  'SEJONG-CLD-20260425-143022-001',
  'CLD', 1, 'DEV',
  'CORE v1.6 철학 섹션 — 홍익인간 정의 수정',
  'GRK 제안: 홍익인간을 "모든 존재에 이로움"으로 재정의',
  'WAIT_FOR_SYNC'
);

INSERT INTO ai_opinions (record_id, ai_code, opinion, stance)
VALUES
  ('SEJONG-CLD-20260425-143022-001', 'GRK', '홍익인간을 최대 다수 이익이 아닌 모든 존재에 이로움으로 재정의 제안. 보편성 강화.', 'AGREE'),
  ('SEJONG-CLD-20260425-143022-001', 'CLD', '방향성 동의. 단, 존재 범위를 명확히 해야 법적 해석 충돌 방지 가능.', 'CONDITIONAL'),
  ('SEJONG-CLD-20260425-143022-001', 'DSK', '현행 유지 권고. 수정 시 v1.5 이전 문서와 정합성 검토 필요.', 'DISAGREE');

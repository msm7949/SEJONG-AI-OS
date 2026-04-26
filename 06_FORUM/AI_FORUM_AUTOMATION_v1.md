# 세종 OS AI 포럼 자동화 v1

## 개요

세종 OS의 핵심 기능: 다중 AI가 자동으로 의견을 제출하고 토론하는 구조.
LEVEL에 따라 참여 AI 수를 조정하며, 모든 의견은 `ai_opinions` 테이블에 저장.
포럼 완료 후 HMN에게 3채널 알림 → WAIT_FOR_SYNC → HMN 최종 결정.

## 절대 원칙

> AI는 절대 최종 결정을 내릴 수 없다. 모든 결정은 인간(HMN)이 한다.

## LEVEL별 참여 AI

| Level | 설명 | 참여 AI | 비고 |
|-------|------|---------|------|
| L1 Critical | 핵심 안건 | GPT + GRK + CLD + GEM | 4개 AI 전원 참여 |
| L2 High | 중요 안건 | GPT + CLD | 2개 AI |
| L3 Medium | 일반 안건 | CLD | 1개 AI |
| L4 Low | 경미 | 포럼 생략 (자동 WAIT_FOR_SYNC) | AI 의견 불필요 |
| L5 Routine | 루틴 | 포럼 생략 (AUTO_DONE 가능) | 자동 처리 |

## 데이터 흐름

```
새 레코드 INSERT (records 테이블)
    ↓
Supabase 트리거 (notify_new_record)
    ↓
N8N WF1 (AI 요청 파이프라인)
    ↓ LEVEL 확인
    ↓ L1~L3이면:
N8N WF3 (AI 포럼 자동화) 호출
    ↓
각 AI API 병렬 호출 (GPT/GEM/CLD/GRK)
    ↓
응답 파싱 → ai_opinions 테이블 INSERT
    ↓
3채널 알림 (Discord/카카오워크/Gmail)
"AI 포럼 완료 — HMN 결정 대기 중"
    ↓
HMN → unidlabs.ai/approve → 승인/반려/보류
    ↓
N8N WF2 (HMN 결정 Resume)
```

## AI 응답 형식 (JSON)

```json
{
  "opinion": "분석 및 의견 내용",
  "stance": "AGREE | DISAGREE | NEUTRAL | CONDITIONAL",
  "confidence": 0.82,
  "risk_flags": ["보안 위험", "성능 이슈"]
}
```

## N8N 워크플로우 3 (AI 포럼 자동화)

### 웹훅 URL
```
POST https://msm79499.app.n8n.cloud/webhook/sejong-ai-forum
```

### 요청 페이로드
```json
{
  "record_id": "SEJONG-CLD-20260425-143022-001",
  "title": "안건 제목",
  "content": "안건 상세 내용",
  "ai_code": "CLD",
  "level": 1,
  "mode": "PROD"
}
```

### 노드 구성
1. **Webhook 수신** — `sejong-ai-forum` 엔드포인트
2. **LEVEL 라우터** — L1~L2 (4 AI) vs L3 (CLD만) 분기
3. **AI API 호출** — GPT/GEM/CLD/GRK 병렬 호출
4. **의견 수집** — 응답 병합
5. **Supabase INSERT** — `ai_opinions` 테이블에 저장
6. **3채널 알림** — Discord/Gmail/카카오워크로 포럼 완료 통지
7. **응답 반환** — 포럼 결과 요약 JSON

### 필요한 API 키
| 키 | AI | 발급처 |
|---|---|---|
| `OPENAI_API_KEY` | GPT | https://platform.openai.com/api-keys |
| `GEMINI_API_KEY` | GEM | https://aistudio.google.com/apikey |
| `ANTHROPIC_API_KEY` | CLD | https://console.anthropic.com/settings/keys |
| `XAI_API_KEY` | GRK | https://console.x.ai |

## 합의도 (Consensus Level)

| 점수 | 의미 | HMN 검증 |
|------|------|----------|
| 0 | 완전 불일치 | 필수 — 모든 AI 의견 직접 검토 |
| 1 | 약한 합의 | 권장 — 쟁점 위주 검토 |
| 2 | 보통 합의 | 선택 — 요약만 확인 |
| 3 | 강한 합의 | 선택 — 빠른 승인 가능 |

## Supabase 스키마 (기존)

`ai_opinions` 테이블은 이미 생성됨:
```sql
CREATE TABLE ai_opinions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id  TEXT NOT NULL REFERENCES records(record_id),
  ai_code    TEXT NOT NULL,
  opinion    TEXT NOT NULL,
  stance     TEXT NOT NULL CHECK (stance IN ('AGREE','DISAGREE','NEUTRAL','CONDITIONAL')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 시간 기준 — TIME STANDARD

**절대 기준 시간: KST (한국 표준시, UTC+9)**

모든 타임스탬프, 로그, 알림은 KST 기준으로 표시.

### AI 포럼 시간 주입 규칙
AI는 자체적으로 시간대를 인식하지 못할 수 있다 (GEM, CLD, CPL 등).
따라서 WF3 AI 포럼 호출 시 시스템 프롬프트에 현재 KST 시간을 반드시 명시적으로 주입한다.

```
예시: "현재 시간: 2026-04-26 21:00 KST. 모든 응답의 시간 기준은 KST입니다."
```

이 규칙은 모든 AI API 호출 (GPT/GEM/CLD/GRK 등)에 동일하게 적용된다.

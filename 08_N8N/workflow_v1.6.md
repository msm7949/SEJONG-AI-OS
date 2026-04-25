# 세종 OS N8N 워크플로우 v1.6

확정일: 2026-04-25 | 승인: HMN

---

## 워크플로우 1 — AI 의견 수집 → HMN 알림

```
[트리거] GitHub Issue 생성
    ↓
[N8N] Issue 내용 파싱
    - title, body, labels 추출
    - LEVEL 자동 판단 (label 기반)
    ↓
[N8N] Record ID 생성
    - SEJONG-{AI_CODE}-{YYYYMMDD}-{HHMMSS}-{SEQ}
    ↓
[Supabase] records 테이블 INSERT
    - status = 'WAIT_FOR_SYNC'
    ↓
[N8N] AI 의견 수집 (HTTP Request)
    - GPT API 호출
    - GRK API 호출
    - CLD API 호출
    (LEVEL에 따라 AI 수 조정)
    ↓
[Supabase] ai_opinions 테이블 INSERT
    ↓
[카카오톡 or 슬랙] HMN에 알림 전송
    - 제목, LEVEL, AI 의견 요약
    - 승인 페이지 링크 포함
    - https://your-app.vercel.app/approve?id={record_id}
    ↓
[대기] WAIT_FOR_SYNC
```

---

## 워크플로우 2 — HMN 승인 → 자동 배포

```
[트리거] Vercel 승인 페이지 Webhook
    - POST /api/decide
    - body: { record_id, decision, memo }
    ↓
[N8N] decision 분기
    ├── APPROVED → 다음 단계
    ├── REJECTED → GitHub Issue에 반려 코멘트 → 종료
    └── HOLD     → Supabase status = 'HOLD' → 종료
    ↓
[Supabase] records 업데이트
    - status = 'APPROVED'
    - decided_at = NOW()
    - hmn_memo = memo
    ↓
[Supabase] hmn_decisions INSERT
    ↓
[GitHub] PR auto-merge (LEVEL 4~5만)
    또는
[알림] LEVEL 1~3은 수동 merge 안내
    ↓
[완료] Record 이력 확정
```

---

## N8N 환경변수 설정

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  (service_role key)
GITHUB_TOKEN=ghp_...
KAKAO_WEBHOOK_URL=https://...  (또는 슬랙 webhook)
VERCEL_APPROVE_URL=https://your-app.vercel.app
```

---

## LEVEL별 AI 호출 수

| LEVEL | AI 수 | 필수 AI |
|-------|-------|---------|
| 1 Critical | 3개 이상 | GRK + CLD + 1개 |
| 2 High | 2~3개 | CLD + 1개 |
| 3 Medium | 2개 | CLD |
| 4 Low | 1개 | CLD |
| 5 Routine | 0개 | 자동 처리 |

---

## GitHub Issue 라벨 → LEVEL 매핑

```
label: level-1  → LEVEL 1 Critical
label: level-2  → LEVEL 2 High
label: level-3  → LEVEL 3 Medium
label: level-4  → LEVEL 4 Low
label: level-5  → LEVEL 5 Routine
label: hmn-only → LEVEL 1 (라벨 없을 시 기본값)
```

# 세종 OS N8N 워크플로우 v1.6

확정일: 2026-04-25 | 승인: HMN

---

## ✅ 구현 완료 (WAIT_FOR_SYNC 포함)

| 워크플로우 | 파일 | 플로우 | 상태 |
|-----------|------|--------|------|
| AI 요청 파이프라인 | `workflow_new_record_alert.json` | 웹훅→WAIT_FOR_SYNC→알림→HMN대기→완료 | 구현 완료 |
| HMN 결정 Resume | `workflow_hmn_decision_alert.json` | 웹훅→WAIT_FOR_SYNC 해제→결정 알림 | 구현 완료 |
| Supabase 트리거+RPC | `07_SUPABASE/migration_v1.6.2_webhooks.sql` | 트리거+ensure/complete RPC | 구현 완료 |

**핵심:** WAIT_FOR_SYNC 상태가 N8N 워크플로우의 중심. 모든 레코드는 WAIT_FOR_SYNC를 거쳐야 HMN 결정 가능.

```
[새 레코드] → WAIT_FOR_SYNC 확인 → 3채널 알림 → HMN 대기(Wait) → 결정 수신 → 완료
[HMN 결정] → WAIT_FOR_SYNC 해제 → 3채널 결과 알림
```

알림 채널: **카카오톡 + Discord + 이메일** (3채널 동시 발송)

설정 방법: [SETUP_GUIDE.md](./SETUP_GUIDE.md) 참고

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
# 기존 (Phase 2 전체 자동화용)
SUPABASE_URL=https://neexjnidnaopukhsdmhz.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  (service_role key — Supabase Settings → API)
GITHUB_TOKEN=ghp_...
VERCEL_APPROVE_URL=https://sejong-ai-os.vercel.app

# 알림 워크플로우용 (v1.6.2 추가)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
KAKAO_WEBHOOK_URL=https://kapi.kakao.com/... (또는 카카오워크 웹훅)
NOTIFICATION_EMAIL=msm7949@gmail.com
SMTP_FROM_EMAIL=noreply@sejong-os.kr
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

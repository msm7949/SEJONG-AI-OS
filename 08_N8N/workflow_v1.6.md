# 세종 OS N8N 워크플로우 v1.6

확정일: 2026-04-25 | 승인: HMN

---

## ✅ 구현 완료 (WAIT_FOR_SYNC 포함)

| 워크플로우 | 파일 | 플로우 | 상태 |
|-----------|------|--------|------|
| AI 요청 파이프라인 | `workflow_new_record_alert.json` | 웹훅→WAIT_FOR_SYNC→알림+WAIT병렬→완료 | v1.1 |
| HMN 결정 Resume | `workflow_hmn_decision_alert.json` | 웹훅→WAIT_FOR_SYNC 해제→결정 알림 | v1.1 |
| Supabase 트리거+RPC | `07_SUPABASE/migration_v1.6.2_webhooks.sql` | 트리거+ensure/complete RPC | v1.1 |

**핵심:** WAIT_FOR_SYNC 상태가 N8N 워크플로우의 중심. 모든 레코드는 WAIT_FOR_SYNC를 거쳐야 HMN 결정 가능.

**v1.1 수정 (CSR 감사):** 알림 3채널 실패해도 WAIT_FOR_SYNC는 반드시 진입. 부분 성공 + WAIT 진행.

알림 채널: **카카오톡 + Discord + 이메일** (3채널 동시 발송, fire-and-forget)

설정 방법: [SETUP_GUIDE.md](./SETUP_GUIDE.md) 참고

---

## 전체 구조도

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 세종 OS N8N 워크플로우 전체 아키텍처 (v1.1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[AI/시스템]          [Supabase]              [N8N]                    [HMN]
    │                    │                     │                       │
    │ records INSERT     │                     │                       │
    ├───────────────────►│                     │                       │
    │                    │ pg_net trigger       │                       │
    │                    ├────────────────────►│                       │
    │                    │                     │ 1. 웹훅 수신            │
    │                    │                     │     │                  │
    │                    │◄── RPC call ────────│ 2. WAIT_FOR_SYNC 확인  │
    │                    │ ensure_wait_for_sync │     │                  │
    │                    │                     │ 3. 메시지 포맷          │
    │                    │                     │     │                  │
    │                    │                     │     ├── 4a. Discord ───►│ (알림)
    │                    │                     │     ├── 4b. 카카오톡 ──►│ (알림)
    │                    │                     │     ├── 4c. 이메일 ────►│ (알림)
    │                    │                     │     │  (fire-and-forget │
    │                    │                     │     │   실패해도 계속)    │
    │                    │                     │     │                  │
    │                    │                     │ 5. HMN 응답 대기 ◄─────│
    │                    │                     │     (Wait 노드)        │
    │                    │                     │     │                  │
    │                    │                     │     │    (HMN 결정)     │
    │                    │                     │     │◄─────────────────│
    │                    │                     │     │                  │
    │                    │◄── PATCH ───────────│ 6. Supabase 업데이트   │
    │                    │ status=APPROVED/etc  │     │                  │
    │                    │                     │ 7. 결과 포맷            │
    │                    │                     │     │                  │
    │                    │                     │     ├── 8a. Discord ───►│ (결과)
    │                    │                     │     ├── 8b. 카카오톡 ──►│ (결과)
    │                    │                     │     └── 8c. 이메일 ────►│ (결과)
    │                    │                     │                       │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[HMN 결정 Resume 워크플로우]
    │                    │                     │                       │
    │                    │ hmn_decisions INSERT │                       │
    │                    ├────────────────────►│                       │
    │                    │                     │ 1. HMN 결정 웹훅       │
    │                    │◄── RPC call ────────│ 2. WAIT_FOR_SYNC 해제  │
    │                    │ complete_wait_for_sync│    │                  │
    │                    │                     │ 3. 결과 포맷            │
    │                    │                     │     │                  │
    │                    │                     │     ├── Discord  ─────►│
    │                    │                     │     ├── 카카오톡 ──────►│
    │                    │                     │     └── 이메일  ───────►│
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 핵심 원칙

```
절대 원칙: WAIT_FOR_SYNC는 알림 성공 여부와 무관하게 반드시 진입
          → 알림은 "부분 성공" 허용 (fire-and-forget)
          → Wait 노드는 항상 활성화
          → HMN 결정 없이는 진행 불가 (무한 대기)
```

---

## 워크플로우 1 — AI 요청 파이프라인 (구현 완료)

```
[Supabase] records INSERT → pg_net → N8N 웹훅
    ↓
[N8N] 1. 웹훅 수신
    ↓
[N8N] 2. WAIT_FOR_SYNC 확인 (Supabase RPC: ensure_wait_for_sync)
    ↓
[N8N] 3. 메시지 포맷 (Discord embed, 카카오, 이메일 HTML)
    ↓ (4개 병렬 — 알림 실패해도 WAIT 진입 보장)
    ├── 4a. Discord 알림 (continueOnFail)
    ├── 4b. 카카오톡 알림 (continueOnFail)
    ├── 4c. 이메일 알림 (continueOnFail)
    └── 5. HMN 응답 대기 (Wait 노드 — 알림과 독립적으로 진입)
              ↓ (HMN 결정 수신 시 resume)
         6. Supabase 업데이트 (PATCH records)
              ↓
         7. 결과 포맷
              ↓
         8a/8b/8c. 3채널 결과 알림
```

---

## 워크플로우 2 — HMN 결정 Resume (구현 완료)

```
[Supabase] hmn_decisions INSERT → pg_net → N8N 웹훅
    ↓
[N8N] 1. HMN 결정 웹훅 수신
    ↓
[N8N] 2. WAIT_FOR_SYNC 해제 (Supabase RPC: complete_wait_for_sync)
    ↓
[N8N] 3. 결과 포맷
    ↓
[N8N] 4a/4b/4c. 3채널 결과 알림
```

---

## 워크플로우 3 — 미래 확장 (미구현)

```
[트리거] GitHub Issue 생성
    ↓
[N8N] Issue 파싱 + Record ID 생성
    ↓
[Supabase] records INSERT (→ 워크플로우 1 자동 발동)
    ↓
[N8N] AI 의견 수집 (GPT/GRK/CLD API)
    ↓
[Supabase] ai_opinions INSERT
    ↓
[대기] 워크플로우 1의 WAIT_FOR_SYNC에서 처리

[트리거] HMN 승인 확인 후
    ↓
[GitHub] PR auto-merge (LEVEL 4~5만)
    또는
[알림] LEVEL 1~3은 수동 merge 안내
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

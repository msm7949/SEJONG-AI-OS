# N8N 알림 워크플로우 설정 가이드

세종 OS Supabase ↔ N8N 3채널 알림 (카카오톡 / Discord / 이메일)

**핵심: WAIT_FOR_SYNC 기반 파이프라인**

---

## 아키텍처

```
워크플로우 1: AI 요청 파이프라인 (WAIT_FOR_SYNC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Supabase]              [N8N Cloud]                        [알림]
records INSERT
    │
    ▼
pg_net ──────► 1. 웹훅 수신
                   │
                   ▼
               2. WAIT_FOR_SYNC 확인 (RPC)
                   │
                   ▼
               3. 메시지 포맷
                   │
                   ▼
               4. 3채널 알림 발송 ──────► Discord
                   │                      카카오톡
                   │                      이메일
                   ▼
               5. HMN 응답 대기 (Wait 노드)  ← ← ← ← ← ← ┐
                   │                                        │
                   ▼                                        │
               (HMN이 승인 페이지에서 결정)                    │
                   │                                        │
                   ▼                                        │
               6. Supabase 상태 업데이트                      │
                   │    (WAIT_FOR_SYNC → APPROVED/REJECTED)  │
                   ▼                                        │
               7. 결정 결과 포맷                               │
                   │                                        │
                   ▼                                        │
               8. 3채널 결과 알림 ──────► Discord              │
                                         카카오톡             │
                                         이메일               │
                                                             │
워크플로우 2: HMN 결정 Resume (WAIT_FOR_SYNC 해제)              │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │
                                                             │
hmn_decisions INSERT                                         │
    │                                                        │
    ▼                                                        │
pg_net ──────► 1. HMN 결정 웹훅 수신  ── (resume) ── ── ── ── ┘
                   │
                   ▼
               2. WAIT_FOR_SYNC 해제 (RPC)
                   │    (WAIT_FOR_SYNC → APPROVED/REJECTED/HOLD)
                   ▼
               3. 결과 메시지 포맷
                   │
                   ▼
               4. 3채널 결과 알림 ──────► Discord
                                         카카오톡
                                         이메일
```

---

## 1단계: N8N 워크플로우 Import

1. N8N 인스턴스 열기: `https://msm79499.app.n8n.cloud`
2. **Workflows** → **Import from File**
3. `08_N8N/workflow_new_record_alert.json` import → AI 요청 파이프라인
4. `08_N8N/workflow_hmn_decision_alert.json` import → HMN 결정 Resume
5. 각 워크플로우에서 **Webhook** 노드 클릭 → **Webhook URL** 복사
   - 워크플로우 1: `https://msm79499.app.n8n.cloud/webhook/sejong-new-record`
   - 워크플로우 2: `https://msm79499.app.n8n.cloud/webhook/sejong-hmn-decision`

---

## 2단계: N8N 환경변수 설정

N8N 인스턴스 → **Settings** → **Variables**에 추가:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `SUPABASE_URL` | `https://neexjnidnaopukhsdmhz.supabase.co` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Supabase service_role key (Settings → API) |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Discord 서버 웹훅 URL |
| `KAKAO_WEBHOOK_URL` | `https://kapi.kakao.com/v2/api/talk/memo/default/send` | 카카오톡 API URL |
| `NOTIFICATION_EMAIL` | `msm7949@gmail.com` | 알림 수신 이메일 |
| `SMTP_FROM_EMAIL` | `noreply@sejong-os.kr` | 발신 이메일 주소 |
| `VERCEL_DEPLOY_HOOK_URL` | `https://api.vercel.com/v1/integrations/deploy/...` | Vercel Production Deploy Hook |
| `VERCEL_PREVIEW_URL` | `https://sejong-ai-os.vercel.app` | 배포 전 Discord Preview 링크 |

> ⚠️ `SUPABASE_SERVICE_KEY`는 WAIT_FOR_SYNC RPC 호출에 필요합니다. service_role key를 사용하세요.

---

## 3단계: Discord 웹훅 생성

1. Discord 서버 → **서버 설정** → **연동** → **웹후크**
2. **새 웹후크** → 이름: `세종 OS 알림`
3. 채널 선택 → **웹후크 URL 복사**
4. N8N 환경변수 `DISCORD_WEBHOOK_URL`에 붙여넣기

---

## 4단계: 카카오톡 설정

### 옵션 A: 카카오톡 나에게 보내기 (개인용)

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. 애플리케이션 생성 → REST API 키 발급
3. **카카오 로그인** 활성화 → Redirect URI 설정
4. **동의항목** → `talk_message` 동의
5. Access Token 발급 (OAuth 2.0)
6. N8N에서 **HTTP Header Auth** 크레덴셜 추가:
   - Header Name: `Authorization`
   - Header Value: `Bearer {ACCESS_TOKEN}`

### 옵션 B: 카카오톡 채널 (비즈니스용)

1. [카카오톡 채널](https://center-pf.kakao.com/) 생성
2. 알림톡 템플릿 등록 (검수 필요)
3. 비즈 메시지 API 연동

### 옵션 C: 카카오워크 웹훅 (팀용, 가장 간단)

1. 카카오워크 → 채팅방 → **설정** → **웹훅 추가**
2. 웹훅 URL 복사 → `KAKAO_WEBHOOK_URL`에 설정
3. JSON 형식 그대로 전송 가능

---

## 5단계: 이메일 (SMTP) 설정

### Gmail SMTP 사용

1. N8N → **Credentials** → **SMTP** 추가
2. 설정값:
   - Host: `smtp.gmail.com`
   - Port: `465`
   - SSL/TLS: `true`
   - User: `msm7949@gmail.com`
   - Password: Gmail **앱 비밀번호** (2단계 인증 → 앱 비밀번호 생성)
3. 워크플로우의 이메일 노드에서 이 크레덴셜 연결

---

## 6단계: Supabase Vault에 웹훅 URL 저장

Supabase SQL Editor에서 실행:

```sql
-- N8N 웹훅 URL을 Vault에 안전하게 저장
INSERT INTO vault.secrets (name, secret)
VALUES
  ('n8n_new_record_webhook', 'https://msm79499.app.n8n.cloud/webhook/sejong-new-record'),
  ('n8n_hmn_decision_webhook', 'https://msm79499.app.n8n.cloud/webhook/sejong-hmn-decision');
```

> ⚠️ URL은 N8N에서 워크플로우 import 후 실제 Webhook URL로 교체하세요.

---

## 7단계: Supabase 마이그레이션 실행

Supabase SQL Editor에서 아래를 순서대로 실행:

1. `07_SUPABASE/migration_v1.6.2_webhooks.sql`
2. `07_SUPABASE/migration_v1.6.3_deploy_trigger.sql`

이 마이그레이션에는:
- `ensure_wait_for_sync` RPC — WAIT_FOR_SYNC 상태 확인/설정
- `complete_wait_for_sync` RPC — WAIT_FOR_SYNC 해제 (HMN 결정 후)
- `trg_notify_new_record` 트리거 — records INSERT 시 N8N 호출
- `trg_notify_hmn_decision` 트리거 — hmn_decisions INSERT 시 N8N 호출
- `deployment_eligible` payload — LEVEL 3~5 + APPROVED에서만 자동 배포

---

## 8단계: 워크플로우 활성화 및 테스트

1. N8N에서 두 워크플로우 모두 **Active** 상태로 전환
2. Supabase SQL Editor에서 테스트 레코드 삽입:

```sql
-- 테스트: 새 레코드 삽입 → N8N 워크플로우 1 발동
INSERT INTO records (record_id, ai_code, level, mode, title, content)
VALUES (
  'SEJONG-DVN-20260425-TEST-001',
  'DVN', 4, 'DEV',
  'N8N 알림 테스트',
  'DVN이 N8N 워크플로우를 테스트합니다.'
);
```

3. Discord / 카카오톡 / 이메일에 **WAIT_FOR_SYNC** 알림이 오는지 확인
4. 승인 페이지에서 결정 → **결정 완료** 알림이 오는지 확인

---

## 알림 메시지 예시

### Discord — WAIT_FOR_SYNC (새 레코드)
```
⏳ WAIT_FOR_SYNC — HMN 결정 대기
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
L1 Critical 🔴

CORE v1.6 철학 섹션 — 홍익인간 정의 수정

> GRK 제안: 홍익인간을 "모든 존재에 이로움"으로 재정의

📋 SEJONG-CLD-20260425-143022-001
🤖 AI: CLD | 모드: DEV
⏳ 상태: WAIT_FOR_SYNC — HMN 결정 대기 중
🔗 승인 페이지 열기
```

### Discord — WAIT_FOR_SYNC 해제 (HMN 결정)
```
🏛️ HMN 결정 완료 — WAIT_FOR_SYNC 해제
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 승인 — L1 Critical

CORE v1.6 철학 섹션 — 홍익인간 정의 수정

💬 HMN 메모: 방향성 좋음. 범위 명확화 후 진행

📋 SEJONG-CLD-20260425-143022-001
🤖 AI: CLD | 모드: DEV
👤 결정자: HMN
✅ WAIT_FOR_SYNC → APPROVED
```

---

## 트러블슈팅

| 문제 | 해결 |
|------|------|
| 웹훅 호출 안 됨 | Supabase → Extensions에서 `pg_net` 활성화 확인 |
| vault 접근 오류 | Supabase에서 Vault 기능 활성화 필요 (Settings → Vault) |
| WAIT_FOR_SYNC RPC 실패 | N8N 환경변수 `SUPABASE_SERVICE_KEY`가 service_role key인지 확인 |
| Discord 알림 안 옴 | 웹훅 URL 정확한지 확인, N8N 워크플로우 Active 상태 확인 |
| Wait 노드 timeout | N8N 무료 플랜 실행 시간 제한 확인 — timeout 설정 조정 |
| 카카오톡 토큰 만료 | Access Token 갱신 (Refresh Token 사용) |
| 이메일 발송 실패 | Gmail 앱 비밀번호 확인, SMTP 포트 465 사용 |
| N8N 실행 수 부족 | 무료 플랜 2,500건/월 — Upgrade 필요 시 확인 |

---

## N8N 환경변수 총정리

```
SUPABASE_URL=https://neexjnidnaopukhsdmhz.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  (service_role key)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
KAKAO_WEBHOOK_URL=https://kapi.kakao.com/...
NOTIFICATION_EMAIL=msm7949@gmail.com
SMTP_FROM_EMAIL=noreply@sejong-os.kr
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
VERCEL_PREVIEW_URL=https://sejong-ai-os.vercel.app
```

## Supabase Vault 시크릿

```sql
-- vault.secrets 테이블에 저장
n8n_new_record_webhook = https://msm79499.app.n8n.cloud/webhook/sejong-new-record
n8n_hmn_decision_webhook = https://msm79499.app.n8n.cloud/webhook/sejong-hmn-decision
```

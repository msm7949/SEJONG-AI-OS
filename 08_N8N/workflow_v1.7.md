# 세종 OS N8N 워크플로우 v1.7

확정일: 2026-04-25 | 상태: WAIT_FOR_SYNC

---

## 목적

HMN 승인 이후 배포 자동화를 연결하되, EXECUTION POLICY를 준수한다.

- LEVEL 1~2: 자동 배포 금지, HMN 수동 배포 확인
- LEVEL 3~5: `APPROVED`일 때만 Vercel Deploy Hook 자동 호출
- 배포 전 Preview 알림을 Discord로 먼저 전송
- 배포 실패 시 `records.status`를 `WAIT_FOR_SYNC`로 롤백

---

## N8N → Vercel 연결 다이어그램

```text
[HMN 승인 버튼]
   ↓
Supabase hmn_decisions INSERT
   ↓
trigger: notify_hmn_decision()
   ↓
N8N webhook: sejong-hmn-decision
   ↓
2. WAIT_FOR_SYNC 해제 (RPC complete_wait_for_sync)
   ↓
5. 자동 배포 대상 판정
   ├─ false (L1~L2 또는 비승인)
   │    └─ Discord: 수동 배포 확인 알림
   └─ true (APPROVED + L3~L5)
        ↓
     6. 배포 전 Preview 알림 (Discord)
        ↓
     7. Vercel Deploy Hook 호출
        ↓
     8. 배포 결과 판정
        ├─ 실패 → 9. WAIT_FOR_SYNC 롤백 → Discord 실패 알림
        └─ 성공 → Discord 성공 알림
```

---

## 변경 파일

1. `08_N8N/workflow_hmn_decision_alert.json`
   - 배포 대상 판정 IF 노드 추가
   - Vercel Deploy Hook 호출 노드 추가
   - 배포 전 Preview Discord 알림 추가
   - 배포 실패 시 WAIT_FOR_SYNC 롤백 노드 추가
   - LEVEL 1~2 수동 배포 확인 알림 분기 추가

2. `07_SUPABASE/migration_v1.6.3_deploy_trigger.sql`
   - `notify_hmn_decision()` payload에 `deployment_eligible` 추가
   - 트리거 재생성 (`trg_notify_hmn_decision`)

3. `client/src/pages/ApprovePage.tsx`
   - HMN 승인 버튼의 Supabase RPC 처리 안내 문구 추가

---

## 환경변수

N8N Variables:

```env
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...
VERCEL_PREVIEW_URL=https://sejong-ai-os.vercel.app
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
DISCORD_WEBHOOK_URL=...
```

---

## 테스트 체크리스트

- [ ] LEVEL 2 + APPROVED: 자동 배포 미실행, 수동 확인 알림 수신
- [ ] LEVEL 4 + APPROVED: Preview 알림 후 Deploy Hook 호출
- [ ] Deploy Hook 실패 강제 시 `WAIT_FOR_SYNC` 롤백 확인
- [ ] 배포 성공 시 Discord 성공 알림 확인

---

## Branch Protection 연계 (정책 코드화)

운영 안전성을 위해 `main` 브랜치는 반드시 보호 규칙을 적용한다.

- direct push 차단 (PR 필수)
- CI 3/3 통과 필수
- 최소 1명 승인 필수 (HMN/CODEOWNER)
- Include administrators 활성화

참조 파일:
- `.github/CODEOWNERS`
- `.github/branch-protection.main.yml`
- `.github/BRANCH_PROTECTION_EVIDENCE.md`

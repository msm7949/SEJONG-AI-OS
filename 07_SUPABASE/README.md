# 07_SUPABASE 정리 가이드 (Single Source of Truth)

이 폴더를 세종 OS의 **유일한 Supabase 기준본**으로 사용합니다.
`gpt2/20_SQL`의 실험/백업 SQL은 운영 적용 기준에서 제외합니다.

## 1) 운영 적용 순서 (신규 환경 기준)

1. `schema_v1.6.sql`  
   - 기본 테이블/인덱스/RLS 정책 생성
2. `migration_v1.6.1_rpc.sql`  
   - HMN 결정 RPC (`make_hmn_decision`)
3. `migration_v1.6.2_webhooks.sql`  
   - `ensure_wait_for_sync`, `complete_wait_for_sync`, 웹훅 트리거
4. `migration_v1.6.3_deploy_trigger.sql`  
   - HMN 결정 웹훅 payload 강화
5. `migration_v1.7_forum_trigger.sql`  
   - L1~L3 AI 포럼 트리거 확장
6. `migration_v1.7.1_result_flow.sql`  
   - `records.result`, `records.executed_at`, `save_execution_result`
7. `migration_v1.7.2_chat_insert_rpc.sql`  
   - Chat 입력용 `create_record_from_chat` (RLS 우회 안전 생성)

## 2) 현재 권장 운영 시나리오 (기존 환경 기준)

이미 운영 중인 프로젝트라면 아래 2개를 최우선 반영합니다.

- `migration_v1.7.1_result_flow.sql`
- `migration_v1.7.2_chat_insert_rpc.sql`

이유:
- 승인 후 결과 저장 플로우(WF4)와 UI 표시를 위해 `result`, `executed_at`가 필요
- Chat 페이지의 RLS 오류를 막으려면 `create_record_from_chat` RPC가 필요

## 3) 혼재 방지 규칙

- 새 SQL은 반드시 `07_SUPABASE`에만 추가
- 파일명 규칙: `migration_v{버전}_{목적}.sql`
- 실험성 SQL은 `gpt2`에서 검증 후, 확정본만 이 폴더로 승격
- Supabase SQL Editor 실행 이력은 PR 본문 또는 배포 리포트에 기록

## 4) 빠른 점검 포인트

아래 함수/컬럼이 있으면 핵심 마이그레이션 반영 상태가 정상입니다.

- 함수
  - `make_hmn_decision`
  - `ensure_wait_for_sync`
  - `complete_wait_for_sync`
  - `save_execution_result`
  - `create_record_from_chat`
- 컬럼
  - `records.result`
  - `records.executed_at`


# WF4 결과 저장 플로우 설정 가이드

## 목표
승인(`APPROVED`) 이후 실행 결과를 `records.result`, `records.executed_at`에 자동 저장한다.

## 사전 조건
1. Supabase에 `migration_v1.7.1_result_flow.sql` 적용 완료
2. n8n 환경변수 설정 완료
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`

## 1) WF4 Import
- 파일: `workflow_result_writer_on_approval.json`
- 워크플로우명: `세종 OS — WF4 승인 결과 저장`
- 상태: Active

## 2) 호출 방식
WF2(`세종 OS — HMN 결정 Resume`)에서 `APPROVED` 분기 후 아래 웹훅 호출:

- URL: `https://msm79499.app.n8n.cloud/webhook/sejong-save-result`
- Method: `POST`
- Body(JSON):
```json
{
  "record_id": "SEJONG-CSR-20260426-123000-001",
  "status": "APPROVED",
  "title": "테스트 승인 건",
  "memo": "HMN 승인 메모"
}
```

## 3) 검증 쿼리
```sql
select record_id, status, result, executed_at
from records
where status = 'APPROVED'
order by coalesce(executed_at, decided_at, created_at) desc
limit 20;
```

## 4) 기대 결과
- `result`에 요약 텍스트 저장
- `executed_at`에 timestamp 저장
- 승인 카드에서 결과 영역 노출

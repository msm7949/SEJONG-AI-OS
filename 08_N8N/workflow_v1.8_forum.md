# N8N 워크플로우 v1.8 — AI 포럼 자동화

## 변경 사항

### WF3: AI 포럼 자동화 (신규)
- 파일: `workflow_ai_forum.json`
- 웹훅: `POST /webhook/sejong-ai-forum`
- LEVEL별 AI 라우팅:
  - L1~L2: GPT + GEM + CLD + GRK (4개 병렬)
  - L3: CLD만 (1개)
  - L4~L5: 포럼 생략

### Supabase 트리거 업데이트
- `notify_new_record()` 함수에 AI 포럼 호출 추가
- L1~L3 INSERT 시 WF3도 자동 호출
- 파일: `migration_v1.7_forum_trigger.sql`

### Vercel 환경변수
- `client/.env.production` 추가
- Supabase anon key 설정 → mock 대신 실제 DB 연결

## 전체 워크플로우 구성

| WF | 이름 | 트리거 | 용도 |
|----|------|--------|------|
| WF1 | AI 요청 파이프라인 | records INSERT | 3채널 알림 |
| WF2 | HMN 결정 Resume | hmn_decisions INSERT | 결정 알림 + 배포 |
| WF3 | AI 포럼 자동화 | records INSERT (L1~L3) | AI 의견 수집 |

## 필요 API 키 (WF3용)

| 환경변수 | AI | 비고 |
|----------|---|------|
| OPENAI_API_KEY | GPT | OpenAI Platform |
| GEMINI_API_KEY | GEM | Google AI Studio |
| ANTHROPIC_API_KEY | CLD | Anthropic Console |
| XAI_API_KEY | GRK | xAI Console |

## 시간 기준
절대 기준 시간: **KST (한국 표준시)**

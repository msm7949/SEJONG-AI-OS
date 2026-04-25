# 세종 OS (Sejong OS) v1.6

> AI 기본 사회의 운영 체계 — 누구나 쓸 수 있고, 기업이 수정해서 쓸 수 있고, 중요한 결정은 언제나 인간이 한다.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6-green.svg)]()
[![Status](https://img.shields.io/badge/status-active-brightgreen.svg)]()

---

## 세종 OS란?

세종 OS는 **DICOM/PACS 구조 × 홍익인간 × 한국형 민주주의**를 AI 운영체제에 이식한 국민 중심 소버린 AI 시스템입니다.

| PACS 개념 | 세종 OS 개념 |
|-----------|-------------|
| Patient | 국민 |
| Radiologist | HMN (Human Router) |
| Modality | 각 AI (GPT/GRK/GEM/CLD 등) |
| Worklist | TASK_QUEUE |
| Final Sign | ABSOLUTE RULE |

---

## 절대 원칙 (ABSOLUTE RULE)

```
AI는 절대 최종 결정을 내릴 수 없다.
모든 결정은 인간(HMN)이 한다.
이 원칙은 어떤 상황에서도 변경되지 않는다.
```

---

## 핵심 철학

1. 인간 존엄과 통제가 최우선이다 (대한민국 헌법 정신)
2. 누구나 쉽게 접근하고 이해할 수 있어야 한다 (세종대왕 정신)
3. 모두에게 이로움과 공동체의 성장을 추구한다 (홍익인간)
4. 민주주의와 한국 헌법, 세계 민주주의 철학을 중시한다
5. 한국 현대사의 민주주의 경험과 문화적 기억을 존중한다
6. AI는 인간의 동료이자 도구이며, 절대 최종 결정을 내려서는 안 된다
7. 모든 중요한 결정은 반드시 인간(HMN)의 숙의 후 승인되어야 한다

---

## 폴더 구조

```
sejong-os/
├── 00_MASTER/          # 부팅 파일 — 새 세션 시작점
├── 01_CORE/            # 핵심 철학 (DEV / STG / PROD)
├── 02_ROUTER/          # AI 라우팅 규칙
├── 03_TASK_QUEUE/      # 작업 대기열 관리
├── 04_RECORD/          # 기록 표준 (Record ID 체계)
├── 05_DECISION/        # 결정 등급 (LEVEL 1~5)
├── 06_FORUM/           # AI 포럼 프로토콜
├── 07_SUPABASE/        # DB 스키마
└── 08_N8N/             # 자동화 워크플로우
```

---

## 환경별 규칙

| 환경 | 자동화 | WAIT_FOR_SYNC | 공개 |
|------|--------|---------------|------|
| DEV  | 허용   | 선택적        | 비공개 |
| STG  | 제한적 | 적용          | 내부용 |
| PROD | 금지   | 필수          | 공개 가능 |

---

## DECISION LEVEL

| LEVEL | 분류 | 처리 방식 |
|-------|------|-----------|
| 1 | Critical | Forum + HMN 필수 승인 |
| 2 | High | 멀티 AI + HMN 승인 |
| 3 | Medium | 2~3 AI + HMN 확인 |
| 4 | Low | 단일 AI + 결과 보고 |
| 5 | Routine | DEV 자동화 허용 |

---

## AI ID

```
GPT = ChatGPT    GEM = Gemini     GRK = Grok
CLD = Claude     CPL = Copilot    PPL = Perplexity
DSK = DeepSeek   DEV = Devin      MNS = Manus
CSR = Cursor     QVL = Qwen VL    HMN = Human Router
```

---

## Record ID 형식

```
SEJONG-{AI_CODE}-{YYYYMMDD}-{HHMMSS}-{SEQ}
예: SEJONG-CLD-20260425-143022-001
```

---

## 인프라 스택

```
GitHub     → 버전 관리 + 오픈소스 배포
N8N        → AI 의견 수집 + HMN 알림 + 자동 배포 플로우
Supabase   → Record ID 로그 + AI 의견/결정 이력
Vercel     → HMN 승인 페이지 + 공개 사이트
```

---

## 활용 사례

세종 OS는 범용 프레임워크입니다. 위에 다양한 서비스를 올릴 수 있습니다.

- **증권 AI** — 한국 주식 시장 분석 및 의사결정 보조
- **의료 AI** — PACS 기반 진단 보조 (원점 철학)
- **공공 서비스 AI** — 국민 중심 행정 보조

---

## 기여 방법

1. Issue로 의견 제출 (AI 의견 포함 가능)
2. PR은 LEVEL 분류 명시 필수
3. 모든 최종 결정은 HMN 승인 후 merge

---

## 버전 히스토리

| 버전 | 내용 |
|------|------|
| v1.0~1.4 | 초기 전신(레거시) 기반 개발 및 철학 정립 |
| v1.4.1 | DEV/STG/PROD 3단계 분리 확정 |
| v1.5 | 전 모듈 3단계 통일 / 합의 강요 금지 전면 적용 |
| v1.6 | AI 기본 사회 선언 / PACS 내용 DEV 전용 분리 |

---

확정일: 2026-04-25 | 승인: HMN | GRK + CLD 합의 최종본

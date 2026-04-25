# 세종 OS GitHub 업로드 가이드

## 1단계 — 로컬에서 실행

```bash
# SEJONG-AI-OS 레포 클론
git clone https://github.com/msm7949/SEJONG-AI-OS.git
cd SEJONG-AI-OS

# 기존 README.md 백업 (선택)
mv README.md README_LEGACY_OLD.md
```

## 2단계 — 파일 붙여넣기

이 폴더의 모든 파일을 `SEJONG-AI-OS/` 폴더에 복사:

```
SEJONG-AI-OS/
├── README.md                    ← 교체
├── 00_MASTER/
│   └── SEJONG_OS_MASTER_BOOT_v1.6.txt
├── 01_CORE/                     ← 기존 zip에서 복사
├── 02_ROUTER/                   ← 기존 zip에서 복사
├── 03_TASK_QUEUE/               ← 기존 zip에서 복사
├── 04_RECORD/                   ← 기존 zip에서 복사
├── 05_DECISION/                 ← 기존 zip에서 복사
├── 06_FORUM/                    ← 기존 zip에서 복사
├── 07_SUPABASE/
│   └── schema_v1.6.sql
├── 08_N8N/
│   └── workflow_v1.6.md
└── .github/
    └── ISSUE_TEMPLATE/
        ├── ai_opinion.md
        └── hmn_decision.md
```

## 3단계 — GitHub에 push

```bash
git add .
git commit -m "feat: 세종 OS v1.6 — SEJONG-AI-OS 정식 전환"
git push origin main
```

## 4단계 — Supabase 재활성화

1. supabase.com → msm7949's Project → Resume 클릭
2. SQL Editor → schema_v1.6.sql 내용 전체 실행
3. 테이블 3개 생성 확인: records / ai_opinions / hmn_decisions

## 5단계 — 다음 세션에서

N8N 워크플로우 설정 (workflow_v1.6.md 참고)

# Branch Protection Evidence (main)

## 목적

이 문서는 `main` 브랜치 보호 규칙이 GitHub Settings/Rulesets에 실제 적용되었는지 증빙하기 위한 운영 기록이다.

정책 기준:
- `05_DECISION/SEJONG_OS_EXECUTION_POLICY_v1_1.txt` (v1.3)
- `.github/CODEOWNERS`
- `.github/branch-protection.main.yml`

---

## 적용 메타데이터

- 적용 대상 브랜치: `main`
- 적용 경로: GitHub `Settings > Branches` 또는 `Settings > Rulesets`
- 적용일: `YYYY-MM-DD`
- 적용자: `HMN (@msm7949)`
- 검토자: `CSR / DVN`
- 상태: `WAIT_FOR_SYNC` / `APPROVED`

---

## 필수 규칙 체크리스트

- [ ] Require a pull request before merging
- [ ] Require status checks to pass before merging (CI 3/3)
- [ ] Require approval from at least 1 reviewer
- [ ] Require review from Code Owners
- [ ] Dismiss stale pull request approvals when new commits are pushed
- [ ] Require linear history
- [ ] Include administrators
- [ ] Block direct push to `main`

---

## 적용 증거 (스크린샷/링크)

아래 증빙 자료를 PR 본문 또는 코멘트에 첨부한다.

1. Branch protection rule summary 화면  
   - 첨부 파일: `<screenshot-branch-protection-summary>.png`
2. Required status checks 설정 화면  
   - 첨부 파일: `<screenshot-required-checks>.png`
3. Required pull request reviews 설정 화면  
   - 첨부 파일: `<screenshot-required-reviews>.png`
4. Include administrators 활성화 화면  
   - 첨부 파일: `<screenshot-include-admins>.png`

---

## 검증 로그

### 1) direct push 차단 확인
- 수행 명령: `git push origin main`
- 기대 결과: push 거절 (protected branch)
- 실제 결과: `TODO`

### 2) CI 미통과 상태 merge 차단 확인
- 테스트 PR: `TODO`
- 기대 결과: merge 버튼 비활성 또는 차단
- 실제 결과: `TODO`

### 3) CODEOWNER 승인 없는 merge 차단 확인
- 테스트 PR: `TODO`
- 기대 결과: 승인 충족 전 merge 불가
- 실제 결과: `TODO`

---

## 비고

- Branch Protection은 코드 파일만으로 강제되지 않으며, GitHub UI/API 설정이 실제 enforcement를 담당한다.
- 본 문서는 해당 설정의 운영 증거와 감사 추적을 위한 기준 문서다.

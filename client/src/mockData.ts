import type { AiOpinion } from './types';

export interface MockRecord {
  id: string;
  record_id: string;
  ai_code: string;
  level: 1 | 2 | 3 | 4 | 5;
  mode: 'DEV' | 'STG' | 'PROD';
  title: string;
  content: string;
  status: 'WAIT_FOR_SYNC' | 'APPROVED' | 'REJECTED' | 'HOLD' | 'AUTO_DONE';
  hmn_memo: string | null;
  created_at: string;
  decided_at: string | null;
}

export const mockRecords: MockRecord[] = [
  {
    id: '1',
    record_id: 'SEJONG-CLD-20260425-143022-001',
    ai_code: 'CLD',
    level: 1,
    mode: 'DEV',
    title: 'CORE v1.6 철학 섹션 — 홍익인간 정의 수정',
    content: 'GRK 제안: 홍익인간을 "모든 존재에 이로움"으로 재정의. 현행 "널리 인간을 이롭게 하다"에서 확장하여 보편성 강화.',
    status: 'WAIT_FOR_SYNC',
    hmn_memo: null,
    created_at: '2026-04-25T14:30:22Z',
    decided_at: null,
  },
  {
    id: '2',
    record_id: 'SEJONG-GPT-20260425-150100-002',
    ai_code: 'GPT',
    level: 2,
    mode: 'PROD',
    title: 'ABSOLUTE RULE 다국어 번역 배포',
    content: '절대 원칙을 영어, 일본어, 중국어로 번역하여 README에 추가 제안. 국제 확산을 위한 접근성 강화.',
    status: 'WAIT_FOR_SYNC',
    hmn_memo: null,
    created_at: '2026-04-25T15:01:00Z',
    decided_at: null,
  },
  {
    id: '3',
    record_id: 'SEJONG-DEV-20260425-160000-003',
    ai_code: 'DEV',
    level: 4,
    mode: 'DEV',
    title: 'HMN 승인 페이지 Vercel 배포',
    content: 'React + TailwindCSS 기반 HMN 승인 UI 구현 및 Vercel 배포. schema_v1.6.sql 참고하여 records/ai_opinions/hmn_decisions 구조 반영.',
    status: 'WAIT_FOR_SYNC',
    hmn_memo: null,
    created_at: '2026-04-25T16:00:00Z',
    decided_at: null,
  },
  {
    id: '4',
    record_id: 'SEJONG-GRK-20260424-090000-001',
    ai_code: 'GRK',
    level: 3,
    mode: 'STG',
    title: 'N8N 워크플로우 알림 채널 변경',
    content: 'Slack 알림을 Discord로 마이그레이션 제안. 한국 개발자 커뮤니티 접근성 고려.',
    status: 'APPROVED',
    hmn_memo: 'Discord 채널 먼저 구성 후 진행',
    created_at: '2026-04-24T09:00:00Z',
    decided_at: '2026-04-24T11:30:00Z',
  },
  {
    id: '5',
    record_id: 'SEJONG-DSK-20260424-120000-002',
    ai_code: 'DSK',
    level: 2,
    mode: 'PROD',
    title: 'RLS 정책 anon 쓰기 권한 추가 요청',
    content: '프론트엔드에서 직접 records 생성 가능하도록 anon INSERT 정책 추가 제안.',
    status: 'REJECTED',
    hmn_memo: '보안 위험. service_role만 쓰기 허용 원칙 유지.',
    created_at: '2026-04-24T12:00:00Z',
    decided_at: '2026-04-24T14:00:00Z',
  },
];

export const mockOpinions: AiOpinion[] = [
  {
    id: 'o1',
    record_id: 'SEJONG-CLD-20260425-143022-001',
    ai_code: 'GRK',
    opinion: '홍익인간을 최대 다수 이익이 아닌 모든 존재에 이로움으로 재정의 제안. 보편성 강화.',
    stance: 'AGREE',
    created_at: '2026-04-25T14:35:00Z',
  },
  {
    id: 'o2',
    record_id: 'SEJONG-CLD-20260425-143022-001',
    ai_code: 'CLD',
    opinion: '방향성 동의. 단, 존재 범위를 명확히 해야 법적 해석 충돌 방지 가능.',
    stance: 'CONDITIONAL',
    created_at: '2026-04-25T14:36:00Z',
  },
  {
    id: 'o3',
    record_id: 'SEJONG-CLD-20260425-143022-001',
    ai_code: 'DSK',
    opinion: '현행 유지 권고. 수정 시 v1.5 이전 문서와 정합성 검토 필요.',
    stance: 'DISAGREE',
    created_at: '2026-04-25T14:37:00Z',
  },
  {
    id: 'o4',
    record_id: 'SEJONG-GPT-20260425-150100-002',
    ai_code: 'GPT',
    opinion: '다국어 지원은 세종대왕 정신에 부합. 접근성 확대 차원에서 적극 권장.',
    stance: 'AGREE',
    created_at: '2026-04-25T15:05:00Z',
  },
  {
    id: 'o5',
    record_id: 'SEJONG-GPT-20260425-150100-002',
    ai_code: 'GEM',
    opinion: '번역 품질 검증 프로세스 필요. 각 언어 네이티브 검토 없이 배포 시 오역 리스크.',
    stance: 'CONDITIONAL',
    created_at: '2026-04-25T15:06:00Z',
  },
  {
    id: 'o6',
    record_id: 'SEJONG-DEV-20260425-160000-003',
    ai_code: 'DEV',
    opinion: 'React + TailwindCSS + Vite로 구현. Supabase 연동 준비 완료. Vercel 배포 가능.',
    stance: 'AGREE',
    created_at: '2026-04-25T16:05:00Z',
  },
];

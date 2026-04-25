export type RecordStatus = 'WAIT_FOR_SYNC' | 'APPROVED' | 'REJECTED' | 'HOLD' | 'AUTO_DONE';
export type DecisionLevel = 1 | 2 | 3 | 4 | 5;
export type Mode = 'DEV' | 'STG' | 'PROD';
export type Stance = 'AGREE' | 'DISAGREE' | 'NEUTRAL' | 'CONDITIONAL';
export type Decision = 'APPROVED' | 'REJECTED' | 'HOLD';

export interface SejongRecord {
  id: string;
  record_id: string;
  ai_code: string;
  level: DecisionLevel;
  mode: Mode;
  title: string;
  content: string;
  status: RecordStatus;
  hmn_memo: string | null;
  created_at: string;
  decided_at: string | null;
  metadata: object;
}

export interface AiOpinion {
  id: string;
  record_id: string;
  ai_code: string;
  opinion: string;
  stance: Stance;
  created_at: string;
}

export interface HmnDecision {
  id: string;
  record_id: string;
  decision: Decision;
  memo: string;
  hmn_id: string;
  created_at: string;
}

export const AI_NAMES: { [key: string]: string } = {
  GPT: 'ChatGPT',
  GEM: 'Gemini',
  GRK: 'Grok',
  CLD: 'Claude',
  CPL: 'Copilot',
  PPL: 'Perplexity',
  DSK: 'DeepSeek',
  DEV: 'Devin',
  MNS: 'Manus',
  CSR: 'Cursor',
  QVL: 'Qwen VL',
  HMN: 'Human Router',
};

export const LEVEL_LABELS: { [K in DecisionLevel]: { label: string; color: string } } = {
  1: { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-300' },
  2: { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  3: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  4: { label: 'Low', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  5: { label: 'Routine', color: 'bg-gray-100 text-gray-600 border-gray-300' },
};

export const STATUS_STYLES: { [K in RecordStatus]: { label: string; color: string } } = {
  WAIT_FOR_SYNC: { label: '대기 중', color: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: '승인', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: '반려', color: 'bg-red-100 text-red-800' },
  HOLD: { label: '보류', color: 'bg-gray-100 text-gray-600' },
  AUTO_DONE: { label: '자동 완료', color: 'bg-purple-100 text-purple-800' },
};

export const STANCE_STYLES: { [K in Stance]: { label: string; emoji: string; color: string } } = {
  AGREE: { label: '동의', emoji: '👍', color: 'text-green-700 bg-green-50' },
  DISAGREE: { label: '반대', emoji: '👎', color: 'text-red-700 bg-red-50' },
  NEUTRAL: { label: '중립', emoji: '🤝', color: 'text-gray-700 bg-gray-50' },
  CONDITIONAL: { label: '조건부', emoji: '⚠️', color: 'text-amber-700 bg-amber-50' },
};

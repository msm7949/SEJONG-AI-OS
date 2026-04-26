import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type Mode = 'DEV' | 'STG' | 'PROD';
type Level = 1 | 2 | 3 | 4 | 5;

export default function ChatPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<Mode>('DEV');
  const [level, setLevel] = useState<Level>(3);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [lastRecordId, setLastRecordId] = useState<string | null>(null);
  const canSubmit = useMemo(
    () => title.trim().length > 0 && content.trim().length > 0 && isSupabaseConfigured,
    [title, content]
  );

  const submitRecord = async () => {
    if (!supabase || !canSubmit || submitting) return;

    const aiCode = 'CSR';
    setSubmitting(true);
    setSubmitMessage(null);

    const { data, error } = await supabase.rpc('create_record_from_chat', {
      p_ai_code: aiCode,
      p_level: level,
      p_mode: mode,
      p_title: title.trim(),
      p_content: content.trim(),
      p_metadata: { source: 'chat-page', submitted_by: 'HMN' },
    });

    if (error) {
      setSubmitMessage(`저장 실패: ${error.message}`);
      setSubmitting(false);
      return;
    }

    const result = data as { success?: boolean; record_id?: string; error?: string } | null;
    if (!result?.success || !result.record_id) {
      setSubmitMessage(`저장 실패: ${result?.error ?? 'RPC 결과가 올바르지 않습니다.'}`);
      setSubmitting(false);
      return;
    }

    setLastRecordId(result.record_id);
    setSubmitMessage('저장 완료: WAIT_FOR_SYNC로 접수되었습니다. WF1 트리거가 자동 실행됩니다.');
    setTitle('');
    setContent('');
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">AI 대화창</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI 중심 운영을 위한 1순위 인터페이스. 숙의 후 최종 결정은 HMN 승인에서 진행합니다.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-6">
        <p className="text-sm font-semibold text-slate-900 mb-2">입력 가이드</p>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>- 안건 제목, 핵심 내용, 원하는 결과를 먼저 적으세요.</li>
          <li>- 필요하면 `record_id`를 함께 넣어 맥락을 이어가세요.</li>
          <li>- 확정이 필요하면 HMN 승인 화면으로 이동해 최종 처리하세요.</li>
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">안건 제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 승인 화면 상세 모달 추가"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">모드</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="DEV">DEV</option>
              <option value="STG">STG</option>
              <option value="PROD">PROD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">레벨</label>
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value) as Level)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>L1 Critical</option>
              <option value={2}>L2 High</option>
              <option value={3}>L3 Medium</option>
              <option value={4}>L4 Low</option>
              <option value={5}>L5 Routine</option>
            </select>
          </div>
        </div>
        <label className="block text-sm font-medium text-slate-700 mb-2">안건 내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="요청 배경, 목표, 조건, 기대 결과를 입력하세요."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={submitRecord}
            disabled={!canSubmit || submitting}
            className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '저장 중...' : 'WAIT_FOR_SYNC로 접수'}
          </button>
          <span className={`text-xs ${isSupabaseConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isSupabaseConfigured ? 'Supabase 연결됨' : 'Supabase 미설정'}
          </span>
        </div>
        {submitMessage && (
          <p className="mt-2 text-xs text-slate-600">{submitMessage}</p>
        )}
        {lastRecordId && (
          <p className="mt-1 text-xs text-slate-500 font-mono">record_id: {lastRecordId}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/approve"
          className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          HMN 승인으로 이동
        </Link>
        <Link
          to="/dashboard"
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
        >
          대시보드 보기
        </Link>
      </div>
    </div>
  );
}

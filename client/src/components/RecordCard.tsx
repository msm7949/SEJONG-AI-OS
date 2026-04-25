import { useState } from 'react';
import type { AiOpinion, Decision, DecisionLevel, Stance } from '../types';
import { AI_NAMES, LEVEL_LABELS, STATUS_STYLES, STANCE_STYLES } from '../types';
import type { MockRecord } from '../mockData';

interface RecordCardProps {
  record: MockRecord;
  opinions: AiOpinion[];
  onDecide?: (recordId: string, decision: Decision, memo: string) => void;
}

export default function RecordCard({ record, opinions, onDecide }: RecordCardProps) {
  const [memo, setMemo] = useState('');
  const [expanded, setExpanded] = useState(false);
  const isPending = record.status === 'WAIT_FOR_SYNC';
  const levelInfo = LEVEL_LABELS[record.level as DecisionLevel];
  const statusInfo = STATUS_STYLES[record.status];

  const handleDecision = (decision: Decision) => {
    onDecide?.(record.record_id, decision, memo);
    setMemo('');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`rounded-xl border shadow-sm transition-all ${
        isPending
          ? 'border-amber-200 bg-white'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      {/* Card Header */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-2 mb-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${levelInfo.color}`}>
            L{record.level} {levelInfo.label}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono text-slate-500 bg-slate-100">
            {record.mode}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono text-slate-400 bg-slate-100">
            {AI_NAMES[record.ai_code] ?? record.ai_code}
          </span>
        </div>

        <h3 className="text-base font-semibold text-slate-900 mb-1">{record.title}</h3>
        <p className="text-sm text-slate-600 mb-2">{record.content}</p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="font-mono">{record.record_id}</span>
          <span>{formatDate(record.created_at)}</span>
        </div>

        {record.hmn_memo && (
          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
            <span className="font-semibold">HMN 메모:</span> {record.hmn_memo}
          </div>
        )}
      </div>

      {/* AI Opinions */}
      {opinions.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 sm:px-5 py-3 flex items-center justify-between text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium">AI 의견 ({opinions.length}건)</span>
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="px-4 sm:px-5 pb-4 space-y-2">
              {opinions.map((op) => {
                const stanceInfo = STANCE_STYLES[op.stance as Stance];
                return (
                  <div
                    key={op.id}
                    className={`p-3 rounded-lg border border-slate-100 ${stanceInfo.color}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{stanceInfo.emoji}</span>
                      <span className="text-xs font-semibold">
                        {AI_NAMES[op.ai_code] ?? op.ai_code}
                      </span>
                      <span className="text-xs opacity-70">{stanceInfo.label}</span>
                    </div>
                    <p className="text-sm">{op.opinion}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Decision Actions */}
      {isPending && onDecide && (
        <div className="border-t border-slate-200 p-4 sm:p-5 bg-slate-50/50 rounded-b-xl">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="HMN 메모 (선택)"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => handleDecision('APPROVED')}
              className="flex-1 min-w-[100px] px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              승인
            </button>
            <button
              onClick={() => handleDecision('HOLD')}
              className="flex-1 min-w-[100px] px-4 py-2.5 bg-slate-500 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              보류
            </button>
            <button
              onClick={() => handleDecision('REJECTED')}
              className="flex-1 min-w-[100px] px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              반려
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

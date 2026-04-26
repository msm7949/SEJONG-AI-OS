import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Decision } from '../types';
import { useRecords } from '../hooks/useRecords';
import RecordCard from '../components/RecordCard';

type FilterTab = 'pending' | 'all' | 'decided';

export default function ApprovePage() {
  const { records, opinions, loading, error, source, decide, refresh } = useRecords();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [deciding, setDeciding] = useState(false);
  const statusFilter = searchParams.get('status');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    if (statusFilter === 'WAIT_FOR_SYNC') {
      setActiveTab('pending');
    } else if (statusFilter === 'APPROVED' || statusFilter === 'REJECTED' || statusFilter === 'HOLD') {
      setActiveTab('decided');
    }
  }, [statusFilter]);

  const filteredRecords = useMemo(() => {
    let base = records;
    switch (activeTab) {
      case 'pending':
        base = records.filter((r) => r.status === 'WAIT_FOR_SYNC');
        break;
      case 'decided':
        base = records.filter((r) => r.status !== 'WAIT_FOR_SYNC');
        break;
      default:
        base = records;
        break;
    }

    if (statusFilter === 'WAIT_FOR_SYNC') {
      base = base.filter((r) => r.status === 'WAIT_FOR_SYNC');
    }
    if (statusFilter === 'APPROVED' || statusFilter === 'REJECTED' || statusFilter === 'HOLD') {
      base = base.filter((r) => r.status === statusFilter);
    }

    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return base;

    return base.filter((r) =>
      [
        r.record_id,
        r.title,
        r.content,
        r.hmn_memo ?? '',
        r.result ?? '',
        r.ai_code,
        r.mode,
        r.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [records, activeTab, statusFilter, searchTerm]);

  const pendingCount = records.filter((r) => r.status === 'WAIT_FOR_SYNC').length;
  const approvedCount = records.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = records.filter((r) => r.status === 'REJECTED').length;
  const holdCount = records.filter((r) => r.status === 'HOLD').length;
  const pendingRecords = records.filter((r) => r.status === 'WAIT_FOR_SYNC');
  const levelSummary = {
    l1: pendingRecords.filter((r) => r.level === 1).length,
    l2: pendingRecords.filter((r) => r.level === 2).length,
    l3: pendingRecords.filter((r) => r.level === 3).length,
    l4: pendingRecords.filter((r) => r.level >= 4).length,
  };
  const urgentCount = levelSummary.l1 + levelSummary.l2;

  const handleDecide = async (recordId: string, decision: Decision, memo: string) => {
    setDeciding(true);
    try {
      await decide(recordId, decision, memo);
    } finally {
      setDeciding(false);
    }
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: `대기 중 (${pendingCount})` },
    { key: 'all', label: '전체' },
    { key: 'decided', label: '결정 완료' },
  ];

  const statusButtons: Array<{ label: string; value: string | null }> = [
    { label: '상태 전체', value: null },
    { label: '대기', value: 'WAIT_FOR_SYNC' },
    { label: '승인', value: 'APPROVED' },
    { label: '반려', value: 'REJECTED' },
    { label: '보류', value: 'HOLD' },
  ];

  const applyStatusFilter = (next: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next) {
      nextParams.set('status', next);
    } else {
      nextParams.delete('status');
    }
    setSearchParams(nextParams);
  };

  const updateSearch = (value: string) => {
    setSearchTerm(value);
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">HMN 승인 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI 요청을 검토하고 승인/반려/보류 결정을 내립니다. 모든 최종 결정은 HMN이 합니다.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          승인 버튼은 Supabase RPC `make_hmn_decision` 호출로 처리됩니다.
        </p>
      </div>

      {/* Absolute Rule Banner */}
      <div className="mb-6 p-4 bg-indigo-900 text-white rounded-xl border border-indigo-700">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm">ABSOLUTE RULE — 절대 원칙</p>
            <p className="text-sm text-indigo-200 mt-0.5">
              AI는 절대 최종 결정을 내릴 수 없다. 모든 결정은 인간(HMN)이 한다.
            </p>
          </div>
        </div>
      </div>

      {/* HMN Summary Card */}
      <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">HMN 요약 카드</p>
            <p className="text-xs text-slate-500 mt-1">
              CSR 통과는 자동 반영이 아니라, HMN이 판단할 재료가 준비되었다는 의미입니다.
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${urgentCount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {urgentCount > 0 ? `즉시 확인 ${urgentCount}건` : '즉시 확인 없음'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-xs">
          <div className="p-2 rounded-lg bg-red-50 border border-red-100 text-red-700">L1 Critical: {levelSummary.l1}</div>
          <div className="p-2 rounded-lg bg-orange-50 border border-orange-100 text-orange-700">L2 High: {levelSummary.l2}</div>
          <div className="p-2 rounded-lg bg-yellow-50 border border-yellow-100 text-yellow-700">L3 Medium: {levelSummary.l3}</div>
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-700">L4 Low/Routine: {levelSummary.l4}</div>
        </div>
      </div>

      {/* Data Source + Refresh */}
      <div className="flex items-center justify-between mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          source === 'supabase'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${source === 'supabase' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {source === 'supabase' ? 'Supabase 연결됨' : 'Mock 데이터'}
        </span>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Status Filter */}
      <div className="mb-6 space-y-3">
        <input
          value={searchTerm}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="record_id, 제목, 내용, HMN 메모, 실행 결과 검색"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        />
        <div className="flex flex-wrap gap-2">
          {statusButtons.map((b) => {
            const selected = (statusFilter ?? null) === b.value;
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => applyStatusFilter(b.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Decided View Helper */}
      {activeTab === 'decided' && (
        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
            <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
              승인 {approvedCount}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">
              반려 {rejectedCount}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
              보류 {holdCount}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyStatusFilter(null)}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-300 bg-white hover:bg-slate-100"
            >
              결정 전체 보기
            </button>
            <button
              type="button"
              onClick={() => applyStatusFilter('APPROVED')}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
            >
              승인만 보기
            </button>
            <button
              type="button"
              onClick={() => applyStatusFilter('REJECTED')}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
            >
              반려만 보기
            </button>
          </div>
          {(statusFilter === 'APPROVED' || statusFilter === 'REJECTED' || statusFilter === 'HOLD') && (
            <p className="mt-2 text-xs text-slate-500">
              현재 상태 필터 적용 중: <span className="font-semibold">{statusFilter}</span>
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-400">데이터 로딩 중...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm">해당 조건의 레코드가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              opinions={opinions.filter((o) => o.record_id === record.record_id)}
              onDecide={record.status === 'WAIT_FOR_SYNC' ? handleDecide : undefined}
              deciding={deciding}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
        세종 OS v1.6 — 홍익인간 정신 × 한국형 민주주의 × DICOM/PACS 구조
      </div>
    </div>
  );
}

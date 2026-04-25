import { useState, useMemo } from 'react';
import type { Decision, RecordStatus } from '../types';
import { mockRecords, mockOpinions } from '../mockData';
import type { MockRecord } from '../mockData';
import RecordCard from '../components/RecordCard';

type FilterTab = 'pending' | 'all' | 'decided';

export default function ApprovePage() {
  const [records, setRecords] = useState<MockRecord[]>(mockRecords);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');

  const filteredRecords = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return records.filter((r) => r.status === 'WAIT_FOR_SYNC');
      case 'decided':
        return records.filter((r) => r.status !== 'WAIT_FOR_SYNC');
      default:
        return records;
    }
  }, [records, activeTab]);

  const pendingCount = records.filter((r) => r.status === 'WAIT_FOR_SYNC').length;

  const handleDecide = (recordId: string, decision: Decision, memo: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.record_id === recordId
          ? {
              ...r,
              status: decision as RecordStatus,
              hmn_memo: memo || null,
              decided_at: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: `대기 중 (${pendingCount})` },
    { key: 'all', label: '전체' },
    { key: 'decided', label: '결정 완료' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">HMN 승인 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI 요청을 검토하고 승인/반려/보류 결정을 내립니다. 모든 최종 결정은 HMN이 합니다.
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

      {/* Records */}
      {filteredRecords.length === 0 ? (
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
              opinions={mockOpinions.filter((o) => o.record_id === record.record_id)}
              onDecide={record.status === 'WAIT_FOR_SYNC' ? handleDecide : undefined}
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

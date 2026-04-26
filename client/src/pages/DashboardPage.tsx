import { Link, useNavigate } from 'react-router-dom';
import { useRecords } from '../hooks/useRecords';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { records, opinions, loading, source } = useRecords();

  const pending = records.filter((r) => r.status === 'WAIT_FOR_SYNC').length;
  const approved = records.filter((r) => r.status === 'APPROVED').length;
  const rejected = records.filter((r) => r.status === 'REJECTED').length;
  const hold = records.filter((r) => r.status === 'HOLD').length;

  const stats = [
    {
      label: '대기 중',
      value: pending,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      to: '/approve?status=WAIT_FOR_SYNC',
    },
    {
      label: '승인',
      value: approved,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      to: '/approve?status=APPROVED',
    },
    {
      label: '반려',
      value: rejected,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      to: '/approve?status=REJECTED',
    },
    {
      label: '보류',
      value: hold,
      color: 'bg-slate-500',
      textColor: 'text-slate-600',
      to: '/approve?status=HOLD',
    },
    { label: 'AI 의견', value: opinions.length, color: 'bg-indigo-500', textColor: 'text-indigo-600' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">세종 OS 대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">
          국민 중심 소버린 AI 시스템 — 현재 상태 요약
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-2 text-sm text-slate-400">데이터 로딩 중...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
          {stats.map((stat) =>
            stat.to ? (
              <button
                key={stat.label}
                type="button"
                onClick={() => navigate(stat.to!)}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 text-left hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <div className={`w-2 h-2 rounded-full ${stat.color} mb-3`} />
                <p className={`text-2xl sm:text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                <p className="text-[11px] text-indigo-600 mt-2 font-medium">클릭해서 목록 보기</p>
              </button>
            ) : (
              <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                <div className={`w-2 h-2 rounded-full ${stat.color} mb-3`} />
                <p className={`text-2xl sm:text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">빠른 작업</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            to="/approve"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900 text-sm">HMN 승인 관리</p>
              <p className="text-xs text-slate-500">
                {pending > 0 ? `${pending}건 대기 중` : '처리할 건 없음'}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 opacity-60">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-500 text-sm">AI 포럼</p>
              <p className="text-xs text-slate-400">준비 중 (Phase 2)</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">시스템 정보</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-1">시스템</p>
            <p>세종 OS v1.6</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">철학</p>
            <p>홍익인간 × 한국형 민주주의</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">인프라</p>
            <p>GitHub + Supabase + N8N + Vercel</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">데이터 소스</p>
            <p className={source === 'supabase' ? 'text-emerald-400' : 'text-amber-400'}>
              {source === 'supabase' ? 'Supabase 연결됨' : 'Mock 데이터 (Supabase 미설정)'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
        세종 OS v1.6 — 홍익인간 정신 × 한국형 민주주의 × DICOM/PACS 구조
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';

export default function ChatPage() {
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
        <label className="block text-sm font-medium text-slate-700 mb-2">
          안건 초안 입력
        </label>
        <textarea
          rows={8}
          readOnly
          placeholder="이 화면은 대화 중심 레이아웃입니다. 실제 AI 입력창(통합 모듈)은 다음 단계에서 연결합니다."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
        />
        <p className="mt-2 text-xs text-slate-400">
          현재 단계: 대화창을 1순위 진입점으로 배치 완료
        </p>
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

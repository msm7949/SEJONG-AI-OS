import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type SessionGroup = '오늘' | '어제' | '이번주';
type MessageRole = 'HMN' | 'AI';
type ServiceStatus = 'UP' | 'DOWN' | 'CHECKING';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  latest_preview?: string;
  latest_status?: 'WAIT_FOR_SYNC' | '초안' | '승인완료';
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  ai_code: 'CLD' | 'DVN' | 'CSR';
  status: 'WAIT_FOR_SYNC' | 'DONE';
  user_id?: string;
}

interface HealthState {
  proxy: ServiceStatus;
  lmStudio: ServiceStatus;
  nim: ServiceStatus;
}

const PROXY_URL = 'http://127.0.0.1:8082';
const LM_URL = 'http://127.0.0.1:8080';
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

function formatTime(value: string): string {
  return new Date(value).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupSessions(sessions: ChatSession[]): Record<SessionGroup, ChatSession[]> {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);

  const grouped: Record<SessionGroup, ChatSession[]> = { 오늘: [], 어제: [], 이번주: [] };
  for (const session of sessions) {
    const updated = new Date(session.updated_at);
    if (updated >= startToday) {
      grouped.오늘.push(session);
    } else if (updated >= startYesterday) {
      grouped.어제.push(session);
    } else if (updated >= startWeek) {
      grouped.이번주.push(session);
    }
  }
  return grouped;
}

async function fetchHealth(url: string, opts?: RequestInit): Promise<ServiceStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { ...opts, signal: controller.signal });
    return response.ok ? 'UP' : 'DOWN';
  } catch {
    return 'DOWN';
  } finally {
    clearTimeout(timer);
  }
}

async function requestAiReply(prompt: string): Promise<{ text: string; aiCode: 'CLD' | 'DVN' | 'CSR' }> {
  const response = await fetch(`${PROXY_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'freecc',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI 응답 실패: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split('\n').filter((line) => line.startsWith('data: '));

  let aiModel = '';
  let output = '';
  for (const line of lines) {
    const payload = line.slice(6).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const json = JSON.parse(payload) as Record<string, unknown>;
      if (json.type === 'message_start' && typeof json.message === 'object' && json.message) {
        const model = (json.message as { model?: string }).model;
        if (model) aiModel = model;
      }
      if (
        json.type === 'content_block_delta' &&
        typeof json.delta === 'object' &&
        json.delta &&
        (json.delta as { type?: string }).type === 'text_delta'
      ) {
        output += (json.delta as { text?: string }).text ?? '';
      }
    } catch {
      // ignore malformed event line
    }
  }

  const aiCode: 'CLD' | 'DVN' | 'CSR' = aiModel.includes('glm') ? 'CSR' : 'CLD';
  return { text: output.trim() || '응답 텍스트가 비어 있습니다.', aiCode };
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState('');
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  const [composerBlockedReason, setComposerBlockedReason] = useState<string | null>('입력 대기 중');
  const [chatError, setChatError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [systemHealth, setSystemHealth] = useState<HealthState>({
    proxy: 'CHECKING',
    lmStudio: 'CHECKING',
    nim: 'CHECKING',
  });

  const grouped = useMemo(() => groupSessions(sessions), [sessions]);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const isComposerEmpty = composerValue.trim().length === 0;
  const submitDisabled = isSendingMessage || isCreatingSession || !authReady || !currentUserId || isComposerEmpty;
  const submitDisabledReason = isSendingMessage
    ? '전송 중'
    : isCreatingSession
      ? '세션 생성 중'
      : !authReady
        ? '인증 확인 중'
        : !currentUserId
          ? '로그인 세션 없음'
      : isComposerEmpty
        ? '입력 대기 중'
        : null;

  const loadSessions = async () => {
    if (!supabase || !isSupabaseConfigured) return;
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!data) return;
    const parsed: ChatSession[] = (data as ChatSession[]).map((s) => ({
      ...s,
      latest_status: '초안',
    }));
    const { data: latestMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    const latestBySession = new Map<string, ChatMessage>();
    for (const msg of (latestMessages as ChatMessage[] | null) ?? []) {
      if (!latestBySession.has(msg.session_id)) latestBySession.set(msg.session_id, msg);
    }
    for (const session of parsed) {
      const latest = latestBySession.get(session.id);
      if (!latest) continue;
      session.latest_preview = latest.content;
      session.latest_status = latest.status === 'WAIT_FOR_SYNC' ? 'WAIT_FOR_SYNC' : '초안';
    }
    setSessions(parsed);
    if (!activeSessionId && parsed.length > 0) setActiveSessionId(parsed[0].id);
  };

  const getCurrentUserId = async (): Promise<string> => {
    if (!supabase || !isSupabaseConfigured) {
      return 'local-dev-user';
    }
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw new Error(`인증 사용자 조회 실패: ${error.message}`);
    }
    const userId = data.user?.id;
    if (!userId) {
      throw new Error('로그인 세션이 없습니다. 다시 로그인 후 시도하세요.');
    }
    return userId;
  };

  useEffect(() => {
    const sb = supabase;
    if (!sb || !isSupabaseConfigured) {
      setAuthReady(true);
      setCurrentUserId('local-dev-user');
      return;
    }

    let mounted = true;
    const initAuth = async () => {
      const { data: sessionData } = await sb.auth.getSession();
      if (import.meta.env.DEV) {
        console.log('[auth] session', sessionData.session);
      }

      const { data: userData, error: userError } = await sb.auth.getUser();
      if (import.meta.env.DEV) {
        console.log('[auth] user', userData.user, userError);
      }

      if (!mounted) return;
      if (userError || !userData.user?.id) {
        setCurrentUserId(null);
        setChatError('로그인 세션이 없습니다. 다시 로그인 후 시도해주세요.');
      } else {
        setCurrentUserId(userData.user.id);
        setChatError(null);
      }
      setAuthReady(true);
    };

    void initAuth();

    const { data: authListener } = sb.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setCurrentUserId(uid);
      setAuthReady(true);
      if (!uid) {
        setChatError('로그인 세션이 없습니다. 다시 로그인 후 시도해주세요.');
      } else {
        setChatError(null);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadMessages = async (sessionId: string) => {
    if (!supabase || !isSupabaseConfigured) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) ?? []);
  };

  const createSession = async (): Promise<ChatSession> => {
    setIsCreatingSession(true);
    if (!supabase || !isSupabaseConfigured) {
      const now = new Date().toISOString();
      const localSession: ChatSession = {
        id: crypto.randomUUID(),
        title: '새 대화',
        created_at: now,
        updated_at: now,
        latest_status: '초안',
      };
      setSessions((prev) => [localSession, ...prev]);
      setActiveSessionId(localSession.id);
      setMessages([]);
      setIsCreatingSession(false);
      return localSession;
    }
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        title: '새 대화',
        status: 'draft',
      })
      .select('*')
      .single();
    setIsCreatingSession(false);
    if (error || !data) {
      if (import.meta.env.DEV) {
        console.error('[session:create] failed', {
          code: error?.code,
          message: error?.message,
          payloadKeys: ['user_id', 'title', 'status'],
        });
      }
      throw new Error(error?.message ?? '세션 생성 실패');
    }
    const created = {
      ...(data as ChatSession),
      latest_status: '초안' as const,
    };
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    setMessages([]);
    return created;
  };

  const persistMessage = async (message: Omit<ChatMessage, 'id'>) => {
    if (!supabase || !isSupabaseConfigured) return;
    const { error } = await supabase.from('chat_messages').insert(message);
    if (error) {
      if (import.meta.env.DEV) {
        console.error('[message:insert] failed', {
          code: error.code,
          message: error.message,
          payloadKeys: Object.keys(message),
        });
      }
      throw new Error(error.message);
    }
  };

  const updateSessionTitle = async (sessionId: string, title: string) => {
    if (!supabase || !isSupabaseConfigured) return;
    await supabase.from('sessions').update({ title }).eq('id', sessionId);
  };

  const runHealthCheck = async () => {
    const proxy = await fetchHealth(`${PROXY_URL}/v1/models`);
    const lmStudio = await fetchHealth(`${LM_URL}/v1/models`);
    const nim = await fetchHealth(`${PROXY_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'freecc',
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    setSystemHealth({ proxy, lmStudio, nim });
  };

  const setComposerAvailability = (nextReason: string | null) => {
    setComposerBlockedReason(nextReason);
  };

  useEffect(() => {
    void loadSessions();
    void runHealthCheck();
    const interval = setInterval(() => {
      void runHealthCheck();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    void loadMessages(activeSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  const handleComposerChange = (value: string) => {
    setComposerValue(value);
    if (value.trim()) setComposerAvailability(null);
    else setComposerAvailability('입력 대기 중');
  };

  const ensureActiveSession = async (): Promise<ChatSession> => {
    if (activeSession) {
      console.log('[submit] ensureActiveSession existing=', activeSession.id);
      return activeSession;
    }
    console.log('[submit] ensureActiveSession createSession start');
    return createSession();
  };

  const appendOptimisticUserMessage = (sessionId: string, text: string): ChatMessage => {
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'HMN',
      content: text,
      created_at: new Date().toISOString(),
      ai_code: 'CSR',
      status: 'DONE',
    };
    setMessages((prev) => [...prev, optimistic]);
    return optimistic;
  };

  const persistUserMessage = async (message: Omit<ChatMessage, 'id'>) => {
    await persistMessage(message);
  };

  const requestAssistantReply = async (sessionId: string, userText: string) => {
    const ai = await requestAiReply(userText);
    const aiMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'AI',
      content: ai.text,
      created_at: new Date().toISOString(),
      ai_code: ai.aiCode,
      status: 'WAIT_FOR_SYNC',
    };
    setMessages((prev) => [...prev, aiMessage]);
    setIsAwaitingApproval(true);
    await persistMessage({ ...aiMessage });
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              latest_preview: aiMessage.content,
              latest_status: 'WAIT_FOR_SYNC',
              updated_at: new Date().toISOString(),
            }
          : session
      )
    );
  };

  const handleSubmit = async () => {
    console.log('[submit] start');
    console.log('[submit] input=', composerValue);
    console.log('[submit] activeSessionId=', activeSessionId);
    console.log('[submit] disabledReason=', submitDisabledReason);
    if (!authReady) {
      setChatError('인증 상태 확인 중입니다. 잠시 후 다시 시도해주세요.');
      console.log('[submit] early return: auth loading');
      return;
    }
    if (!currentUserId) {
      setChatError('로그인 세션이 없습니다. 다시 로그인 후 시도해주세요.');
      console.log('[submit] early return: missing auth session');
      return;
    }
    if (!composerValue.trim()) {
      setComposerAvailability('입력 대기 중');
      console.log('[submit] early return: empty input');
      return;
    }
    if (isSendingMessage || isCreatingSession) {
      console.log('[submit] early return: busy');
      return;
    }
    const userText = composerValue.trim();
    setComposerValue('');
    setChatError(null);
    setIsSendingMessage(true);
    setComposerAvailability('전송 중');

    try {
      const session = await ensureActiveSession();
      console.log('[submit] ensureActiveSession result=', session.id);
      const userId = await getCurrentUserId();
      const optimistic = appendOptimisticUserMessage(session.id, userText);
      optimistic.user_id = userId;
      console.log('[submit] persistUserMessage start');
      await persistUserMessage({ ...optimistic });

      const currentTitle =
        sessions.find((s) => s.id === session.id)?.title ?? session.title;
      if (currentTitle === '새 대화') {
        const generatedTitle = userText.slice(0, 20);
        void updateSessionTitle(session.id, generatedTitle);
        setSessions((prev) =>
          prev.map((item) =>
            item.id === session.id
              ? {
                  ...item,
                  title: generatedTitle,
                  latest_preview: userText,
                  latest_status: '초안',
                  updated_at: new Date().toISOString(),
                }
              : item
          )
        );
      }

      await requestAssistantReply(session.id, userText);
      setComposerAvailability(null);
      console.log('[submit] done');
    } catch (error) {
      const message = error instanceof Error ? error.message : '전송 실패';
      if (message.includes('row-level security') || message.includes('permission')) {
        setChatError('세션 생성 권한 오류: Supabase 정책을 확인하세요');
      } else {
        setChatError(`전송 실패: ${message}`);
      }
      setComposerAvailability('연결 확인 필요');
      console.error('[submit] failed', error);
    } finally {
      setIsSendingMessage(false);
      if (!composerValue.trim()) setComposerAvailability('입력 대기 중');
    }
  };

  const statusColor = (status: ServiceStatus) => {
    if (status === 'UP') return 'text-emerald-600';
    if (status === 'DOWN') return 'text-rose-500';
    return 'text-slate-500';
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-slate-100">
      <aside
        className={`fixed z-20 md:static top-16 left-0 h-[calc(100vh-4rem)] w-[220px] bg-white border-r border-slate-200 transform transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#534AB7] text-white flex items-center justify-center font-bold">世</div>
              <span className="font-semibold text-slate-900">세종 OS</span>
            </div>
            <button
              onClick={() => void createSession()}
              className="w-full py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 transition-colors"
            >
              새 대화
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {(Object.keys(grouped) as SessionGroup[]).map((group) => (
              <div key={group}>
                <p className="px-2 text-xs font-semibold text-slate-500 mb-1">{group}</p>
                <div className="space-y-1">
                  {grouped[group].map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setActiveSessionId(session.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full text-left px-2 py-2 rounded-md text-sm truncate ${
                        activeSessionId === session.id
                          ? 'bg-[#EEF0FF] text-[#534AB7] font-medium'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="truncate">{session.title}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {session.latest_preview ?? '메시지 없음'}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{session.latest_status ?? '초안'}</span>
                        <span>{formatTime(session.updated_at)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="md:hidden px-2 py-1 border border-slate-200 rounded text-slate-600"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              ☰
            </button>
            <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
              {activeSession?.title ?? '새 대화를 시작하세요'}
            </h1>
          </div>
          <Link
            to="/approve"
            className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
              isAwaitingApproval
                ? 'text-white bg-[#534AB7] hover:bg-[#4A42A6]'
                : 'text-slate-500 bg-slate-200 hover:bg-slate-300'
            }`}
          >
            {isAwaitingApproval ? '승인 대기' : '승인 불필요'}
          </Link>
        </header>

        <section className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="max-w-xl rounded-xl border border-dashed border-slate-300 bg-white/70 p-6">
              <h2 className="text-base font-semibold text-slate-900">새 대화를 시작하세요</h2>
              <p className="mt-1 text-sm text-slate-600">
                메시지를 입력하면 새 세션이 자동으로 만들어집니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['운영 원칙 정리', '구조 설계 초안', 'HMN 승인 요청 초안'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleComposerChange(preset)}
                    className="px-3 py-1.5 rounded-full text-xs bg-[#EEF0FF] text-[#534AB7] hover:bg-[#dde2ff]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'HMN' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[90%] sm:max-w-[70%]">
                  {message.role === 'AI' && (
                    <div className="mb-1 text-xs text-slate-500 flex items-center gap-2">
                      <span className="inline-flex w-5 h-5 rounded-full bg-slate-900 text-white items-center justify-center text-[10px]">世</span>
                      <span>{message.ai_code}</span>
                      <span>{formatTime(message.created_at)}</span>
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      message.role === 'HMN'
                        ? 'bg-[#534AB7] text-white rounded-br-md'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === 'AI' && message.status === 'WAIT_FOR_SYNC' && (
                    <div className="mt-1">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                        WAIT_FOR_SYNC
                      </span>
                    </div>
                  )}
                  {message.role === 'HMN' && (
                    <div className="mt-1 text-xs text-right text-slate-500">{formatTime(message.created_at)}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        <div className="bg-white border-t border-slate-200 p-3 sm:p-4">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <textarea
              value={composerValue}
              onChange={(e) => handleComposerChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  console.log('[submit] trigger: enter');
                  void handleSubmit();
                }
              }}
              rows={3}
              placeholder="정책 초안 작성, 구조 설계, 승인 요청 등을 입력하세요"
              className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
            />
            <button
              type="submit"
              onClick={() => console.log('[submit] trigger: click')}
              disabled={submitDisabled}
              className="w-10 h-10 shrink-0 rounded-full bg-[#534AB7] text-white disabled:opacity-40"
              aria-label="전송"
            >
              ↑
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            첫 메시지를 보내면 새 세션이 자동 생성됩니다
          </p>
          <p className="mt-1 text-xs text-slate-500">
            WAIT_FOR_SYNC 원칙 유지 · 최종 결정은 HMN 승인에서
          </p>
          {(composerBlockedReason || submitDisabledReason) && (
            <p className="mt-1 text-xs text-amber-600">{composerBlockedReason ?? submitDisabledReason}</p>
          )}
          {submitDisabledReason && (
            <p className="mt-1 text-[11px] text-slate-400">
              submit 상태: {submitDisabledReason}
            </p>
          )}
          {composerBlockedReason && !submitDisabledReason && (
            <p className="mt-1 text-xs text-amber-600">{composerBlockedReason}</p>
          )}
          {isCreatingSession && (
            <p className="mt-1 text-xs text-slate-500">세션 생성 중...</p>
          )}
          {chatError && (
            <p className="mt-1 text-xs text-rose-600">{chatError}</p>
          )}
        </div>

        <footer className="h-9 bg-slate-900 text-slate-200 px-4 text-xs flex items-center gap-4">
          <span className={statusColor(systemHealth.proxy)}>8082 Proxy: {systemHealth.proxy}</span>
          <span className={statusColor(systemHealth.lmStudio)}>LM Studio: {systemHealth.lmStudio}</span>
          <span className={statusColor(systemHealth.nim)}>NIM: {systemHealth.nim}</span>
        </footer>
      </main>
    </div>
  );
}

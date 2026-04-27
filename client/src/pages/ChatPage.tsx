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
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  ai_code: 'CLD' | 'DVN' | 'CSR';
  status: 'WAIT_FOR_SYNC' | 'DONE';
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
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthState>({
    proxy: 'CHECKING',
    lmStudio: 'CHECKING',
    nim: 'CHECKING',
  });

  const grouped = useMemo(() => groupSessions(sessions), [sessions]);
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const loadSessions = async () => {
    if (!supabase || !isSupabaseConfigured) return;
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('updated_at', { ascending: false });
    if (!data) return;
    const parsed = data as ChatSession[];
    setSessions(parsed);
    if (!activeSessionId && parsed.length > 0) setActiveSessionId(parsed[0].id);
  };

  const loadMessages = async (sessionId: string) => {
    if (!supabase || !isSupabaseConfigured) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) ?? []);
  };

  const createSession = async () => {
    if (!supabase || !isSupabaseConfigured) return;
    const { data } = await supabase
      .from('sessions')
      .insert({
        title: '새 대화',
      })
      .select('*')
      .single();
    if (!data) return;
    const created = data as ChatSession;
    setSessions((prev) => [created, ...prev]);
    setActiveSessionId(created.id);
    setMessages([]);
  };

  const persistMessage = async (message: Omit<ChatMessage, 'id'>) => {
    if (!supabase || !isSupabaseConfigured) return;
    await supabase.from('chat_messages').insert(message);
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
    setHealth({ proxy, lmStudio, nim });
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

  const sendMessage = async () => {
    if (!activeSessionId || !input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const now = new Date().toISOString();
    const hmnMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: activeSessionId,
      role: 'HMN',
      content: text,
      created_at: now,
      ai_code: 'CSR',
      status: 'DONE',
    };
    setMessages((prev) => [...prev, hmnMessage]);
    void persistMessage({ ...hmnMessage });

    if (activeSession?.title === '새 대화') {
      const generatedTitle = text.slice(0, 20);
      void updateSessionTitle(activeSessionId, generatedTitle);
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? { ...session, title: generatedTitle, updated_at: new Date().toISOString() }
            : session
        )
      );
    }

    try {
      const ai = await requestAiReply(text);
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        role: 'AI',
        content: ai.text,
        created_at: new Date().toISOString(),
        ai_code: ai.aiCode,
        status: 'WAIT_FOR_SYNC',
      };
      setMessages((prev) => [...prev, aiMessage]);
      await persistMessage({ ...aiMessage });
    } catch (error) {
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        session_id: activeSessionId,
        role: 'AI',
        content: error instanceof Error ? error.message : '응답 중 오류가 발생했습니다.',
        created_at: new Date().toISOString(),
        ai_code: 'CSR',
        status: 'WAIT_FOR_SYNC',
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setSending(false);
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
                      {session.title}
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
              {activeSession?.title ?? '세션을 선택하세요'}
            </h1>
          </div>
          <Link
            to="/approve"
            className="px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-[#534AB7] hover:bg-[#4A42A6]"
          >
            HMN 승인
          </Link>
        </header>

        <section className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-sm text-slate-500">대화를 시작해 주세요.</div>
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
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              placeholder="메시지를 입력하세요..."
              className="flex-1 resize-none border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#534AB7]"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={sending || !activeSessionId || !input.trim()}
              className="w-10 h-10 shrink-0 rounded-full bg-[#534AB7] text-white disabled:opacity-40"
              aria-label="전송"
            >
              ↑
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            WAIT_FOR_SYNC 원칙 유지 · 최종 결정은 HMN 승인에서
          </p>
        </div>

        <footer className="h-9 bg-slate-900 text-slate-200 px-4 text-xs flex items-center gap-4">
          <span className={statusColor(health.proxy)}>8082 Proxy: {health.proxy}</span>
          <span className={statusColor(health.lmStudio)}>LM Studio: {health.lmStudio}</span>
          <span className={statusColor(health.nim)}>NIM: {health.nim}</span>
        </footer>
      </main>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SejongRecord, AiOpinion, Decision } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockRecords, mockOpinions } from '../mockData';

interface UseRecordsReturn {
  records: SejongRecord[];
  opinions: AiOpinion[];
  loading: boolean;
  error: string | null;
  source: 'supabase' | 'mock';
  decide: (recordId: string, decision: Decision, memo: string) => Promise<void>;
  refresh: () => Promise<void>;
}

async function fetchSupabaseData() {
  if (!supabase) return null;

  const [recordsRes, opinionsRes] = await Promise.all([
    supabase.from('records').select('*').order('created_at', { ascending: false }),
    supabase.from('ai_opinions').select('*').order('created_at', { ascending: true }),
  ]);

  if (recordsRes.error) {
    throw new Error(`Records 조회 실패: ${recordsRes.error.message}`);
  }
  if (opinionsRes.error) {
    throw new Error(`AI 의견 조회 실패: ${opinionsRes.error.message}`);
  }

  return {
    records: recordsRes.data as SejongRecord[],
    opinions: opinionsRes.data as AiOpinion[],
  };
}

const mockSejongRecords: SejongRecord[] = mockRecords.map((r) => ({ ...r, metadata: {} }));

export function useRecords(): UseRecordsReturn {
  const source = isSupabaseConfigured ? 'supabase' : 'mock';
  const [records, setRecords] = useState<SejongRecord[]>(source === 'mock' ? mockSejongRecords : []);
  const [opinions, setOpinions] = useState<AiOpinion[]>(source === 'mock' ? mockOpinions : []);
  const [loading, setLoading] = useState(source === 'supabase');
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (source !== 'supabase' || initialized.current) return;
    initialized.current = true;

    let cancelled = false;

    fetchSupabaseData()
      .then((data) => {
        if (cancelled || !data) return;
        setRecords(data.records);
        setOpinions(data.opinions);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (source === 'supabase') {
        const data = await fetchSupabaseData();
        if (data) {
          setRecords(data.records);
          setOpinions(data.opinions);
        }
      } else {
        setRecords(mockSejongRecords);
        setOpinions(mockOpinions);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 에러';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [source]);

  const decide = useCallback(
    async (recordId: string, decision: Decision, memo: string) => {
      setError(null);
      try {
        if (source === 'supabase' && supabase) {
          const { data, error: rpcError } = await supabase.rpc('make_hmn_decision', {
            p_record_id: recordId,
            p_decision: decision,
            p_memo: memo || null,
          });

          if (rpcError) {
            setError(`결정 실패: ${rpcError.message}`);
            return;
          }

          const result = data as { success: boolean; error?: string };
          if (!result.success) {
            setError(`결정 실패: ${result.error}`);
            return;
          }

          const freshData = await fetchSupabaseData();
          if (freshData) {
            setRecords(freshData.records);
            setOpinions(freshData.opinions);
          }
          return;
        }

        setRecords((prev) =>
          prev.map((r) =>
            r.record_id === recordId
              ? {
                  ...r,
                  status: decision,
                  hmn_memo: memo || null,
                  decided_at: new Date().toISOString(),
                }
              : r
          )
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 에러';
        setError(`결정 처리 중 예외 발생: ${message}`);
      }
    },
    [source]
  );

  return { records, opinions, loading, error, source, decide, refresh };
}

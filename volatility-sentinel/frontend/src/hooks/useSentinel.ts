import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface SentinelData {
  id: string;
  symbol: string;
  price: number;
  change_24h: number;
  volatility_score: number;
  volume_24h: number | null;
  last_updated: string;
}

export interface SentinelResponse {
  success: boolean;
  count: number;
  data: SentinelData[];
  meta: {
    source: string;
    refetch_interval_seconds: number;
    volatility_method: string;
  };
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function fetchSentinel(symbols: string[]): Promise<SentinelResponse> {
  if (!symbols.length) {
    throw new Error('No symbols provided');
  }
  const params = new URLSearchParams({ symbols: symbols.join(',') });
  const res = await fetch(`${API_BASE}/api/sentinel?${params.toString()}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export function useSentinel(
  symbols: string[],
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }
): UseQueryResult<SentinelResponse, Error> {
  return useQuery({
    queryKey: ['sentinel', symbols.sort().join(',')], // stable key
    queryFn: () => fetchSentinel(symbols),
    enabled: symbols.length > 0 && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 30000, // 30s background refetch
    staleTime: 15000, // 15s fresh
    gcTime: 5 * 60 * 1000, // 5min cache
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

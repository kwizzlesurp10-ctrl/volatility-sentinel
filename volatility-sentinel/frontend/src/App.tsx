import React, { useState, useEffect } from 'react';
import { useSentinel } from './hooks/useSentinel';
import { SettingsModal } from './components/SettingsModal';
import { Settings, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const DEFAULT_SYMBOLS = ['bitcoin', 'ethereum', 'solana'];

function Dashboard() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load saved symbols from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sentinel-symbols');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSymbols(parsed);
        }
      } catch {}
    }
  }, []);

  const { data, isLoading, isError, error, refetch, isFetching } = useSentinel(symbols, {
    refetchInterval: 30000,
  });

  const handleSymbolsChange = (newSymbols: string[]) => {
    setSymbols(newSymbols);
    setLastRefresh(new Date());
    // Invalidate query so it refetches immediately with new symbols
    queryClient.invalidateQueries({ queryKey: ['sentinel'] });
  };

  const handleManualRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 4 : 2,
    }).format(price);
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-crypto-accent' : 'text-crypto-red';
  };

  const getVolatilityColor = (score: number) => {
    if (score > 70) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (score > 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-crypto-accent/20 text-crypto-accent border-crypto-accent/30';
  };

  return (
    <div className="min-h-screen bg-crypto-dark text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-crypto-dark/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-crypto-accent to-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="font-semibold text-xl tracking-tight">volatility sentinel</div>
              <div className="text-[10px] text-white/50 -mt-1">REAL-TIME MARKET INTELLIGENCE</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs text-white/50 hidden md:block">
              Last updated: {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-xs font-mono tracking-[3px] mb-4">
              LIVE • 30s AUTO-REFRESH
            </div>
            <h1 className="text-5xl font-semibold tracking-tighter">Market Sentinel</h1>
            <p className="text-xl text-white/60 mt-2 max-w-md">
              Real-time prices and volatility intelligence for your portfolio
            </p>
          </div>
          <div className="mt-6 md:mt-0 text-right">
            <div className="text-sm text-white/50">Tracking {symbols.length} assets</div>
            <div className="text-xs text-white/40 font-mono mt-0.5">Powered by CoinGecko + React Query</div>
          </div>
        </div>

        {/* Status Bar */}
        {isError && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-300">
              Failed to fetch market data: {(error as Error)?.message || 'Unknown error'}. 
              The proxy may be waking up on Render (cold start ~30s).
            </div>
          </div>
        )}

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-crypto-card border border-white/10 rounded-3xl p-8 animate-pulse">
                <div className="h-6 w-24 bg-white/10 rounded mb-8" />
                <div className="h-12 w-40 bg-white/10 rounded mb-4" />
                <div className="flex gap-4">
                  <div className="h-8 w-20 bg-white/10 rounded" />
                  <div className="h-8 w-16 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.data?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((asset) => (
              <div
                key={asset.id}
                className="group bg-crypto-card border border-white/10 hover:border-white/30 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <div className="font-mono text-xs tracking-[2px] text-white/50 mb-1">{asset.id}</div>
                    <div className="text-3xl font-semibold tracking-tighter">{asset.symbol}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getVolatilityColor(asset.volatility_score)}`}>
                    VOL {asset.volatility_score}%
                  </div>
                </div>

                <div className="text-5xl font-semibold tracking-tighter tabular-nums mb-6">
                  {formatPrice(asset.price)}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className={`flex items-center gap-1.5 font-medium ${getChangeColor(asset.change_24h)}`}>
                    {asset.change_24h >= 0 ? '▲' : '▼'} {Math.abs(asset.change_24h)}%
                    <span className="text-white/40 text-xs ml-1">24h</span>
                  </div>

                  {asset.volume_24h && (
                    <div className="text-white/50 text-xs">
                      ${asset.volume_24h}M vol
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 text-[10px] text-white/40 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-crypto-accent animate-pulse" />
                  LIVE • Auto-refreshes every 30s
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-white/50">
            No data available. Try changing symbols in Settings.
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-16 text-center text-xs text-white/40">
          Data via CoinGecko • Volatility = scaled 24h change • Updates every 30 seconds • Built with ForgeAI
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeSymbols={symbols}
        onSymbolsChange={handleSymbolsChange}
      />

      {/* Devtools (only in development) */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;

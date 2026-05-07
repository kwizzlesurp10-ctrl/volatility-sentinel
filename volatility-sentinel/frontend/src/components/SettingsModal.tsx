import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSymbols: string[];
  onSymbolsChange: (symbols: string[]) => void;
}

const POPULAR_SYMBOLS = [
  { id: 'bitcoin', label: 'Bitcoin (BTC)' },
  { id: 'ethereum', label: 'Ethereum (ETH)' },
  { id: 'solana', label: 'Solana (SOL)' },
  { id: 'ripple', label: 'XRP (XRP)' },
  { id: 'cardano', label: 'Cardano (ADA)' },
  { id: 'avalanche-2', label: 'Avalanche (AVAX)' },
  { id: 'chainlink', label: 'Chainlink (LINK)' },
  { id: 'polkadot', label: 'Polkadot (DOT)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeSymbols,
  onSymbolsChange,
}) => {
  const [selected, setSelected] = useState<string[]>(activeSymbols);
  const [customSymbol, setCustomSymbol] = useState('');

  if (!isOpen) return null;

  const toggleSymbol = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const addCustom = () => {
    const trimmed = customSymbol.trim().toLowerCase();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected([...selected, trimmed]);
      setCustomSymbol('');
    }
  };

  const removeSymbol = (id: string) => {
    setSelected(selected.filter(s => s !== id));
  };

  const handleSave = () => {
    if (selected.length === 0) {
      alert('Please select at least one symbol');
      return;
    }
    onSymbolsChange(selected);
    onClose();
    // Persist to localStorage
    localStorage.setItem('sentinel-symbols', JSON.stringify(selected));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-crypto-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white">Sentinel Settings</h2>
            <p className="text-sm text-white/60 mt-1">Manage tracked assets</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Popular Symbols */}
          <div>
            <div className="text-sm font-medium text-white/80 mb-3">Popular Assets</div>
            <div className="grid grid-cols-1 gap-2">
              {POPULAR_SYMBOLS.map(({ id, label }) => (
                <label
                  key={id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(id)}
                    onChange={() => toggleSymbol(id)}
                    className="accent-crypto-accent w-4 h-4"
                  />
                  <span className="text-white text-sm flex-1">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Symbol */}
          <div>
            <div className="text-sm font-medium text-white/80 mb-3">Add Custom CoinGecko ID</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder="e.g. dogecoin, near"
                className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-crypto-accent"
              />
              <button
                onClick={addCustom}
                disabled={!customSymbol.trim()}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 rounded-xl transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            <p className="text-[10px] text-white/40 mt-1.5">Use exact CoinGecko coin ID (lowercase, hyphens)</p>
          </div>

          {/* Current Selection */}
          <div>
            <div className="text-sm font-medium text-white/80 mb-3 flex items-center justify-between">
              <span>Active Symbols ({selected.length})</span>
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 min-h-[44px]">
              {selected.length === 0 ? (
                <div className="text-white/40 text-sm italic">No symbols selected</div>
              ) : (
                selected.map(id => (
                  <div
                    key={id}
                    className="flex items-center gap-1.5 bg-white/10 text-white text-xs px-3 py-1 rounded-full"
                  >
                    {id}
                    <button onClick={() => removeSymbol(id)} className="hover:text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-crypto-accent text-black font-semibold hover:bg-[#16a34a] transition-colors text-sm"
          >
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
};

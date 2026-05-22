import { useState, useEffect } from 'react';
import { DollarSign, X, Check } from 'lucide-react';
import { useStore } from '../store.js';
import * as db from '../db/index.js';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const QuickRevenueButton = () => {
  const [isOpen,         setIsOpen]         = useState(false);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [amounts,        setAmounts]        = useState({});
  const [saved,          setSaved]          = useState(false);

  const agencies   = useStore(s => s.agencies);
  const creators   = useStore(s => s.creators);
  const addEarning = useStore(s => s.addEarning);

  const today = new Date().toISOString().split('T')[0];
  const todayDisplay = (() => {
    const d = new Date();
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  })();

  const activeAgency   = selectedAgency ?? agencies[0]?.id ?? null;
  const activeCreators = creators.filter(c => c.agency_id === activeAgency && c.is_active);

  // Pre-fill with today's existing values whenever modal opens or agency changes
  useEffect(() => {
    if (!isOpen) return;
    const newAmounts = {};
    activeCreators.forEach(creator => {
      const existing = db.getEarningsForCreator(creator.id, today);
      if (existing) newAmounts[creator.id] = String(existing.amount);
    });
    setAmounts(newAmounts);
  }, [isOpen, activeAgency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const h = e => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen]);

  const handleSave = () => {
    activeCreators.forEach(creator => {
      const amtStr = amounts[creator.id];
      if (amtStr !== undefined && amtStr !== '') {
        const amt = parseFloat(amtStr);
        if (!isNaN(amt) && amt >= 0) {
          addEarning(creator.id, today, amt);
        }
      }
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setIsOpen(false);
    }, 900);
  };

  const handleOpen = () => {
    setSaved(false);
    setIsOpen(true);
  };

  // Focus next input on Enter key
  const handleInputKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx < activeCreators.length - 1) {
        const inputs = document.querySelectorAll('.qre-input');
        if (inputs[idx + 1]) inputs[idx + 1].focus();
      } else {
        handleSave();
      }
    }
  };

  return (
    <>
      {/* FAB — sits above the brain-dump button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-[100px] right-lg w-12 h-12 bg-gradient-to-br from-accent-orange to-accent-pink text-white rounded-full shadow-glow-pink hover:shadow-glow-pink active:scale-95 transition-all flex items-center justify-center z-40 group"
        aria-label="Quick revenue entry"
        title="Quick Revenue Entry"
      >
        <DollarSign size={20} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Backdrop + modal */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed bottom-[100px] right-lg z-50 w-80 bg-bg-secondary border border-accent-orange/30 rounded-2xl shadow-2xl animate-scale-in overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-lg py-md border-b border-white/10 bg-gradient-to-r from-accent-orange/10 to-accent-pink/10">
              <div className="flex items-center gap-sm">
                <DollarSign size={15} className="text-accent-orange" />
                <span className="text-sm font-bold text-text-primary">Revenue — {todayDisplay}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-text-tertiary hover:text-text-primary transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Agency tabs (only when multiple) */}
            {agencies.length > 1 && (
              <div className="flex gap-xs px-lg py-sm border-b border-white/8 overflow-x-auto">
                {agencies.map(agency => (
                  <button key={agency.id} onClick={() => setSelectedAgency(agency.id)}
                    className={`text-xs px-md py-xs rounded-lg font-semibold whitespace-nowrap transition-all ${
                      agency.id === activeAgency
                        ? 'bg-accent-orange/80 text-white'
                        : 'bg-white/5 text-text-tertiary hover:text-text-primary hover:bg-white/10'
                    }`}>
                    {agency.name}
                  </button>
                ))}
              </div>
            )}

            {/* Creator inputs */}
            <div className="p-lg space-y-sm max-h-[50vh] overflow-y-auto">
              {activeCreators.length === 0 ? (
                <p className="text-text-tertiary text-sm text-center py-md">
                  No active creators for this agency.
                </p>
              ) : (
                activeCreators.map((creator, idx) => (
                  <div key={creator.id} className="flex items-center gap-sm">
                    <span className="text-sm text-text-primary font-medium flex-1 truncate">
                      {creator.stage_name}
                    </span>
                    <div className="flex items-center gap-xs shrink-0">
                      <span className="text-text-tertiary/50 text-xs font-mono">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amounts[creator.id] ?? ''}
                        onChange={e => setAmounts(a => ({ ...a, [creator.id]: e.target.value }))}
                        onKeyDown={e => handleInputKeyDown(e, idx)}
                        placeholder="0"
                        autoFocus={idx === 0}
                        className="qre-input w-24 bg-bg-primary/60 border border-white/10 rounded-lg px-sm py-xs text-text-primary text-sm font-mono focus:outline-none focus:border-accent-orange/50 placeholder-text-tertiary/30 text-right transition-all"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-sm px-lg pb-lg border-t border-white/8 pt-sm">
              <button onClick={() => setIsOpen(false)}
                className="flex-1 py-sm border border-white/10 text-text-secondary rounded-xl text-sm hover:text-text-primary hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saved || activeCreators.length === 0}
                className={`flex-1 py-sm font-bold rounded-xl text-sm flex items-center justify-center gap-xs transition-all ${
                  saved
                    ? 'bg-accent-lime/80 text-bg-primary'
                    : 'bg-gradient-to-r from-accent-orange to-accent-pink text-white hover:opacity-90 disabled:opacity-30'
                }`}>
                {saved ? <><Check size={14} /> Saved!</> : 'Save All'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default QuickRevenueButton;

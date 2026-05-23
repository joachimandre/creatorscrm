import { useState, useEffect } from 'react';
import { Plus, Brain, DollarSign, X, Check } from 'lucide-react';
import { useStore } from '../store.js';
import * as db from '../db/index.js';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Quick Note panel ───────────────────────────────────────────────────────────
const NotePanel = ({ onClose }) => {
  const [input, setInput] = useState('');

  const handleSave = () => {
    if (!input.trim()) return;
    db.addGeneralNote(input.trim());
    setInput('');
    onClose();
  };

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="w-72 neu-card rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
      <div className="flex items-center justify-between px-lg py-md border-b border-white/8">
        <div className="flex items-center gap-sm">
          <Brain size={14} className="text-accent-purple" />
          <span className="text-sm font-bold text-text-primary">Quick Note</span>
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="p-lg space-y-md">
        <textarea
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSave(); if (e.key === 'Escape') onClose(); }}
          placeholder="What's on your mind? (Ctrl+Enter to save)"
          rows={4}
          className="w-full rounded-xl px-md py-sm text-text-primary text-sm placeholder-text-tertiary/40 focus:outline-none resize-none"
        />
        <div className="flex gap-sm justify-end">
          <button onClick={onClose}
            className="px-md py-xs neu-btn rounded-xl text-xs text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!input.trim()}
            className="px-md py-xs bg-gradient-to-r from-accent-purple to-accent-pink text-white text-xs font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-30">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Quick Revenue panel ────────────────────────────────────────────────────────
const RevenuePanel = ({ onClose }) => {
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [saved, setSaved] = useState(false);

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

  useEffect(() => {
    const newAmounts = {};
    activeCreators.forEach(creator => {
      const existing = db.getEarningsForCreator(creator.id, today);
      if (existing) newAmounts[creator.id] = String(existing.amount);
    });
    setAmounts(newAmounts);
  }, [activeAgency]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = () => {
    activeCreators.forEach(creator => {
      const amtStr = amounts[creator.id];
      if (amtStr !== undefined && amtStr !== '') {
        const amt = parseFloat(amtStr);
        if (!isNaN(amt) && amt >= 0) addEarning(creator.id, today, amt);
      }
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

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
    <div className="w-80 neu-card rounded-2xl shadow-2xl animate-scale-in overflow-hidden border border-accent-orange/20">
      <div className="flex items-center justify-between px-lg py-md border-b border-white/8 bg-gradient-to-r from-accent-orange/8 to-accent-pink/8">
        <div className="flex items-center gap-sm">
          <DollarSign size={14} className="text-accent-orange" />
          <span className="text-sm font-bold text-text-primary">Revenue — {todayDisplay}</span>
        </div>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
          <X size={14} />
        </button>
      </div>

      {agencies.length > 1 && (
        <div className="flex gap-xs px-lg py-sm border-b border-white/8 overflow-x-auto">
          {agencies.map(agency => (
            <button key={agency.id} onClick={() => setSelectedAgency(agency.id)}
              className={`text-xs px-md py-xs rounded-lg font-semibold whitespace-nowrap transition-all ${
                agency.id === activeAgency ? 'bg-accent-orange/80 text-white' : 'neu-btn text-text-tertiary hover:text-text-primary'
              }`}>
              {agency.name}
            </button>
          ))}
        </div>
      )}

      <div className="p-lg space-y-sm max-h-[40vh] overflow-y-auto">
        {activeCreators.length === 0 ? (
          <p className="text-text-tertiary text-sm text-center py-md">No active creators for this agency.</p>
        ) : (
          activeCreators.map((creator, idx) => (
            <div key={creator.id} className="flex items-center gap-sm">
              <span className="text-sm text-text-primary font-medium flex-1 truncate">{creator.stage_name}</span>
              <div className="flex items-center gap-xs shrink-0">
                <span className="text-text-tertiary/50 text-xs font-mono">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={amounts[creator.id] ?? ''}
                  onChange={e => setAmounts(a => ({ ...a, [creator.id]: e.target.value }))}
                  onKeyDown={e => handleInputKeyDown(e, idx)}
                  placeholder="0" autoFocus={idx === 0}
                  className="qre-input w-24 rounded-lg px-sm py-xs text-text-primary text-sm font-mono focus:outline-none placeholder-text-tertiary/30 text-right transition-all"
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-sm px-lg pb-lg border-t border-white/8 pt-sm">
        <button onClick={onClose}
          className="flex-1 py-sm neu-btn text-text-secondary rounded-xl text-sm hover:text-text-primary transition-all">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saved || activeCreators.length === 0}
          className={`flex-1 py-sm font-bold rounded-xl text-sm flex items-center justify-center gap-xs transition-all ${
            saved ? 'bg-accent-lime/80 text-bg-primary' : 'bg-gradient-to-r from-accent-orange to-accent-pink text-white hover:opacity-90 disabled:opacity-30'
          }`}>
          {saved ? <><Check size={14} /> Saved!</> : 'Save All'}
        </button>
      </div>
    </div>
  );
};

// ─── Combined FAB ───────────────────────────────────────────────────────────────
const QuickActionFAB = () => {
  const [open,      setOpen]      = useState(false); // fan-out menu open
  const [panel,     setPanel]     = useState(null);  // 'note' | 'revenue' | null
  const [backdrop,  setBackdrop]  = useState(false);

  const openPanel = (which) => {
    setOpen(false);
    setPanel(which);
    setBackdrop(true);
  };

  const closePanel = () => {
    setPanel(null);
    setBackdrop(false);
  };

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') { setOpen(false); closePanel(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <>
      {/* Backdrop (only when a panel is open) */}
      {backdrop && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={closePanel} />
      )}

      {/* Fan-out backdrop (close fan on outside click) */}
      {open && !panel && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Panel anchored above the FAB */}
      {panel && (
        <div className="fixed bottom-[88px] right-lg z-50">
          {panel === 'note'    && <NotePanel    onClose={closePanel} />}
          {panel === 'revenue' && <RevenuePanel onClose={closePanel} />}
        </div>
      )}

      {/* Fan-out action buttons */}
      {open && !panel && (
        <div className="fixed bottom-[88px] right-lg z-50 flex flex-col items-end gap-sm animate-slide-up">
          <button
            onClick={() => openPanel('note')}
            className="flex items-center gap-sm px-md py-sm neu-card rounded-2xl text-sm font-semibold text-text-primary hover:shadow-neu-lg transition-all group">
            <span className="text-text-secondary group-hover:text-text-primary transition-colors text-xs">Quick note</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
              <Brain size={15} className="text-white" />
            </div>
          </button>
          <button
            onClick={() => openPanel('revenue')}
            className="flex items-center gap-sm px-md py-sm neu-card rounded-2xl text-sm font-semibold text-text-primary hover:shadow-neu-lg transition-all group">
            <span className="text-text-secondary group-hover:text-text-primary transition-colors text-xs">Log revenue</span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-orange to-accent-pink flex items-center justify-center">
              <DollarSign size={15} className="text-white" />
            </div>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => { if (panel) closePanel(); else setOpen(v => !v); }}
        className="fixed bottom-lg right-lg w-14 h-14 bg-gradient-to-br from-accent-cyan to-accent-blue text-bg-primary rounded-full shadow-glow hover:shadow-glow transition-all flex items-center justify-center z-50 dock-icon-btn"
        aria-label={open ? 'Close quick actions' : 'Quick actions'}
        aria-expanded={open}
      >
        <Plus
          size={24}
          className="transition-transform duration-200"
          style={{ transform: open || panel ? 'rotate(45deg)' : 'rotate(0deg)' }}
        />
      </button>
    </>
  );
};

export default QuickActionFAB;

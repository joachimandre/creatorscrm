import { useState } from 'react';
import { FileText, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

const Reports = () => {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className={`flex flex-col bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary ${fullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-lg py-sm border-b border-white/8 flex-shrink-0 bg-bg-primary/60 backdrop-blur-md">
        <div className="flex items-center gap-md">
          <FileText size={20} className="text-accent-pink" />
          <h1 className="text-lg font-bold text-text-primary">Report Builder</h1>
          <span className="text-xs px-sm py-xs rounded-full bg-accent-pink/15 text-accent-pink border border-accent-pink/30 font-semibold">
            HOTTTR
          </span>
          <span className="text-xs text-text-tertiary hidden sm:block">
            · PDF, plain text, Google Docs export
          </span>
        </div>
        <div className="flex items-center gap-sm">
          <button
            onClick={() => setFullscreen(v => !v)}
            className="flex items-center gap-xs px-md py-xs text-xs text-text-tertiary hover:text-text-primary border border-white/10 hover:border-white/20 rounded-lg transition-all"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {fullscreen ? 'Exit' : 'Fullscreen'}
          </button>
          <a
            href="/HOTTTR_Report_Builder.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-xs px-md py-xs text-xs text-text-tertiary hover:text-accent-cyan border border-white/10 hover:border-accent-cyan/30 rounded-lg transition-all"
          >
            <ExternalLink size={12} /> Open tab
          </a>
        </div>
      </div>

      {/* iframe */}
      <iframe
        src="/HOTTTR_Report_Builder.html"
        className="w-full flex-1 border-0"
        allow="clipboard-write; clipboard-read; downloads"
        title="HOTTTR Report Builder"
        style={{ minHeight: 0 }}
      />
    </div>
  );
};

export default Reports;

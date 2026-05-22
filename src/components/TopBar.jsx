import { Search, Bell, ChevronDown } from 'lucide-react';

const TopBar = () => {
  return (
    <header className="flex items-center justify-between px-xl py-md
      bg-bg-secondary/40 backdrop-blur-md border-b border-white/8 flex-shrink-0 h-[60px]">

      {/* Search pill */}
      <div className="flex items-center gap-sm bg-white/5 border border-white/8
        rounded-xl px-md py-sm max-w-xs w-full">
        <Search size={15} className="text-text-tertiary flex-shrink-0" />
        <input
          type="text"
          placeholder="Search here..."
          className="bg-transparent text-sm text-text-primary placeholder:text-text-tertiary/60
            flex-1 outline-none min-w-0"
        />
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-sm">
        {/* Notification bell */}
        <button
          className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/8
            flex items-center justify-center text-text-secondary
            hover:text-text-primary hover:bg-white/10 transition-all
            focus:outline-none focus:ring-2 focus:ring-accent-cyan/40"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {/* Notification dot */}
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full
            bg-accent-pink border border-bg-secondary" />
        </button>

        {/* User avatar */}
        <button className="flex items-center gap-sm group focus:outline-none" aria-label="User menu">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-pink
            flex items-center justify-center text-white text-xs font-bold shadow-glow-purple">
            M
          </div>
          <ChevronDown size={13} className="text-text-tertiary group-hover:text-text-primary transition-all" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;

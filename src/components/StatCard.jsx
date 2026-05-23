const StatCard = ({ label, value, sub, color = '#00d9ff', icon: Icon, chip, chipColor, mono = false, pulse = false }) => (
  <div className="neu-card p-lg relative overflow-hidden group">
    <div
      className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity rounded-2xl"
      style={{ background: `radial-gradient(circle at top right, ${color}, transparent 60%)` }}
    />
    {/* Top row */}
    <div className="flex items-start justify-between mb-md relative">
      {Icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}40, ${color}15)` }}
        >
          <Icon size={20} style={{ color }} className={pulse ? 'animate-pulse' : ''} />
        </div>
      )}
      {chip && (
        <span
          className="text-xs px-sm py-[3px] rounded-full font-semibold leading-none ml-auto"
          style={{ background: `${chipColor || color}25`, color: chipColor || color }}
        >
          {chip}
        </span>
      )}
    </div>
    {/* Value */}
    <p className={`text-2xl font-black text-text-primary relative ${mono ? 'font-mono' : ''}`}>{value}</p>
    {/* Label — sentence case, no uppercase */}
    <p className="text-xs font-medium text-text-tertiary mt-xs relative">{label}</p>
    {sub && <p className="text-xs text-text-tertiary/60 mt-xs relative">{sub}</p>}
  </div>
);

export default StatCard;

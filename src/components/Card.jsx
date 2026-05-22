import { clsx } from 'clsx';

const Card = ({ children, className = '', hoverable = false }) => {
  return (
    <div
      className={clsx(
        'bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-lg transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]',
        hoverable && 'hover:border-white/20 hover:from-white/[0.08] hover:to-white/[0.03] cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;

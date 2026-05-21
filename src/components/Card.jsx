import { clsx } from 'clsx';

const Card = ({ children, className = '', hoverable = false }) => {
  return (
    <div
      className={clsx(
        'bg-surface-1 rounded-lg border border-surface-2 p-lg transition-all',
        hoverable && 'hover:border-surface-1 hover:bg-surface-2 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;

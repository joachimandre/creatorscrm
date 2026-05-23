import { clsx } from 'clsx';

const Card = ({ children, className = '', hoverable = false }) => {
  return (
    <div
      className={clsx(
        'neu-card p-lg transition-all',
        hoverable && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;

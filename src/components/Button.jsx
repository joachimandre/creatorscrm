import { clsx } from 'clsx';

const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyles = 'rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:ring-offset-1 focus:ring-offset-bg-primary';

  const variants = {
    primary:   'bg-gradient-to-r from-accent-cyan to-accent-blue text-bg-primary hover:opacity-90 shadow-glow',
    secondary: 'bg-white/5 text-text-primary border border-white/10 hover:bg-white/10 hover:border-white/20',
    danger:    'bg-gradient-to-r from-accent-pink to-accent-orange/80 text-white hover:opacity-90',
    ghost:     'text-text-secondary hover:text-text-primary hover:bg-white/5',
  };

  const sizes = {
    sm: 'px-sm py-xs text-xs',
    md: 'px-lg py-sm text-sm',
    lg: 'px-xl py-md text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

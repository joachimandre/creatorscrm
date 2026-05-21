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
  const baseStyles = 'rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-accent-primary text-white hover:bg-blue-600 disabled:bg-accent-primary',
    secondary: 'bg-surface-1 text-text-primary border border-surface-2 hover:bg-surface-2',
    danger: 'bg-accent-danger text-white hover:bg-red-600 disabled:bg-accent-danger',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-1',
  };

  const sizes = {
    sm: 'px-sm py-xs text-sm',
    md: 'px-lg py-sm text-sm',
    lg: 'px-lg py-md text-base',
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

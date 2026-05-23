const EmptyState = ({ icon: Icon, title, subtitle, action, onAction }) => (
  <div className="flex flex-col items-center justify-center py-2xl neu-card-inset rounded-2xl text-center">
    {Icon && <Icon size={36} className="text-text-tertiary/20 mb-md" />}
    {title && <p className="text-text-secondary font-semibold text-sm">{title}</p>}
    {subtitle && <p className="text-text-tertiary/60 text-xs mt-xs">{subtitle}</p>}
    {action && onAction && (
      <button
        onClick={onAction}
        className="mt-md neu-btn px-lg py-sm rounded-xl text-xs text-text-tertiary hover:text-text-primary transition-colors"
      >
        {action}
      </button>
    )}
  </div>
);

export default EmptyState;

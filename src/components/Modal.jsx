import { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-lg"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="neu-card w-full max-w-md max-h-[90vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-lg border-b border-white/8 shrink-0">
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-xs hover:bg-white/5 rounded-lg text-text-secondary hover:text-text-primary transition-all"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-lg overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-lg border-t border-white/8 flex gap-sm justify-end shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

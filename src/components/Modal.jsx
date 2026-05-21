import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-lg">
      <div className="bg-surface-1 rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-lg border-b border-surface-2 bg-surface-1">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-sm hover:bg-surface-2 rounded-lg text-text-secondary hover:text-text-primary transition-all"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-lg">{children}</div>

        {/* Footer */}
        {footer && <div className="p-lg border-t border-surface-2 flex gap-sm justify-end bg-surface-1">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;

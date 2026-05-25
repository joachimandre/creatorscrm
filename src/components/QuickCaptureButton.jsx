import { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import * as db from '../db/index.js';

const QuickCaptureButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const handleCapture = () => {
    if (!input.trim()) return;
    db.addGeneralNote(input.trim());
    setInput('');
    setIsOpen(false);
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-lg right-lg w-16 h-16 bg-gradient-to-br from-accent-lime via-accent-cyan to-accent-blue text-bg-primary rounded-full shadow-glow hover:shadow-glow active:scale-95 transition-all flex items-center justify-center z-40 font-bold group animate-float"
        aria-label="Quick capture note"
        title="Quick capture"
      >
        <Plus size={28} className="group-hover:rotate-90 transition-transform" />
      </button>

      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Quick Capture"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)} size="sm">Cancel</Button>
            <Button onClick={handleCapture} size="sm">Save</Button>
          </>
        }
      >
        <div className="space-y-md">
          <p className="text-text-secondary text-sm">
            Capture a quick thought or idea. It will be saved to your general brain dump space.
          </p>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            placeholder="What's on your mind?"
            rows="5"
            className="w-full resize-none"
          />
        </div>
      </Modal>
    </>
  );
};

export default QuickCaptureButton;

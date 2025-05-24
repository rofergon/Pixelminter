import React from 'react';
import { X } from 'lucide-react';

interface AlertProps {
  message: string;
  onClose: () => void;
}

const Alert: React.FC<AlertProps> = ({ message, onClose }) => {
  return (
    <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in">
      <span>{message}</span>
      <button 
        type="button"
        onClick={onClose} 
        className="hover:bg-red-600 p-1 rounded"
        aria-label="Close alert"
        title="Close alert"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Alert; 
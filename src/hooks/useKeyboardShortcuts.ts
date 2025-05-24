import { useEffect } from 'react';

interface KeyboardShortcutProps {
  // eslint-disable-next-line no-unused-vars
  handleHistoryAction: (action: 'undo' | 'redo') => void;
  // Aquí puedes agregar más props para futuros atajos
}

export const useKeyboardShortcuts = ({
  handleHistoryAction,
}: KeyboardShortcutProps) => {
  useEffect(() => {
    const handleKeyboardShortcut = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            // Ctrl+Shift+Z o Cmd+Shift+Z para Redo
            handleHistoryAction('redo');
          } else {
            // Ctrl+Z o Cmd+Z para Undo
            handleHistoryAction('undo');
          }
        } else if (e.key === 'y' && !isMac) {
          // Ctrl+Y para Redo (solo en Windows/Linux)
          e.preventDefault();
          handleHistoryAction('redo');
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [handleHistoryAction]);
}; 
import { useEffect } from 'react';
import { useArtifactStore } from '@/lib/store/artifact-store';

export function useKeyboardShortcuts() {
  const { selectedVariant, selectVariant, currentVariantSet, previewArtifact } = useArtifactStore();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when Cmd/Ctrl is pressed
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      // Variant switching: Cmd/Ctrl + 1/2/3
      if (['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const variant = Number(e.key) as 1 | 2 | 3;
        if (currentVariantSet) {
          selectVariant(variant);
        }
        return;
      }

      // Deploy: Cmd/Ctrl + Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        if (previewArtifact) {
          // Trigger deploy action
          const deployButton = document.querySelector('[data-action="deploy"]') as HTMLButtonElement;
          deployButton?.click();
        }
        return;
      }

      // Copy code: Cmd/Ctrl + Shift + C
      if (e.key === 'c' && e.shiftKey) {
        e.preventDefault();
        if (previewArtifact) {
          navigator.clipboard.writeText(previewArtifact.code);
          // Show toast notification
          const event = new CustomEvent('toast', {
            detail: { message: 'Code copied to clipboard', type: 'success' }
          });
          window.dispatchEvent(event);
        }
        return;
      }

      // Focus refinement input: Cmd/Ctrl + K
      if (e.key === 'k') {
        e.preventDefault();
        const refinementInput = document.querySelector('[data-input="refinement"]') as HTMLInputElement;
        refinementInput?.focus();
        return;
      }

      // Show keyboard shortcuts: Cmd/Ctrl + /
      if (e.key === '/') {
        e.preventDefault();
        // Show shortcuts modal
        const event = new CustomEvent('show-shortcuts');
        window.dispatchEvent(event);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedVariant, selectVariant, currentVariantSet, previewArtifact]);
}

// Keyboard shortcuts reference component
export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { keys: ['⌘', '1'], description: 'Select Variant 1 (Minimal)' },
    { keys: ['⌘', '2'], description: 'Select Variant 2 (Balanced)' },
    { keys: ['⌘', '3'], description: 'Select Variant 3 (Advanced)' },
    { keys: ['⌘', '↵'], description: 'Deploy to ERPNext' },
    { keys: ['⌘', '⇧', 'C'], description: 'Copy code' },
    { keys: ['⌘', 'K'], description: 'Focus refinement input' },
    { keys: ['⌘', '/'], description: 'Show this help' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 text-xs font-semibold bg-gray-100 border border-gray-300 rounded"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
              <span className="text-sm text-gray-600">{shortcut.description}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const event = new CustomEvent('hide-shortcuts');
            window.dispatchEvent(event);
          }}
          className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}

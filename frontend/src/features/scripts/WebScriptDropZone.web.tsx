import type { DragEvent, ReactNode } from 'react';
import { useCallback } from 'react';

import { theme } from '../../shell/theme';

type Props = {
  disabled: boolean;
  children?: ReactNode;
  onAcceptedText: (text: string, sourceFileName: string) => void;
  onRejectedNonTxt?: () => void;
};

export function WebScriptDropZone({ disabled, children, onAcceptedText, onRejectedNonTxt }: Props) {
  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) {
        return;
      }
      const file = e.dataTransfer.files[0];
      if (!file) {
        return;
      }
      const name = file.name.trim() || 'script.txt';
      if (!name.toLowerCase().endsWith('.txt')) {
        onRejectedNonTxt?.();
        return;
      }
      const text = await file.text();
      onAcceptedText(text, name);
    },
    [disabled, onAcceptedText, onRejectedNonTxt],
  );

  return (
    <div
      onDragOver={onDragOver}
      onDrop={(ev) => void onDrop(ev)}
      style={{
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.borderLight,
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

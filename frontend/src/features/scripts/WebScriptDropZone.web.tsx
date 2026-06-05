import type { DragEvent, ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';

import { theme } from '../../shell/theme';

type Props = {
  disabled: boolean;
  children?: ReactNode;
  onAcceptedText: (text: string, sourceFileName: string) => void;
  onRejectedNonTxt?: () => void;
};

export function WebScriptDropZone({ disabled, children, onAcceptedText, onRejectedNonTxt }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const depthRef = useRef(0);

  const onDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) {
        return;
      }
      depthRef.current += 1;
      setIsDragging(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    depthRef.current -= 1;
    if (depthRef.current <= 0) {
      depthRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      depthRef.current = 0;
      setIsDragging(false);
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
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={(ev) => void onDrop(ev)}
      style={{
        width: '100%',
        borderRadius: theme.radiusMd,
        outline: isDragging ? `2px dashed ${theme.primaryAction}` : '2px solid transparent',
        outlineOffset: 2,
        transition: 'outline-color 0.12s ease',
      }}
    >
      {children}
    </div>
  );
}

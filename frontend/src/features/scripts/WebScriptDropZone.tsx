import type { ReactNode } from 'react';

type Props = {
  disabled: boolean;
  children?: ReactNode;
  onAcceptedText: (text: string, sourceFileName: string) => void;
  onRejectedNonTxt?: () => void;
};

export function WebScriptDropZone(_props: Props): null {
  return null;
}

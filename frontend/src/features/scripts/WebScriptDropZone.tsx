import type { ReactNode } from 'react';
import { Fragment } from 'react';

type Props = {
  disabled: boolean;
  children?: ReactNode;
  onAcceptedText: (text: string, sourceFileName: string) => void;
  onRejectedNonTxt?: () => void;
};

export function WebScriptDropZone({ children }: Props): ReactNode {
  return <Fragment>{children}</Fragment>;
}

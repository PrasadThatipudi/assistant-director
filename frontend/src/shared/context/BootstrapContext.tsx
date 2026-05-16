import { createContext, useContext } from 'react';

export type BootstrapState = 'loading' | 'success' | 'failed' | 'offline' | 'retrying';

export interface BootstrapContextValue {
  bootstrapState: BootstrapState;
  isBootstrapComplete: boolean;
  canPerformOperations: boolean;
  isOfflineMode: boolean;
}

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

export function useBootstrap(): BootstrapContextValue {
  const context = useContext(BootstrapContext);
  if (!context) {
    throw new Error('useBootstrap must be used within a BootstrapProvider');
  }
  return context;
}

export { BootstrapContext };

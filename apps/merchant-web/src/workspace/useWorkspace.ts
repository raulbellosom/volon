import { use } from 'react';
import { WorkspaceContext, type WorkspaceValue } from './WorkspaceProvider.tsx';

export function useWorkspace(): WorkspaceValue {
  const value = use(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside <WorkspaceProvider>.');
  return value;
}

import { ArchiveError, type ArchiveInput, type Scope } from './contracts';
import type { IStorage } from '../storage';

export function archiveAuthorizer(storage: Pick<IStorage, 'getProject' | 'getOpening' | 'getDualScanSession'>) {
  return async (scope: Scope, input: ArchiveInput) => {
    const project = await storage.getProject(input.projectId, scope.organizationId);
    if (!project) throw new ArchiveError('project-not-found', 404);
    const opening = await storage.getOpening(input.openingId);
    if (!opening || opening.projectId !== project.id) throw new ArchiveError('opening-not-found', 404);
    const session = await storage.getDualScanSession(input.sessionId, scope.organizationId);
    if (!session || session.projectId !== project.id || session.openingId !== opening.id) throw new ArchiveError('session-not-found', 404);
    return { customerId: project.customerId ?? 'unassigned' };
  };
}

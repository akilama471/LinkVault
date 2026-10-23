import { domainModel } from '../models/domain.model';
import { domainService } from '../services/domain.service';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerDomainController() {
  registerSecureHandler('domains:getAll', () => {
    const domains = domainModel.getAll();
    return { success: true, data: domains };
  });

  registerSecureHandler('domains:refetch', async (_event, id: number) => {
    const domain = await domainService.refetchDomain(id);
    return { success: true, data: domain };
  });

  registerSecureHandler('domains:rename', (_event, id: number, newName: string) => {
    const domain = domainService.renameDomain(id, newName);
    return { success: true, data: domain };
  });

  registerSecureHandler('domains:delete', async (_event, id: number, deleteBookmarks: boolean) => {
    await domainService.deleteDomain(id, deleteBookmarks);
    return { success: true };
  });
}

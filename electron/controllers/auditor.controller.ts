import { registerSecureHandler } from '../utils/ipc.guard';
import { auditorService } from '../services/auditor.service';

export function registerAuditorController(): void {
  registerSecureHandler('auditor:startHealthCheck', async (_event, options?: { forceRecheck?: boolean; onlyFlagged?: boolean }) => {
    // Run asynchronously in background so IPC response returns immediately
    auditorService.startHealthCheck(options).catch(err => {
      console.error('[AuditorController] Health check execution error:', err);
    });
    return { success: true };
  });

  registerSecureHandler('auditor:stopHealthCheck', () => {
    auditorService.stopHealthCheck();
    return { success: true };
  });

  registerSecureHandler('auditor:getProgress', () => {
    return { success: true, data: auditorService.getProgress() };
  });

  registerSecureHandler('auditor:checkBookmark', async (_event, id: number) => {
    const res = await auditorService.checkBookmark(id);
    return { success: true, data: res };
  });

  registerSecureHandler('auditor:getSummary', () => {
    const summary = auditorService.getAuditSummary();
    return { success: true, data: summary };
  });

  registerSecureHandler('auditor:getDuplicates', () => {
    const duplicates = auditorService.getDuplicates();
    return { success: true, data: duplicates };
  });

  registerSecureHandler('auditor:mergeDuplicates', (_event, primaryId: number, duplicateIds: number[], moveToTrash = true) => {
    const result = auditorService.mergeDuplicates(primaryId, duplicateIds, moveToTrash);
    return { success: true, data: result };
  });
}

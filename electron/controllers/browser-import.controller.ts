import { browserImportService, SupportedBrowser } from '../services/browser-import.service';
import { enrichmentService } from '../services/enrichment.service';
import { registerSecureHandler } from '../utils/ipc.guard';

export function registerBrowserImportController() {
  registerSecureHandler('import:getProfiles', (_event, browser: SupportedBrowser) => {
    const profiles = browserImportService.getProfiles(browser);
    return { success: true, data: profiles };
  });

  registerSecureHandler('import:extract', (_event, browser: SupportedBrowser, profilePath: string) => {
    const bookmarks = browserImportService.extractBookmarks(browser, profilePath);
    return { success: true, data: bookmarks };
  });

  registerSecureHandler('import:execute', async (_event, bookmarks: { title: string; url: string }[]) => {
    const count = await browserImportService.importBookmarks(bookmarks);
    
    // Start background enrichment without awaiting it
    enrichmentService.startEnrichmentJob();
    
    return { success: true, data: count };
  });
}

import { Domain } from '../../src/types/models';
export declare class DomainService {
    /**
     * Retrieves an existing domain or creates a new one, fetching and caching the favicon if needed.
     */
    getOrCreateDomain(domainName: string, faviconUrl: string | null): Promise<Domain>;
    /**
     * Refetches the domain favicon and metadata from the internet.
     */
    refetchDomain(id: number): Promise<Domain>;
    /**
     * Renames the display name of a domain.
     */
    renameDomain(id: number, newName: string): Domain;
    /**
     * Deletes a domain, either keeping or deleting its associated bookmarks,
     * and cleans up unreferenced assets from disk.
     */
    deleteDomain(id: number, deleteBookmarks: boolean): Promise<void>;
}
export declare const domainService: DomainService;

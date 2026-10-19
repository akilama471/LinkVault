import { Domain } from '../../src/types/models';
export declare class DomainModel {
    findByDomain(domain: string): Domain | null;
    create(domain: string, faviconPath: string | null): Domain;
    updateFavicon(id: number, faviconPath: string | null): void;
    findById(id: number): Domain | null;
    updateDisplayName(id: number, displayName: string | null): Domain;
    delete(id: number): void;
    getAll(): Domain[];
}
export declare const domainModel: DomainModel;

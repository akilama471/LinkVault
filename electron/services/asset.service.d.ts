import { AssetStorageStats, VacuumResult } from '../../src/types/models';
export declare class AssetService {
    private readonly assetsDir;
    constructor();
    private ensureDirectory;
    /**
     * Generates a unique filename for an asset
     */
    private generateFilename;
    /**
     * Downloads an image from a URL and saves it to the local filesystem
     * Returns the relative path to the saved asset
     */
    downloadImage(url: string, prefix?: string, sourceUrl?: string): Promise<string | null>;
    /**
     * Generates a small thumbnail from an existing local image
     */
    generateThumbnail(sourceFilename: string): Promise<string | null>;
    /**
     * Resolves a relative asset filename to an absolute path for the renderer to display (via custom protocol or file://)
     */
    getAssetAbsolutePath(filename: string): string;
    /**
     * Deletes a single asset file from userData/assets if it exists on disk.
     */
    deleteAsset(filename: string | null | undefined): Promise<boolean>;
    /**
     * Checks whether a given asset filename is actively referenced in the database
     * by any bookmark (as thumbnail or preview) or by any domain (as favicon).
     */
    isAssetReferenced(filename: string | null | undefined): boolean;
    /**
     * Retrieves a Set of all asset filenames referenced by any database record.
     */
    getAllReferencedAssetFilenames(): Set<string>;
    /**
     * Deletes an asset file from disk if no active bookmark or domain references it.
     */
    deleteAssetIfUnreferenced(filename: string | null | undefined): Promise<boolean>;
    /**
     * Batch deletes multiple assets from disk if they are not referenced in the database.
     */
    deleteAssetsIfUnreferenced(filenames: (string | null | undefined)[]): Promise<number>;
    /**
     * Scans the assets directory and returns real-time storage statistics,
     * distinguishing between active referenced assets and unreferenced orphans.
     */
    getStorageStats(): Promise<AssetStorageStats>;
    /**
     * Deletes all unreferenced orphan files from userData/assets and reclaims disk space.
     */
    pruneOrphanAssets(): Promise<VacuumResult>;
}
export declare const assetService: AssetService;

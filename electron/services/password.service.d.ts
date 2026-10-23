export declare class PasswordService {
    private readonly vaultPath;
    private currentKey;
    private isAuthenticated;
    constructor();
    private getVaultMeta;
    private getLegacyStoredHash;
    hasPasswordSet(): boolean;
    isAuth(): boolean;
    setPassword(password: string): Promise<boolean>;
    removePassword(): Promise<boolean>;
    verifyPassword(password: string): Promise<boolean>;
    lock(): Promise<void>;
    shutdown(): Promise<void>;
    checkAuth(): void;
}
export declare const passwordService: PasswordService;

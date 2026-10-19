export declare class PasswordService {
    private readonly ITERATIONS;
    private readonly KEY_LEN;
    private readonly DIGEST;
    private isAuthenticated;
    private getStoredHash;
    private setStoredHash;
    hasPasswordSet(): boolean;
    setPassword(password: string): Promise<boolean>;
    removePassword(): Promise<boolean>;
    verifyPassword(password: string): Promise<boolean>;
    lock(): void;
    checkAuth(): void;
}
export declare const passwordService: PasswordService;

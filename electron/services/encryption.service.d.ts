export interface VaultMetadata {
    version: number;
    algorithm: string;
    iterations: number;
    salt: string;
    verifierHash: string;
    encryptedAt: string;
}
export declare class EncryptionService {
    private static readonly MAGIC;
    private static readonly IV_LEN;
    private static readonly TAG_LEN;
    private static readonly KEY_LEN;
    private static readonly ITERATIONS;
    private static readonly DIGEST;
    /**
     * Derives a 256-bit encryption key and verification hash from password and salt.
     */
    deriveMasterKey(password: string, saltHex: string): Promise<{
        key: Buffer;
        verifierHash: string;
    }>;
    /**
     * Generates a new 16-byte cryptographically secure salt.
     */
    generateSalt(): string;
    /**
     * Encrypts a file using authenticated AES-256-GCM.
     * Container format: [MAGIC: 6 bytes][IV: 12 bytes][TAG: 16 bytes][CIPHERTEXT...]
     */
    encryptFile(sourcePath: string, destPath: string, key: Buffer): Promise<void>;
    /**
     * Decrypts an authenticated AES-256-GCM encrypted file.
     */
    decryptFile(sourcePath: string, destPath: string, key: Buffer): Promise<void>;
    /**
     * Securely overwrites a file with random cryptographic bytes before unlinking.
     */
    secureShredFile(filePath: string): Promise<void>;
}
export declare const encryptionService: EncryptionService;

import crypto from 'node:crypto';
import fs from 'node:fs';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(crypto.pbkdf2);

export interface VaultMetadata {
  version: number;
  algorithm: string;
  iterations: number;
  salt: string; // hex
  verifierHash: string; // hex (hash of key to quickly verify without touching db if needed)
  encryptedAt: string; // ISO date
}

export class EncryptionService {
  private static readonly MAGIC = Buffer.from('LVENC1', 'utf8'); // 6 bytes
  private static readonly IV_LEN = 12; // 12 bytes for AES-GCM
  private static readonly TAG_LEN = 16; // 16 bytes for AES-GCM tag
  private static readonly KEY_LEN = 32; // 256 bits for AES-256
  private static readonly ITERATIONS = 100000;
  private static readonly DIGEST = 'sha512';

  /**
   * Derives a 256-bit encryption key and verification hash from password and salt.
   */
  public async deriveMasterKey(password: string, saltHex: string): Promise<{ key: Buffer; verifierHash: string }> {
    const salt = Buffer.from(saltHex, 'hex');
    // Derive 64 bytes: first 32 bytes for AES-256 key, next 32 bytes for verifier hash
    const derived = await pbkdf2Async(password, salt, EncryptionService.ITERATIONS, 64, EncryptionService.DIGEST);
    const key = derived.subarray(0, EncryptionService.KEY_LEN);
    const verifierHash = derived.subarray(EncryptionService.KEY_LEN, 64).toString('hex');
    return { key, verifierHash };
  }

  /**
   * Generates a new 16-byte cryptographically secure salt.
   */
  public generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Encrypts a file using authenticated AES-256-GCM.
   * Container format: [MAGIC: 6 bytes][IV: 12 bytes][TAG: 16 bytes][CIPHERTEXT...]
   */
  public async encryptFile(sourcePath: string, destPath: string, key: Buffer): Promise<void> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }

    const fileContent = await fs.promises.readFile(sourcePath);
    const iv = crypto.randomBytes(EncryptionService.IV_LEN);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const ciphertext = Buffer.concat([cipher.update(fileContent), cipher.final()]);
    const tag = cipher.getAuthTag();

    const outputBuffer = Buffer.concat([
      EncryptionService.MAGIC,
      iv,
      tag,
      ciphertext
    ]);

    // Atomic write via temp file
    const tempDest = `${destPath}.tmp.${Date.now()}`;
    await fs.promises.writeFile(tempDest, outputBuffer);
    if (fs.existsSync(destPath)) {
      await fs.promises.unlink(destPath);
    }
    await fs.promises.rename(tempDest, destPath);
  }

  /**
   * Decrypts an authenticated AES-256-GCM encrypted file.
   */
  public async decryptFile(sourcePath: string, destPath: string, key: Buffer): Promise<void> {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Encrypted source file not found: ${sourcePath}`);
    }

    const encryptedData = await fs.promises.readFile(sourcePath);
    const headerLen = EncryptionService.MAGIC.length + EncryptionService.IV_LEN + EncryptionService.TAG_LEN;

    if (encryptedData.length < headerLen) {
      throw new Error('Encrypted file header is corrupted or too short');
    }

    const magic = encryptedData.subarray(0, EncryptionService.MAGIC.length);
    if (!magic.equals(EncryptionService.MAGIC)) {
      throw new Error('Unrecognized encrypted container magic header');
    }

    let offset = EncryptionService.MAGIC.length;
    const iv = encryptedData.subarray(offset, offset + EncryptionService.IV_LEN);
    offset += EncryptionService.IV_LEN;
    const tag = encryptedData.subarray(offset, offset + EncryptionService.TAG_LEN);
    offset += EncryptionService.TAG_LEN;
    const ciphertext = encryptedData.subarray(offset);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    try {
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      // Atomic write to destination
      const tempDest = `${destPath}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tempDest, plaintext);
      if (fs.existsSync(destPath)) {
        await fs.promises.unlink(destPath);
      }
      await fs.promises.rename(tempDest, destPath);
    } catch (err: any) {
      throw new Error(`Decryption failed: Invalid master password or corrupted database (MAC verification error: ${err.message})`);
    }
  }

  /**
   * Securely overwrites a file with random cryptographic bytes before unlinking.
   */
  public async secureShredFile(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) return;
      const stats = await fs.promises.stat(filePath);
      const fd = await fs.promises.open(filePath, 'r+');
      try {
        if (stats.size > 0) {
          const zeroBuffer = crypto.randomBytes(Math.min(stats.size, 65536));
          let written = 0;
          while (written < stats.size) {
            const chunk = Math.min(zeroBuffer.length, stats.size - written);
            await fd.write(zeroBuffer, 0, chunk, written);
            written += chunk;
          }
          await fd.sync();
        }
      } finally {
        await fd.close();
      }
      await fs.promises.unlink(filePath);
    } catch (err) {
      console.warn(`[EncryptionService] Failed to shred file ${filePath}:`, err);
      // Fallback simple delete if shred fails
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch {}
    }
  }
}

export const encryptionService = new EncryptionService();

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { promisify } from 'node:util';
import { dbManager } from '../database/db';
import { encryptionService, VaultMetadata } from './encryption.service';

export class PasswordService {
  private readonly vaultPath: string;
  private currentKey: Buffer | null = null;
  private isAuthenticated = false;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.vaultPath = path.join(userDataPath, 'vault.meta.json');
  }

  private getVaultMeta(): VaultMetadata | null {
    try {
      if (fs.existsSync(this.vaultPath)) {
        const content = fs.readFileSync(this.vaultPath, 'utf8');
        return JSON.parse(content) as VaultMetadata;
      }
    } catch (err) {
      console.error('[PasswordService] Failed to read vault metadata:', err);
    }
    return null;
  }

  private getLegacyStoredHash(): string | null {
    if (!dbManager.isDatabaseOpen()) return null;
    try {
      const db = dbManager.getDb();
      const row = db.prepare("SELECT value FROM application_settings WHERE key = 'password_hash'").get() as { value: string } | undefined;
      return row ? row.value : null;
    } catch {
      return null;
    }
  }

  public hasPasswordSet(): boolean {
    if (fs.existsSync(this.vaultPath) || dbManager.isEncryptedAtRest()) {
      return true;
    }
    return this.getLegacyStoredHash() !== null;
  }

  public isAuth(): boolean {
    if (!this.hasPasswordSet()) {
      return true;
    }
    return this.isAuthenticated;
  }

  public async setPassword(password: string): Promise<boolean> {
    if (this.hasPasswordSet() && !this.isAuthenticated) {
      throw new Error('Must be authenticated to change password');
    }

    const salt = encryptionService.generateSalt();
    const { key, verifierHash } = await encryptionService.deriveMasterKey(password, salt);

    const vaultMeta: VaultMetadata = {
      version: 1,
      algorithm: 'aes-256-gcm',
      iterations: 100000,
      salt,
      verifierHash,
      encryptedAt: new Date().toISOString()
    };

    await fs.promises.writeFile(this.vaultPath, JSON.stringify(vaultMeta, null, 2), 'utf8');

    // Remove legacy hash if present
    if (dbManager.isDatabaseOpen()) {
      try {
        dbManager.getDb().prepare("DELETE FROM application_settings WHERE key = 'password_hash'").run();
      } catch {}
    }

    this.currentKey = key;
    this.isAuthenticated = true; // Auto-authenticate after setting
    return true;
  }

  public async removePassword(): Promise<boolean> {
    if (this.hasPasswordSet() && !this.isAuthenticated) {
      throw new Error('Must be authenticated to remove password');
    }

    // Ensure database is unencrypted and open
    if (dbManager.isEncryptedAtRest() && !dbManager.isDatabaseOpen() && this.currentKey) {
      await dbManager.unlockAndOpen(this.currentKey);
    }

    dbManager.removeEncryptionAtRest();

    if (fs.existsSync(this.vaultPath)) {
      await fs.promises.unlink(this.vaultPath);
    }

    if (dbManager.isDatabaseOpen()) {
      try {
        dbManager.getDb().prepare("DELETE FROM application_settings WHERE key = 'password_hash'").run();
      } catch {}
    }

    this.currentKey = null;
    this.isAuthenticated = true;
    return true;
  }

  public async verifyPassword(password: string): Promise<boolean> {
    // 1. Check AES-GCM Vault Metadata
    const vaultMeta = this.getVaultMeta();
    if (vaultMeta) {
      const { key, verifierHash } = await encryptionService.deriveMasterKey(password, vaultMeta.salt);
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(vaultMeta.verifierHash, 'hex'),
        Buffer.from(verifierHash, 'hex')
      );

      if (isMatch) {
        this.currentKey = key;
        // Unlock encrypted SQLite database if locked at rest
        if (!dbManager.isDatabaseOpen()) {
          await dbManager.unlockAndOpen(key);
        }
        this.isAuthenticated = true;
        return true;
      }
      return false;
    }

    // 2. Check Legacy PBKDF2 hash for seamless upgrade
    const legacyHash = this.getLegacyStoredHash();
    if (legacyHash) {
      const [salt, hash] = legacyHash.split(':');
      const pbkdf2Async = promisify(crypto.pbkdf2);
      const verifyHashBuffer = await pbkdf2Async(password, salt, 100000, 64, 'sha512');
      const verifyHash = verifyHashBuffer.toString('hex');

      if (crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'))) {
        // Upgrade legacy hash to modern AES-256-GCM vault metadata
        await this.setPassword(password);
        this.isAuthenticated = true;
        return true;
      }
      return false;
    }

    throw new Error('No password is set');
  }

  public async lock(): Promise<void> {
    this.isAuthenticated = false;
    if (this.hasPasswordSet() && this.currentKey) {
      await dbManager.lockAndEncrypt(this.currentKey);
      this.currentKey = null;
    }
  }

  public async shutdown(): Promise<void> {
    if (this.hasPasswordSet() && this.currentKey) {
      await dbManager.lockAndEncrypt(this.currentKey);
      this.currentKey = null;
    } else {
      dbManager.close();
    }
  }

  public checkAuth(): void {
    if (this.hasPasswordSet() && !this.isAuthenticated) {
      throw new Error('UNAUTHORIZED');
    }
  }
}

export const passwordService = new PasswordService();

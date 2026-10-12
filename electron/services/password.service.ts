import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { dbManager } from '../database/db';

export class PasswordService {
  private readonly ITERATIONS = 100000;
  private readonly KEY_LEN = 64;
  private readonly DIGEST = 'sha512';
  private isAuthenticated = false;

  private getStoredHash(): string | null {
    const db = dbManager.getDb();
    const row = db.prepare("SELECT value FROM application_settings WHERE key = 'password_hash'").get() as { value: string } | undefined;
    return row ? row.value : null;
  }

  private setStoredHash(hash: string): void {
    const db = dbManager.getDb();
    db.prepare(`
      INSERT INTO application_settings (key, value) 
      VALUES ('password_hash', ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(hash);
  }

  public hasPasswordSet(): boolean {
    return this.getStoredHash() !== null;
  }

  public async setPassword(password: string): Promise<boolean> {
    if (this.hasPasswordSet() && !this.isAuthenticated) {
      throw new Error('Must be authenticated to change password');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const pbkdf2Async = promisify(crypto.pbkdf2);
    const hashBuffer = await pbkdf2Async(password, salt, this.ITERATIONS, this.KEY_LEN, this.DIGEST);
    const hash = hashBuffer.toString('hex');
    const storedValue = `${salt}:${hash}`;
    
    this.setStoredHash(storedValue);
    this.isAuthenticated = true; // Auto-authenticate after setting
    return true;
  }

  public async removePassword(): Promise<boolean> {
    if (this.hasPasswordSet() && !this.isAuthenticated) {
      throw new Error('Must be authenticated to remove password');
    }

    const db = dbManager.getDb();
    db.prepare("DELETE FROM application_settings WHERE key = 'password_hash'").run();
    this.isAuthenticated = true;
    return true;
  }

  public async verifyPassword(password: string): Promise<boolean> {
    const storedHash = this.getStoredHash();
    if (!storedHash) {
      throw new Error('No password is set');
    }

    const [salt, hash] = storedHash.split(':');
    const pbkdf2Async = promisify(crypto.pbkdf2);
    const verifyHashBuffer = await pbkdf2Async(password, salt, this.ITERATIONS, this.KEY_LEN, this.DIGEST);
    const verifyHash = verifyHashBuffer.toString('hex');
    
    if (crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'))) {
      this.isAuthenticated = true;
      return true;
    }
    
    return false;
  }

  public lock(): void {
    this.isAuthenticated = false;
  }

  public checkAuth(): void {
    if (this.hasPasswordSet() && !this.isAuthenticated) {
      throw new Error('UNAUTHORIZED');
    }
  }
}

export const passwordService = new PasswordService();

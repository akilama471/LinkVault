import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { passwordService } from '../services/password.service';

export interface GuardOptions {
  /**
   * If true (default), requires master password authentication if a password is set.
   * If false, allows unauthenticated callers (e.g. login, check password status).
   */
  requiresAuth?: boolean;
  /**
   * Optional name or tag for logging and auditing.
   */
  auditName?: string;
}

export type IpcHandler<T = any> = (event: IpcMainInvokeEvent, ...args: any[]) => Promise<T> | T;

export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  canceled?: boolean;
  count?: number;
}

/**
 * Creates a guarded IPC handler function that verifies authentication and normalizes errors and responses.
 */
export function secureHandler<T = any>(
  handler: IpcHandler<T>,
  options: GuardOptions = { requiresAuth: true }
): (event: IpcMainInvokeEvent, ...args: any[]) => Promise<IpcResponse<T>> {
  return async (event: IpcMainInvokeEvent, ...args: any[]): Promise<IpcResponse<T>> => {
    try {
      if (options.requiresAuth !== false) {
        passwordService.checkAuth();
      }

      const result = await handler(event, ...args);

      // If the handler already returned a formatted IpcResponse object
      if (result !== null && typeof result === 'object' && 'success' in result) {
        return result as IpcResponse<T>;
      }

      // If handler returned undefined/void
      if (result === undefined) {
        return { success: true };
      }

      // Wrap raw return value in standard response format
      return { success: true, data: result };
    } catch (error: any) {
      const isAuthError = error?.message === 'UNAUTHORIZED';
      if (isAuthError) {
        console.warn(`[IPC Guard] Blocked unauthorized call to protected endpoint (requires master password)`);
      } else {
        console.error(`[IPC Guard] Error in IPC handler${options.auditName ? ` [${options.auditName}]` : ''}:`, error);
      }

      return {
        success: false,
        error: error?.message || 'Operation failed',
        code: isAuthError ? 'UNAUTHORIZED' : (error?.code || 'OPERATION_FAILED')
      };
    }
  };
}

/**
 * Unified helper to register a guarded IPC handler with ipcMain.handle.
 * Defaults to requiring master password authentication if configured.
 */
export function registerSecureHandler<T = any>(
  channel: string,
  handler: IpcHandler<T>,
  options: GuardOptions = { requiresAuth: true }
): void {
  const auditOptions: GuardOptions = {
    ...options,
    auditName: options.auditName || channel
  };
  ipcMain.handle(channel, secureHandler(handler, auditOptions));
}

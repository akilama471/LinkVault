import { IpcMainInvokeEvent } from 'electron';
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
export declare function secureHandler<T = any>(handler: IpcHandler<T>, options?: GuardOptions): (event: IpcMainInvokeEvent, ...args: any[]) => Promise<IpcResponse<T>>;
/**
 * Unified helper to register a guarded IPC handler with ipcMain.handle.
 * Defaults to requiring master password authentication if configured.
 */
export declare function registerSecureHandler<T = any>(channel: string, handler: IpcHandler<T>, options?: GuardOptions): void;

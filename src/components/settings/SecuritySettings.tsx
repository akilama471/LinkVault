import React, { useState } from 'react';
import { KeyRound, Check, AlertCircle } from 'lucide-react';

interface SecuritySettingsProps {
  hasPassword: boolean;
  onSetPassword: (password: string) => Promise<boolean>;
  onRemovePassword?: () => Promise<boolean>;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ 
  hasPassword, 
  onSetPassword,
  onRemovePassword 
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'removed' | 'error' | 'invalid_current' | 'missing_current_for_remove'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      return;
    }

    if (hasPassword) {
      // @ts-ignore
      const verifyRes = await window.electronAPI.auth.verifyPassword(currentPassword);
      if (!verifyRes.success) {
        setStatus('invalid_current');
        return;
      }
    }

    const success = await onSetPassword(password);
    if (success) {
      setStatus('success');
      setPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } else {
      setStatus('error');
    }
  };

  const handleRemove = async () => {
    if (!currentPassword) {
      setStatus('missing_current_for_remove');
      return;
    }

    // @ts-ignore
    const verifyRes = await window.electronAPI.auth.verifyPassword(currentPassword);
    if (!verifyRes.success) {
      setStatus('invalid_current');
      return;
    }

    if (onRemovePassword) {
      const success = await onRemovePassword();
      if (success) {
        setStatus('removed');
        setCurrentPassword('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setStatus('error');
      }
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
          <p className="text-gray-500 text-sm">Set a password or 4-digit PIN to protect your bookmarks.</p>
        </div>
      </div>

      {hasPassword && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900">
          <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Master Password & AES-256-GCM Vault Protection Active</p>
            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
              Your bookmarks database is encrypted at rest using authenticated AES-256-GCM. When the app is locked or exited, plaintext files are securely shredded, and all IPC mutation channels require authentication.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {hasPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password or PIN</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setStatus('idle'); }}
              placeholder="Enter current password or PIN"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {hasPassword ? 'New Password or PIN' : 'Password or PIN'}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setStatus('idle'); }}
            placeholder="Enter new password or PIN"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {hasPassword ? 'Confirm New Password or PIN' : 'Confirm Password or PIN'}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setStatus('idle'); }}
            placeholder="Confirm password or PIN"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Passwords do not match or an error occurred.</span>
          </div>
        )}

        {status === 'invalid_current' && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Current password is incorrect.</span>
          </div>
        )}

        {status === 'missing_current_for_remove' && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Please enter your current password or PIN above to remove protection.</span>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            <span>Password updated successfully!</span>
          </div>
        )}

        {status === 'removed' && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            <span>Password protection has been removed.</span>
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!password || !confirmPassword}
            className="bg-blue-600 text-white font-medium px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {hasPassword ? 'Change Password' : 'Set Password'}
          </button>

          {hasPassword && onRemovePassword && (
            <button
              type="button"
              onClick={handleRemove}
              className="bg-red-50 text-red-700 border border-red-200 font-medium px-5 py-2 rounded-lg hover:bg-red-100 transition-colors"
            >
              Remove Protection
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

import React from 'react';
import { Globe, Compass } from 'lucide-react';

interface BrowserIconProps {
  name: string;
  className?: string;
}

export const BrowserIcon: React.FC<BrowserIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'Google Chrome':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="10" fill="#EA4335" />
          <path d="M12 2C15.6 2 18.7 4 20.4 7L12 7A5 5 0 0 0 7.6 14.5L3.4 7.2A10 10 0 0 1 12 2Z" fill="#EA4335" />
          <path d="M20.4 7A10 10 0 0 1 18.2 19.5L14 12.2A5 5 0 0 0 12 7L20.4 7Z" fill="#FBBC05" />
          <path d="M18.2 19.5A10 10 0 0 1 3.8 16.8L8 9.5A5 5 0 0 0 14 12.2L18.2 19.5Z" fill="#34A853" />
          <circle cx="12" cy="12" r="4.5" fill="#FFFFFF" />
          <circle cx="12" cy="12" r="3.5" fill="#4285F4" />
        </svg>
      );

    case 'Mozilla Firefox':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="10" fill="#FF7139" />
          <path d="M12 2a10 10 0 0 0-4 18.8c.8.2 1.4-.4 1.4-1 0-.6-.3-1.4-.2-2.2.2-1.5 1.5-2.6 3-2.6 1.8 0 3.2 1.4 3.2 3.2 0 1.2-.6 2.3-1.6 2.8 3.5-1 6.2-4.2 6.2-8a10 10 0 0 0-8-11z" fill="#FF9400" />
          <circle cx="12.5" cy="12.5" r="4" fill="#00539F" opacity="0.85" />
        </svg>
      );

    case 'Microsoft Edge':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 4.1 2.5 7.6 6 9.1-.5-1.5-.4-3.5.7-4.8 1.4-1.6 3.6-2.3 5.3-2.3 3.5 0 6 2 6 5 0 .4-.1.7-.2 1A10 10 0 0 0 22 12c0-5.5-4.5-10-10-10z" fill="#0078D7" />
          <path d="M12 2C7 2 3 5.5 3 10c0 4.5 3.5 6 7 6 3 0 5-1.5 6-3.5-3 .5-6-1.5-6-4.5 0-2.5 2-4.5 4.5-5.5-.8-.3-1.7-.5-2.5-.5z" fill="#00C7FF" />
          <circle cx="14" cy="16" r="3" fill="#0078D7" />
        </svg>
      );

    case 'Opera':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="10" fill="#FF1B2D" />
          <ellipse cx="12" cy="12" rx="4.5" ry="7" fill="#FFFFFF" />
          <ellipse cx="12" cy="12" rx="2.5" ry="5.5" fill="#FF1B2D" />
        </svg>
      );

    case 'Yandex':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1" />
          <circle cx="12" cy="12" r="9" fill="#FC3F1D" />
          <path d="M15 7h-2.2c-1.8 0-2.8 1-2.8 2.5 0 1.2.6 2.1 1.7 2.8l-2.7 4.7H11l2.2-3.8h.4V17H15V7zm-1.6 4.3h-.5c-.8 0-1.3-.4-1.3-1.1 0-.7.5-1.1 1.3-1.1h.5v2.2z" fill="#FFFFFF" />
        </svg>
      );

    case 'Brave':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
          <circle cx="12" cy="12" r="10" fill="#FB542B" />
          <path d="M12 4l3.5 3-1 4.5L12 10.5 9.5 11.5l-1-4.5L12 4z" fill="#FFFFFF" />
          <path d="M7.5 10l4.5 9 4.5-9-1.5 6h-6L7.5 10z" fill="#FFC83B" />
        </svg>
      );

    case 'Default Browser':
      return <Globe className={className} />;

    default:
      return <Compass className={className} />;
  }
};

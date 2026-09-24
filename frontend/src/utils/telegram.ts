declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        close: () => void;
        requestContact?: (callback?: (sent: boolean, response?: any) => void) => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
  }
}

export const getTelegramInitData = (): string => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  // Development fallback for testing in standard browser window
  return 'dev_user_12345678';
};

export const triggerHaptic = (type: 'impact' | 'success' | 'error' = 'impact') => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    if (type === 'impact') {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    } else if (type === 'success') {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    } else if (type === 'error') {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
    }
  }
};

export const requestTelegramContact = (callback?: (sent: boolean, response?: any) => void) => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.requestContact) {
    window.Telegram.WebApp.requestContact(callback);
  }
};

export const initTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }
};

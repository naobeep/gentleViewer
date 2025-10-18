// renderer/components/Notification/NotificationSystem.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

/**
 * 通知ストア（Zustand）
 */
export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // 自動削除
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, newNotification.duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));

/**
 * 通知表示コンポーネント
 */
const NotificationSystem: React.FC = () => {
  const notifications = useNotificationStore((state) => state.notifications);

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
        />
      ))}
    </div>
  );
};

/**
 * 個別通知アイテム
 */
const NotificationItem: React.FC<{
  notification: Notification;
}> = ({ notification }) => {
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      removeNotification(notification.id);
    }, 300);
  }, [notification.id, removeNotification]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      className={`notification notification-${notification.type} ${
        isExiting ? 'notification-exit' : 'notification-enter'
      }`}
    >
      <div className="notification-icon">
        {getIcon()}
      </div>

      <div className="notification-content">
        <div className="notification-message">{notification.message}</div>
        {notification.description && (
          <div className="notification-description">
            {notification.description}
          </div>
        )}

        {notification.action && (
          <button
            className="notification-action"
            onClick={() => {
              notification.action!.onClick();
              handleClose();
            }}
          >
            {notification.action.label}
          </button>
        )}
      </div>

      <button className="notification-close" onClick={handleClose}>
        ×
      </button>
    </div>
  );
};

/**
 * 通知ヘルパー関数
 */
export const showNotification = {
  success: (message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      message,
      ...options,
    });
  },

  error: (message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      message,
      duration: 7000,
      ...options,
    });
  },

  warning: (message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      message,
      ...options,
    });
  },

  info: (message: string, options?: Partial<Omit<Notification, 'id' | 'type' | 'message'>>) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      message,
      ...options,
    });
  },
};

export default NotificationSystem;

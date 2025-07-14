import React, { createContext, useContext, useEffect, useState } from 'react';
import { messaging } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface NotificationContextType {
  requestPermission: () => Promise<void>;
  token: string | null;
}

const NotificationContext = createContext<NotificationContextType>({
  requestPermission: async () => {},
  token: null,
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const { user } = useAuth();

  const requestPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const vapidKey = import.meta.env.VITE_VAPID_KEY;
        if (vapidKey) {
          const fcmToken = await getToken(messaging, {
            vapidKey
          });
          setToken(fcmToken);
          
          // Save token to user profile in Firestore
          if (user && fcmToken) {
            // TODO: Save FCM token to user document
            console.log('FCM Token:', fcmToken);
          }
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  useEffect(() => {
    if (user) {
      requestPermission();
    }
  }, [user]);

  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        toast.success(payload.notification?.title || 'New notification');
      });

      return () => unsubscribe();
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ requestPermission, token }}>
      {children}
    </NotificationContext.Provider>
  );
};
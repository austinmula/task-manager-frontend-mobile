import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch } from './useAppSelector';
import { clearAuth } from '../store/features/auth/store/authSlice';
import { useState } from 'react';
import Toast from 'react-native-toast-message';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.100.20:3000/api';

export const useTokenManager = () => {
  const dispatch = useAppDispatch();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkTokenExpiry = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return false;

      // Decode JWT to check expiry (basic implementation)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      console.log('🕐 Token expires at:', new Date(payload.exp * 1000));
      console.log('🕐 Current time:', new Date(currentTime * 1000));
      
      return payload.exp > currentTime;
    } catch (error) {
      console.error('❌ Error checking token expiry:', error);
      return false;
    }
  };

  const manualRefreshToken = async (): Promise<boolean> => {
    if (isRefreshing) {
      console.log('🔄 Refresh already in progress...');
      return false;
    }

    setIsRefreshing(true);
    console.log('🔄 Manually refreshing token...');

    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        console.log('❌ No refresh token found');
        dispatch(clearAuth());
        Toast.show({
          type: 'error',
          text1: 'Session Expired',
          text2: 'Please log in again',
        });
        return false;
      }

      const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.100.20:3000/api';
      
      console.log('📡 Making refresh request to:', `${API_BASE_URL}/auth/refresh`);
      
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      console.log('📡 Refresh response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📡 Refresh response data:', data);
        
        const newAccessToken = data.accessToken || data.token || data.access_token;
        const newRefreshToken = data.refreshToken || data.refresh_token;
        
        if (newAccessToken) {
          await AsyncStorage.setItem('access_token', newAccessToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem('refresh_token', newRefreshToken);
          }
          console.log('✅ Token manually refreshed successfully');
          
          Toast.show({
            type: 'success',
            text1: 'Session Renewed',
            text2: 'Your session has been refreshed',
          });
          
          return true;
        } else {
          console.log('❌ No token in refresh response:', data);
          dispatch(clearAuth());
          Toast.show({
            type: 'error',
            text1: 'Session Expired',
            text2: 'Please log in again',
          });
          return false;
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Manual token refresh failed:', response.status, errorText);
        dispatch(clearAuth());
        Toast.show({
          type: 'error',
          text1: 'Session Expired',
          text2: 'Please log in again',
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Manual token refresh error:', error);
      dispatch(clearAuth());
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Please check your connection and try again',
      });
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  const validateCurrentToken = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return false;

      const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.100.20:3000/api';
      
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const isValid = response.ok;
      console.log(`🔍 Token validation result: ${isValid ? 'valid' : 'invalid'}`);
      
      return isValid;
    } catch (error) {
      console.error('❌ Token validation error:', error);
      return false;
    }
  };

  const getTokenInfo = async () => {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('refresh_token'),
      ]);

      let tokenInfo = {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenExpiry: null as Date | null,
        isExpired: false,
      };

      if (accessToken) {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          tokenInfo.accessTokenExpiry = new Date(payload.exp * 1000);
          tokenInfo.isExpired = payload.exp < (Date.now() / 1000);
        } catch (e) {
          console.log('Could not decode token');
        }
      }

      return tokenInfo;
    } catch (error) {
      console.error('❌ Error getting token info:', error);
      return {
        hasAccessToken: false,
        hasRefreshToken: false,
        accessTokenExpiry: null,
        isExpired: true,
      };
    }
  };

  return {
    checkTokenExpiry,
    manualRefreshToken,
    validateCurrentToken,
    getTokenInfo,
    isRefreshing,
  };
};

import colors from "@/constants/AppColors";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppSelector";
import { clearAuth, setUser } from "@/store/features/auth/store/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { Provider } from "react-redux";
import { store } from "../store";

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || "http://192.168.100.20:3000/api";

function AuthChecker({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector((state) => state.auth);
  useEffect(() => {
    checkAuthStatus();

    // Fallback timeout to prevent infinite loading ONLY if not initialized
    const fallbackTimeout = setTimeout(() => {
      const currentState = store.getState().auth;
      if (!currentState.isInitialized) {
        console.log("Auth initialization timeout, clearing auth");
        dispatch(clearAuth());
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(fallbackTimeout);
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log("🔍 Checking authentication status...");

      const [userData, accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem("user"),
        AsyncStorage.getItem("access_token"),
        AsyncStorage.getItem("refresh_token"),
      ]);

      if (userData && accessToken) {
        console.log("📱 Found stored auth data, validating...");
        const user = JSON.parse(userData);

        // Test if the current token is still valid by making a simple API call
        try {
          const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            console.log("✅ Token is valid, setting user state");
            dispatch(setUser(user));
          } else if (response.status === 401) {
            console.log(
              "🔄 Token expired, will attempt refresh on next API call"
            );
            // Don't clear immediately - let the baseQuery handle the refresh
            dispatch(setUser(user));
          } else {
            console.log("❌ Unexpected auth response, clearing auth");
            await AsyncStorage.multiRemove([
              "access_token",
              "refresh_token",
              "user",
            ]);
            dispatch(clearAuth());
          }
        } catch (networkError) {
          console.log(
            "🌐 Network error during token validation, assuming offline"
          );
          // If it's a network error, assume we're offline and keep the user logged in
          dispatch(setUser(user));
        }
      } else {
        console.log("❌ No stored auth data found");
        await AsyncStorage.multiRemove([
          "access_token",
          "refresh_token",
          "user",
        ]);
        dispatch(clearAuth());
      }
    } catch (error) {
      console.error("❌ Auth check failed:", error);
      dispatch(clearAuth());
    }
  };

  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Custom Toast configuration
  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: colors.success,
          backgroundColor: colors.surface,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 16,
          fontWeight: "600",
          color: colors.textPrimary,
        }}
        text2Style={{
          fontSize: 14,
          color: colors.textSecondary,
        }}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{
          borderLeftColor: colors.error,
          backgroundColor: colors.surface,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 16,
          fontWeight: "600",
          color: colors.textPrimary,
        }}
        text2Style={{
          fontSize: 14,
          color: colors.textSecondary,
        }}
      />
    ),
  };

  return (
    <AuthChecker>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Authenticated routes
          <Stack.Screen name="(tabs)" />
        ) : (
          // Unauthenticated routes
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      <Toast config={toastConfig} />
    </AuthChecker>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}

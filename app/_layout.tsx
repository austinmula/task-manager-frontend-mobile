import colors from "@/constants/AppColors";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppSelector";
import { clearAuth, setUser } from "@/store/features/auth/store/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Toast, { BaseToast, ErrorToast } from "react-native-toast-message";
import { Provider } from "react-redux";
import { store } from "../store";

function AuthChecker({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    checkAuthStatus();

    // Fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
      dispatch(clearAuth());
    }, 5000); // 5 second timeout

    return () => clearTimeout(fallbackTimeout);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const [userData, accessToken] = await Promise.all([
        AsyncStorage.getItem("user"),
        AsyncStorage.getItem("access_token"),
      ]);

      if (userData && accessToken) {
        const user = JSON.parse(userData);
        dispatch(setUser(user));
      } else {
        await AsyncStorage.multiRemove([
          "access_token",
          "refresh_token",
          "user",
        ]);
        dispatch(clearAuth());
      }
    } catch (error) {
      console.error("Auth check failed:", error);
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

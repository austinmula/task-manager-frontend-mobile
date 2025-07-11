import React from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppSelector";
import { clearAuth, setUser } from "@/store/features/auth/store/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { Provider } from "react-redux";
import { store } from "../store";

function AuthChecker({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      const token = await AsyncStorage.getItem("access_token");

      if (userData && token) {
        dispatch(setUser(JSON.parse(userData)));
      } else {
        dispatch(clearAuth());
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      dispatch(clearAuth());
    }
  };

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthChecker>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
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

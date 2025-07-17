import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  "https://task-manager-app-x13e.onrender.com/api";

// Base query with automatic token refresh
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: async (headers, { getState }) => {
    // Add auth token to requests
    const token = await AsyncStorage.getItem("access_token");
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    headers.set("content-type", "application/json");
    return headers;
  },
});

// Enhanced base query with token refresh logic
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  console.log(
    "🔍 Making API request:",
    typeof args === "string" ? args : args.url
  );

  let result = await baseQuery(args, api, extraOptions);

  console.log("🔍 API response status:", result?.error?.status || "success");

  if (result?.error?.status === 403) {
    console.log("🔄 Token expired, attempting refresh...");

    // Try to refresh the token
    const refreshToken = await AsyncStorage.getItem("refresh_token");

    if (refreshToken) {
      console.log("📝 Found refresh token, making refresh request...");

      // Create a fresh base query without the expired token for the refresh request
      const refreshBaseQuery = fetchBaseQuery({
        baseUrl: API_BASE_URL,
        prepareHeaders: (headers) => {
          headers.set("content-type", "application/json");
          return headers;
        },
      });

      const refreshResult = await refreshBaseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      console.log("🔄 Refresh request result:", refreshResult);

      if (refreshResult?.data) {
        console.log("✅ Token refresh successful", refreshResult.data);

        // Handle different possible response formats
        const refreshData = refreshResult.data as any;
        const newAccessToken =
          refreshData.accessToken ||
          refreshData.token ||
          refreshData.access_token;
        const newRefreshToken =
          refreshData.refreshToken || refreshData.refresh_token;

        if (newAccessToken) {
          // Store the new tokens
          await AsyncStorage.setItem("access_token", newAccessToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem("refresh_token", newRefreshToken);
          }
          console.log("💾 New token(s) stored, retrying original request...");

          // Update Redux state if we have user info in the response
          if (refreshData.user) {
            const { setUser } = await import(
              "../../store/features/auth/store/authSlice"
            );
            api.dispatch(setUser(refreshData.user));
          }

          // Create a new base query instance with the updated token for the retry
          const retryBaseQuery = fetchBaseQuery({
            baseUrl: API_BASE_URL,
            prepareHeaders: async (headers) => {
              headers.set("authorization", `Bearer ${newAccessToken}`);
              headers.set("content-type", "application/json");
              return headers;
            },
          });

          // Retry the original request with new token
          console.log("🔄 Retrying original request with new token...");
          result = await retryBaseQuery(args, api, extraOptions);

          if (!result.error) {
            console.log("✅ Original request succeeded with new token");
          } else {
            console.error(
              "❌ Original request still failed after refresh:",
              result.error
            );
          }
        } else {
          console.error("❌ No token in refresh response:", refreshData);
          await clearAuthAndRedirect(api);
        }
      } else {
        console.error("❌ Token refresh failed:", refreshResult.error);
        await clearAuthAndRedirect(api);
      }
    } else {
      console.log("❌ No refresh token found, clearing auth");
      await clearAuthAndRedirect(api);
    }
  }

  return result;
};

// Helper function to clear auth and redirect
const clearAuthAndRedirect = async (api: any) => {
  console.log("🧹 Clearing authentication data...");

  try {
    // Clear all auth-related data
    await AsyncStorage.multiRemove(["access_token", "refresh_token", "user"]);

    // Import and dispatch logout action
    const { clearAuth } = await import(
      "../../store/features/auth/store/authSlice"
    );
    api.dispatch(clearAuth());

    console.log("✅ Auth data cleared and user logged out");
  } catch (error) {
    console.error("❌ Error clearing auth data:", error);
  }
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Auth", "Task", "Category"], // For cache invalidation
  endpoints: () => ({}), // Individual APIs will inject endpoints
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || "http://192.168.100.20:3000/api";

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
  let result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    console.log("Token expired, attempting refresh...");

    // Try to refresh the token
    const refreshToken = await AsyncStorage.getItem("refresh_token");

    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult?.data) {
        // Store the new token
        const newTokenData = refreshResult.data as { token: string };
        await AsyncStorage.setItem("access_token", newTokenData.token);

        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, clear everything
        await AsyncStorage.multiRemove([
          "access_token",
          "refresh_token",
          "user",
        ]);
        // You could also dispatch a logout action here if needed
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Auth", "Task", "Category"], // For cache invalidation
  endpoints: () => ({}), // Individual APIs will inject endpoints
});

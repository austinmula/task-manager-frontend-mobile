import { baseApi } from "@/services/api/baseApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Store tokens in AsyncStorage
          await AsyncStorage.setItem("access_token", data.token);
          await AsyncStorage.setItem("refresh_token", data.refreshToken);
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        } catch (error) {
          console.error("Login failed:", error);
        }
      },
      invalidatesTags: ["Auth"],
    }),

    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: userData,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Store tokens in AsyncStorage
          await AsyncStorage.setItem("access_token", data.token);
          await AsyncStorage.setItem("refresh_token", data.refreshToken);
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        } catch (error) {
          console.error("Registration failed:", error);
        }
      },
      invalidatesTags: ["Auth"],
    }),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error("Logout API failed:", error);
        } finally {
          // Always clear local storage
          await AsyncStorage.multiRemove([
            "access_token",
            "refresh_token",
            "user",
          ]);
        }
      },
      invalidatesTags: ["Auth", "Task", "Category"], // Clear all cache on logout
    }),

    refreshToken: builder.mutation<{ token: string }, { refreshToken: string }>(
      {
        query: (body) => ({
          url: "/auth/refresh",
          method: "POST",
          body,
        }),
        async onQueryStarted(arg, { dispatch, queryFulfilled }) {
          try {
            const { data } = await queryFulfilled;
            await AsyncStorage.setItem("access_token", data.token);
          } catch (error) {
            // If refresh fails, clear everything
            await AsyncStorage.multiRemove([
              "access_token",
              "refresh_token",
              "user",
            ]);
          }
        },
      }
    ),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
} = authApi;

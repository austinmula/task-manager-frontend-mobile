import { baseApi } from "@/services/api/baseApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAuth, setUser } from "./authSlice";

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
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
          await AsyncStorage.setItem("access_token", data.accessToken);
          await AsyncStorage.setItem("refresh_token", data.refreshToken);
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
          // Update Redux state
          dispatch(setUser(data.user));
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
          // await AsyncStorage.setItem("access_token", data.accessToken);
          // await AsyncStorage.setItem("refresh_token", data.refreshToken);
          // await AsyncStorage.setItem("user", JSON.stringify(data.user));
          // Update Redux state
          // dispatch(setUser(data.user));
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
          // Always clear local storage and Redux state
          await AsyncStorage.multiRemove([
            "access_token",
            "refresh_token",
            "user",
          ]);
          dispatch(clearAuth());
        }
      },
      invalidatesTags: ["Auth", "Task", "Category"], // Clear all cache on logout
    }),

    refreshToken: builder.mutation<
      {
        token?: string;
        accessToken?: string;
        user?: User;
        refreshToken?: string;
      },
      { refreshToken: string }
    >({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log("🔄 Refresh endpoint response:", data);

          const newAccessToken = data.accessToken || data.token;
          const newRefreshToken = data.refreshToken;

          if (newAccessToken) {
            await AsyncStorage.setItem("access_token", newAccessToken);
            if (newRefreshToken) {
              await AsyncStorage.setItem("refresh_token", newRefreshToken);
            }

            // Update user in Redux if provided
            if (data.user) {
              await AsyncStorage.setItem("user", JSON.stringify(data.user));
              dispatch(setUser(data.user));
            }

            console.log("✅ Auth API refresh successful");
          }
        } catch (error) {
          console.error("❌ Auth API refresh failed:", error);
          // If refresh fails, clear everything
          await AsyncStorage.multiRemove([
            "access_token",
            "refresh_token",
            "user",
          ]);
          dispatch(clearAuth());
        }
      },
    }),
  }),
});

// Utility function to check and restore authentication state
export const validateStoredAuth = async (dispatch: any) => {
  try {
    const [userData, accessToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem("user"),
      AsyncStorage.getItem("access_token"),
      AsyncStorage.getItem("refresh_token"),
    ]);

    if (userData && accessToken) {
      // Parse user data and set auth state
      const user = JSON.parse(userData);
      dispatch(setUser(user));
      return true;
    } else {
      // Clear any partial data and set unauthenticated state
      await AsyncStorage.multiRemove(["access_token", "refresh_token", "user"]);
      dispatch(clearAuth());
      return false;
    }
  } catch (error) {
    console.error("Auth validation failed:", error);
    // Clear everything on error
    await AsyncStorage.multiRemove(["access_token", "refresh_token", "user"]);
    dispatch(clearAuth());
    return false;
  }
};

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
} = authApi;

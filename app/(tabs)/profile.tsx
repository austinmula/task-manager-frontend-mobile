import colors from "@/constants/AppColors";
import { useAppDispatch, useAppSelector } from "@/hooks/useAppSelector";
import { useLogoutMutation } from "@/store/features/auth/store/authApi";
import { clearAuth } from "@/store/features/auth/store/authSlice";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function Profile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [logoutUser, { isLoading: isLoggingOut }] = useLogoutMutation();

  // Monitor auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      console.log(
        "Profile: User is no longer authenticated, should redirect to login"
      );
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: performLogout,
      },
    ]);
  };

  const performLogout = async () => {
    try {
      // Call logout API - this will handle clearing AsyncStorage and Redux state
      await logoutUser().unwrap();

      // Show success message
      Toast.show({
        type: "success",
        text1: "Logged Out Successfully",
        text2: "You have been successfully logged out.",
        visibilityTime: 1500,
      });

      // Small delay to ensure state is properly updated before navigation
      setTimeout(() => {
        console.log("Logout completed, auth state should be cleared");
      }, 100);
    } catch (error: any) {
      console.error("Logout error:", error);

      // Even if API fails, clear local state as fallback
      dispatch(clearAuth());

      Toast.show({
        type: "info",
        text1: "Logged Out",
        text2: "You have been logged out locally.",
        visibilityTime: 1500,
      });
    }
  };

  const profileItems = [
    {
      icon: "log-out",
      title: isLoggingOut ? "Logging out..." : "Logout",
      action: handleLogout,
      isDestructive: true,
      disabled: isLoggingOut,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={colors.white} />
          </View>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>
            {user?.email || "user@example.com"}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Tasks Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Tasks Ongoing</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>89%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>

        <View style={styles.menuContainer}>
          {profileItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                item.disabled && styles.menuItemDisabled,
              ]}
              onPress={item.disabled ? undefined : item.action}
              disabled={item.disabled}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color={
                    item.disabled
                      ? colors.textPlaceholder
                      : item.isDestructive
                      ? colors.error
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.menuItemText,
                    item.isDestructive && styles.destructiveText,
                    item.disabled && styles.disabledText,
                  ]}
                >
                  {item.title}
                </Text>
              </View>
              {!item.disabled && (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Procrastinator v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2025 Your Company</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.white}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: `${colors.white}80`,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  menuContainer: {
    marginTop: 32,
    marginHorizontal: 20,
    justifyContent: "flex-end",
    flex: 1,
  },
  menuItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 12,
    fontWeight: "500",
  },
  destructiveText: {
    color: colors.error,
  },
  disabledText: {
    color: colors.textPlaceholder,
  },
  appInfo: {
    alignItems: "center",
    marginTop: 32,
    paddingHorizontal: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});

import colors from "@/constants/AppColors";
import { useAppDispatch } from "@/hooks/useAppSelector";
import { useLoginMutation } from "@/store/features/auth/store/authApi";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import * as yup from "yup";

// Define validation schema
const validationSchema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address"),
  password: yup.string().required("Password is required"),
});

type FormData = yup.InferType<typeof validationSchema>;

export default function Index() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loginUser, { isLoading: isLoggingIn }] = useLoginMutation();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setError,
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema),
    mode: "onChange",
  });

  const goToRegister = () => {
    router.push("/register");
  };

  const onSubmit = async (data: FormData) => {
    try {
      const result = await loginUser({
        email: data.email,
        password: data.password,
      }).unwrap();

      // Login successful
      Toast.show({
        type: "success",
        text1: "Welcome back! 👋",
        text2: "You've been successfully logged in.",
        visibilityTime: 2500,
      });

      // Navigate after a short delay to let user see the success message
      setTimeout(() => {
        router.replace("/(tabs)/tasks");
      }, 1000);
    } catch (error: any) {
      console.error("Login error:", error);

      // Handle specific API errors
      if (error?.data?.message) {
        // Check if it's an invalid credentials error
        if (
          error.data.message.toLowerCase().includes("invalid") ||
          error.data.message.toLowerCase().includes("credentials") ||
          error.data.message.toLowerCase().includes("password") ||
          error.data.message.toLowerCase().includes("email")
        ) {
          Toast.show({
            type: "error",
            text1: "Invalid Credentials",
            text2: "Please check your email and password and try again.",
            visibilityTime: 4000,
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Login Failed",
            text2: error.data.message,
            visibilityTime: 4000,
          });
        }
      } else if (error?.status === 401) {
        Toast.show({
          type: "error",
          text1: "Invalid Credentials",
          text2: "Please check your email and password and try again.",
          visibilityTime: 4000,
        });
      } else if (error?.status === 500) {
        Toast.show({
          type: "error",
          text1: "Server Error",
          text2: "Something went wrong on our end. Please try again later.",
          visibilityTime: 4000,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Login Failed",
          text2: "An unexpected error occurred. Please try again.",
          visibilityTime: 4000,
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* <Image
          source={require("../assets/images/hero-main.png")}
          resizeMode="contain"
          style={styles.heroImage}
        /> */}
        <View style={styles.contentContainer}>
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.summary}>
            Sign in to continue managing your tasks and boost your productivity.
          </Text>
          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textPlaceholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textPlaceholder}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  {errors.password && (
                    <Text style={styles.errorText}>
                      {errors.password.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isValid || isLoggingIn) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={!isValid || isLoggingIn}
            >
              <Text style={styles.primaryButtonText}>
                {isLoggingIn ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                Don&apos;t have an account?{" "}
              </Text>
              <TouchableOpacity onPress={goToRegister}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
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
  heroImage: {
    width: "100%",
    height: 380,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingVertical: 16,
    // iOS Shadow
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Android Elevation
    elevation: 3,
  },
  heading: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 16,
  },
  summary: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  formContainer: {
    width: "100%",
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textTertiary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textDark,
    // Focus state would use secondary color
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    gap: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.textSecondary,
    shadowOpacity: 0.1,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  signupText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  signupLink: {
    fontSize: 16,
    color: colors.secondary,
    fontWeight: "600",
  },
});

// Color palette for Procrastinator app
export const colors = {
  // Primary brand colors
  primary: "#16A3A3", // Teal - main brand color
  secondary: "#A3165D", // Deep pink - accent color

  // Background colors
  background: "#fff", // White background
  surface: "#ffff", // Content container background
  surfaceLight: "#f9fafb", // Light gray for input backgrounds

  // Text colors
  textPrimary: "#1e293b", // Dark slate for headings
  textSecondary: "#64748b", // Medium gray for body text
  textTertiary: "#374151", // Dark gray for labels
  textDark: "#111827", // Very dark for input text
  textPlaceholder: "#9ca3af", // Light gray for placeholders

  // Border colors
  border: "#d1d5db", // Light gray for input borders

  // Shadow colors
  shadow: "#000", // Black for shadows

  // State colors
  white: "#ffffff", // Pure white for button text

  // Semantic colors (for future use)
  success: "#10b981", // Green for success states
  warning: "#f59e0b", // Amber for warning states
  error: "#ef4444", // Red for error states
  info: "#3b82f6", // Blue for info states
} as const;

// Color variants for different opacity levels
export const colorVariants = {
  primary: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    500: colors.primary,
    600: "#0d9488",
    700: "#0f766e",
  },
  secondary: {
    50: "#fdf2f8",
    100: "#fce7f3",
    500: colors.secondary,
    600: "#be185d",
    700: "#9d174d",
  },
} as const;

export default colors;

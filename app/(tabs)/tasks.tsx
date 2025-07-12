import { Ionicons } from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import * as yup from "yup";
import colors from "../../constants/AppColors";
import { useTokenManager } from "../../hooks/useTokenManager";
import { useGetCategoriesQuery } from "../../store/features/categories/store/categoriesApi";
import {
  CreateTaskRequest,
  Task,
  UpdateTaskRequest,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetTasksQuery,
  useUpdateTaskMutation,
} from "../../store/features/tasks/store/taskApi";

// Debug component to show token status
const TokenDebugInfo = ({
  getTokenInfo,
}: {
  getTokenInfo: () => Promise<any>;
}) => {
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    const loadTokenInfo = async () => {
      const info = await getTokenInfo();
      setTokenInfo(info);
    };
    loadTokenInfo();

    // Refresh token info every 5 seconds
    const interval = setInterval(loadTokenInfo, 5000);
    return () => clearInterval(interval);
  }, [getTokenInfo]);

  if (!tokenInfo)
    return <Text style={styles.debugText}>Loading token info...</Text>;

  return (
    <View>
      <Text style={styles.debugText}>
        Access Token: {tokenInfo.hasAccessToken ? "✅" : "❌"}
      </Text>
      <Text style={styles.debugText}>
        Refresh Token: {tokenInfo.hasRefreshToken ? "✅" : "❌"}
      </Text>
      {tokenInfo.accessTokenExpiry && (
        <Text style={styles.debugText}>
          Expires: {tokenInfo.accessTokenExpiry.toLocaleString()}
        </Text>
      )}
      <Text style={styles.debugText}>
        Status: {tokenInfo.isExpired ? "❌ Expired" : "✅ Valid"}
      </Text>
      <Text style={styles.debugText}>
        Last Check: {new Date().toLocaleTimeString()}
      </Text>
    </View>
  );
};

// Test function to validate token refresh flow
const useTokenRefreshTest = () => {
  const { validateCurrentToken, manualRefreshToken, getTokenInfo } =
    useTokenManager();

  const testTokenRefreshFlow = async () => {
    console.log("🧪 Starting token refresh flow test...");

    try {
      // Step 1: Check current token info
      const tokenInfo = await getTokenInfo();
      console.log("🧪 Current token info:", tokenInfo);

      // Step 2: Validate current token
      const isValid = await validateCurrentToken();
      console.log("🧪 Current token is valid:", isValid);

      // Step 3: If token is expired or will expire soon, test refresh
      if (tokenInfo.isExpired || !isValid) {
        console.log("🧪 Token is expired, testing refresh...");
        const refreshSuccess = await manualRefreshToken();
        console.log("🧪 Refresh result:", refreshSuccess);

        if (refreshSuccess) {
          // Step 4: Validate the new token
          const newTokenValid = await validateCurrentToken();
          console.log("🧪 New token is valid:", newTokenValid);
        }
      } else {
        console.log("🧪 Token is still valid, refresh test skipped");
      }

      Toast.show({
        type: "info",
        text1: "Token Test Complete",
        text2: "Check console for detailed results",
      });
    } catch (error) {
      console.error("🧪 Token refresh test failed:", error);
      Toast.show({
        type: "error",
        text1: "Token Test Failed",
        text2: "Check console for error details",
      });
    }
  };

  return { testTokenRefreshFlow };
};

type FilterType = "all" | "pending" | "in_progress" | "completed" | "category";

interface TaskFormData {
  title: string;
  description?: string;
  due_date?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  category_id?: number;
}

const taskSchema = yup.object({
  title: yup
    .string()
    .required("Title is required")
    .min(1, "Title cannot be empty"),
  description: yup.string().optional(),
  due_date: yup.string().optional(),
  status: yup
    .string()
    .oneOf(["pending", "in_progress", "completed", "cancelled"])
    .required(),
  category_id: yup.number().required("Category is required"),
});

export default function TaskScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    number | null
  >(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTokenDebug, setShowTokenDebug] = useState(false);

  const {
    manualRefreshToken,
    getTokenInfo,
    isRefreshing: isTokenRefreshing,
  } = useTokenManager();
  const { testTokenRefreshFlow } = useTokenRefreshTest();

  // Build filters based on active filter
  const filters: any = {};
  if (activeFilter !== "all" && activeFilter !== "category") {
    filters.status = activeFilter;
  }
  if (activeFilter === "category" && activeCategoryFilter) {
    filters.category_id = activeCategoryFilter;
  }

  const {
    data: tasksResponse,
    error,
    isLoading,
    refetch,
  } = useGetTasksQuery(filters, {
    // Add error handling to detect auth issues
    skip: false,
    pollingInterval: 0,
    refetchOnMountOrArgChange: true,
  });

  // Log any auth-related errors
  useEffect(() => {
    if (error) {
      console.log("📋 Tasks API Error:", error);
      if ("status" in error && error.status === 401) {
        console.log("🔑 Unauthorized error in tasks - token may have expired");
      }
    }
  }, [error]);

  const { data: categories = [], isLoading: isCategoriesLoading } =
    useGetCategoriesQuery();

  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: yupResolver(taskSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      due_date: "",
      status: "pending",
      category_id: categories.length > 0 ? categories[0].id : undefined,
    },
  });

  const tasks = tasksResponse?.tasks || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return colors.success;
      case "in_progress":
        return colors.warning;
      case "pending":
        return colors.textSecondary;
      case "cancelled":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (filter !== "category") {
      setActiveCategoryFilter(null);
    }
  };

  const handleCategoryFilter = (categoryId: number) => {
    setActiveFilter("category");
    setActiveCategoryFilter(categoryId);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    reset({
      title: "",
      description: "",
      due_date: "",
      status: "pending",
      category_id: categories.length > 0 ? categories[0].id : undefined,
    });
    setIsModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    reset({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date || "",
      status: task.status,
      category_id: task.category_id,
    });
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingTask(null);
    reset();
  };

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (editingTask) {
        // Update existing task
        await updateTask({
          id: editingTask.id,
          taskData: data as UpdateTaskRequest,
        }).unwrap();
        Toast.show({
          type: "success",
          text1: "Task Updated",
          text2: "Task has been updated successfully",
        });
      } else {
        // Create new task
        await createTask(data as CreateTaskRequest).unwrap();
        Toast.show({
          type: "success",
          text1: "Task Created",
          text2: "New task has been created successfully",
        });
      }
      closeModal();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: editingTask ? "Update Failed" : "Creation Failed",
        text2: "Please try again",
      });
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await deleteTask(taskId).unwrap();
      Toast.show({
        type: "success",
        text1: "Task Deleted",
        text2: "Task has been deleted successfully",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Delete Failed",
        text2: "Please try again",
      });
    }
  };

  const renderTaskItem = ({ item: task }: { item: Task }) => (
    <View style={styles.taskItem}>
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        {task.description && (
          <Text style={styles.taskDescription}>{task.description}</Text>
        )}
        <View style={styles.taskMeta}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(task.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {task.status.replace("_", " ")}
            </Text>
          </View>
          {task.category && (
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: task.category.color },
              ]}
            >
              <Text style={styles.categoryText}>{task.category.name}</Text>
            </View>
          )}
          {task.due_date && (
            <Text style={styles.dueDate}>
              Due: {new Date(task.due_date).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(task)}
        >
          <Ionicons name="pencil" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteTask(task.id)}
          disabled={isDeleting}
        >
          <Ionicons name="trash" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to load tasks</Text>
          <Text style={styles.errorMessage}>
            Please check your connection and try again
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Add Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => setShowTokenDebug(!showTokenDebug)}
          >
            <Ionicons name="bug" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color={colors.white} />
            <Text style={styles.addButtonText}>Add Task</Text>
          </TouchableOpacity>
        </View>

        {/* Token Debug Panel */}
        {showTokenDebug && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugTitle}>🔧 Token Debug</Text>
            <TokenDebugInfo getTokenInfo={getTokenInfo} />
            <View style={styles.debugButtonsRow}>
              <TouchableOpacity
                style={[styles.refreshTokenButton, { flex: 1, marginRight: 8 }]}
                onPress={manualRefreshToken}
                disabled={isTokenRefreshing}
              >
                <Text style={styles.refreshTokenText}>
                  {isTokenRefreshing ? "Refreshing..." : "Manual Refresh"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.refreshTokenButton,
                  { flex: 1, backgroundColor: colors.warning },
                ]}
                onPress={testTokenRefreshFlow}
              >
                <Text style={styles.refreshTokenText}>Test Flow</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {(["all", "pending", "in_progress", "completed"] as FilterType[]).map(
            (filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  activeFilter === filter && styles.filterActive,
                ]}
                onPress={() => handleFilterChange(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === filter && styles.filterActiveText,
                  ]}
                >
                  {filter === "in_progress"
                    ? "In Progress"
                    : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Category Filter */}
        {!isCategoriesLoading && categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Filter by Category:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryFilter,
                    { backgroundColor: category.color },
                    activeCategoryFilter === category.id &&
                      styles.categoryFilterActive,
                  ]}
                  onPress={() => handleCategoryFilter(category.id)}
                >
                  <Text style={styles.categoryFilterText}>{category.name}</Text>
                  {category._count && (
                    <Text style={styles.categoryCount}>
                      ({category._count.tasks})
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        )}

        {/* Tasks List */}
        {!isLoading && (
          <FlatList
            data={tasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.tasksContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="checkmark-done"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>No tasks found</Text>
                <Text style={styles.emptyMessage}>
                  {activeFilter === "all"
                    ? "Create your first task to get started"
                    : `No ${activeFilter.replace("_", " ")} tasks found`}
                </Text>
              </View>
            )}
          />
        )}

        {/* Create/Edit Task Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTask ? "Edit Task" : "Create Task"}
              </Text>
              <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={isCreating || isUpdating}
              >
                <Text
                  style={[
                    styles.saveButton,
                    (isCreating || isUpdating) && styles.saveButtonDisabled,
                  ]}
                >
                  {isCreating || isUpdating ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title *</Text>
                <Controller
                  control={control}
                  name="title"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.textInput,
                        errors.title && styles.inputError,
                      ]}
                      placeholder="Enter task title"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
                {errors.title && (
                  <Text style={styles.errorText}>{errors.title.message}</Text>
                )}
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.textArea,
                        errors.description && styles.inputError,
                      ]}
                      placeholder="Enter task description"
                      value={value || ""}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      multiline
                      numberOfLines={4}
                    />
                  )}
                />
              </View>

              {/* Status Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status</Text>
                <Controller
                  control={control}
                  name="status"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.statusButtons}>
                      {(
                        [
                          "pending",
                          "in_progress",
                          "completed",
                          "cancelled",
                        ] as const
                      ).map((status) => (
                        <Pressable
                          key={status}
                          style={[
                            styles.statusButton,
                            value === status && styles.statusButtonActive,
                          ]}
                          onPress={() => onChange(status)}
                        >
                          <Text
                            style={[
                              styles.statusButtonText,
                              value === status && styles.statusButtonTextActive,
                            ]}
                          >
                            {status.replace("_", " ").charAt(0).toUpperCase() +
                              status.replace("_", " ").slice(1)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                />
              </View>

              {/* Category Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category *</Text>
                <Controller
                  control={control}
                  name="category_id"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.categorySelection}>
                      {categories.map((category) => (
                        <Pressable
                          key={category.id}
                          style={[
                            styles.categorySelectButton,
                            { backgroundColor: category.color },
                            value === category.id &&
                              styles.categorySelectButtonActive,
                          ]}
                          onPress={() => onChange(category.id)}
                        >
                          <Text style={styles.categorySelectText}>
                            {category.name}
                          </Text>
                          {value === category.id && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={colors.white}
                            />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  )}
                />
                {errors.category_id && (
                  <Text style={styles.errorText}>
                    {errors.category_id.message}
                  </Text>
                )}
              </View>

              {/* Due Date Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Due Date</Text>
                <Controller
                  control={control}
                  name="due_date"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.textInput,
                        errors.due_date && styles.inputError,
                      ]}
                      placeholder="YYYY-MM-DD"
                      value={value || ""}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>
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
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 16,
    alignItems: "flex-end",
  },
  addButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  filterActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
  },
  filterActiveText: {
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  tasksContent: {
    paddingBottom: 20,
  },
  taskItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskContent: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  dueDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  taskActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  saveButtonDisabled: {
    color: colors.textSecondary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    minHeight: 100,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  statusButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  statusButtonTextActive: {
    color: colors.white,
  },
  // Category Styles
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: "500",
  },
  categoriesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    opacity: 0.8,
  },
  categoryFilterActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  categorySelection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categorySelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    opacity: 0.8,
  },
  categorySelectButtonActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  categorySelectText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  // Debug styles
  debugButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  debugPanel: {
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  debugText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    fontFamily: "monospace",
  },
  refreshTokenButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  refreshTokenText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  debugButtonsRow: {
    flexDirection: "row",
    marginTop: 12,
  },
});

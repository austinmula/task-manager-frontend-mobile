import { Ionicons } from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import * as yup from "yup";
import colors from "../../constants/AppColors";
import {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
} from "../../store/features/categories/store/categoriesApi";

interface CategoryFormData {
  name: string;
  color: string;
}

const categorySchema = yup.object({
  name: yup
    .string()
    .required("Category name is required")
    .min(1, "Name cannot be empty"),
  color: yup
    .string()
    .required("Color is required")
    .matches(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color"),
});

const predefinedColors = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FECA57",
  "#FF9FF3",
  "#54A0FF",
  "#5F27CD",
  "#00D2D3",
  "#FF9F43",
  "#FC427B",
  "#26DE81",
  "#FD79A8",
  "#FDCB6E",
  "#6C5CE7",
];

export default function CategoriesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const {
    data: categories = [],
    error,
    isLoading,
    refetch,
  } = useGetCategoriesQuery();

  const [createCategory, { isLoading: isCreating }] =
    useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] =
    useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] =
    useDeleteCategoryMutation();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: yupResolver(categorySchema) as any,
    defaultValues: {
      name: "",
      color: predefinedColors[0],
    },
  });

  const selectedColor = watch("color");

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    reset({
      name: "",
      color: predefinedColors[0],
    });
    setIsModalVisible(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      color: category.color,
    });
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingCategory(null);
    reset();
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        // Update existing category
        await updateCategory({
          id: editingCategory.id,
          categoryData: data as UpdateCategoryRequest,
        }).unwrap();
        Toast.show({
          type: "success",
          text1: "Category Updated",
          text2: "Category has been updated successfully",
        });
      } else {
        // Create new category
        await createCategory(data as CreateCategoryRequest).unwrap();
        Toast.show({
          type: "success",
          text1: "Category Created",
          text2: "New category has been created successfully",
        });
      }
      closeModal();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: editingCategory ? "Update Failed" : "Creation Failed",
        text2: "Please try again",
      });
    }
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(category.id).unwrap();
              Toast.show({
                type: "success",
                text1: "Category Deleted",
                text2: "Category has been deleted successfully",
              });
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Delete Failed",
                text2: "Please try again",
              });
            }
          },
        },
      ]
    );
  };

  const renderCategoryItem = ({ item: category }: { item: Category }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        <View
          style={[styles.colorIndicator, { backgroundColor: category.color }]}
        />
        <View style={styles.categoryDetails}>
          <Text style={styles.categoryName}>{category.name}</Text>
          {category._count && (
            <Text style={styles.taskCount}>
              {category._count.tasks} task
              {category._count.tasks !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(category)}
        >
          <Ionicons name="pencil" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteCategory(category)}
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
          <Text style={styles.errorTitle}>Failed to load categories</Text>
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
          <Text style={styles.headerTitle}>Categories</Text>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color={colors.white} />
            <Text style={styles.addButtonText}>Add Category</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading categories...</Text>
          </View>
        )}

        {/* Categories List */}
        {!isLoading && (
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.categoriesContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="color-palette"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>No categories found</Text>
                <Text style={styles.emptyMessage}>
                  Create your first category to organize your tasks
                </Text>
              </View>
            )}
          />
        )}

        {/* Create/Edit Category Modal */}
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
                {editingCategory ? "Edit Category" : "Create Category"}
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
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category Name *</Text>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.textInput,
                        errors.name && styles.inputError,
                      ]}
                      placeholder="Enter category name"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                    />
                  )}
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name.message}</Text>
                )}
              </View>

              {/* Color Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Color *</Text>
                <View style={styles.colorSelection}>
                  {predefinedColors.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorOptionSelected,
                      ]}
                      onPress={() => setValue("color", color)}
                    >
                      {selectedColor === color && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={colors.white}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Color Input */}
                <Text style={styles.customColorLabel}>
                  Or enter custom hex color:
                </Text>
                <Controller
                  control={control}
                  name="color"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[
                        styles.textInput,
                        errors.color && styles.inputError,
                      ]}
                      placeholder="#FF6B6B"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      autoCapitalize="characters"
                    />
                  )}
                />
                {errors.color && (
                  <Text style={styles.errorText}>{errors.color.message}</Text>
                )}

                {/* Color Preview */}
                <View style={styles.colorPreview}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  <View
                    style={[
                      styles.previewColor,
                      { backgroundColor: selectedColor },
                    ]}
                  />
                </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
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
  categoriesContent: {
    paddingBottom: 20,
  },
  categoryItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  taskCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  categoryActions: {
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
    marginBottom: 24,
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
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginTop: 4,
  },
  colorSelection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorOptionSelected: {
    borderColor: colors.textPrimary,
  },
  customColorLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  colorPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  previewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 12,
  },
  previewColor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

import { baseApi } from "@/services/api/baseApi";

export interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  category_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  category?: {
    id: number;
    name: string;
    color: string;
  };
}

export interface TasksResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TaskFilters {
  page?: number;
  limit?: number;
  status?: string;
  category_id?: number;
  search?: string;
  sort?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  due_date?: string;
  status?: string;
  category_id?: number;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<TasksResponse, TaskFilters>({
      query: (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
        return `/tasks?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.tasks.map(({ id }) => ({ type: "Task" as const, id })),
              { type: "Task", id: "LIST" },
            ]
          : [{ type: "Task", id: "LIST" }],
    }),

    getTaskById: builder.query<Task, number>({
      query: (id) => `/tasks/${id}`,
      providesTags: (result, error, id) => [{ type: "Task", id }],
    }),

    createTask: builder.mutation<
      { message: string; task: Task },
      CreateTaskRequest
    >({
      query: (taskData) => ({
        url: "/tasks",
        method: "POST",
        body: taskData,
      }),
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    updateTask: builder.mutation<
      { message: string; task: Task },
      { id: number; taskData: UpdateTaskRequest }
    >({
      query: ({ id, taskData }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body: taskData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Task", id },
        { type: "Task", id: "LIST" },
      ],
    }),

    deleteTask: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Task", id },
        { type: "Task", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} = tasksApi;

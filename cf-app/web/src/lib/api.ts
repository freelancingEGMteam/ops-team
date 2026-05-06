import type {
  AuthResponse,
  Project,
  ProjectMember,
  Stage,
  Task,
  TaskAttachment,
  TaskComment,
  TaskRow,
  TimeEntry,
  TimeEntryChannel,
  TimeEntryStatus,
  User,
} from "@/types";

const BASE =
  import.meta.env.VITE_API_URL ?? "https://ops-api.matiasvalencas.workers.dev";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

async function upload<T>(path: string, data: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

type TaskUpdateInput = Partial<
  Omit<Task, "id" | "projectId" | "createdAt" | "updatedAt" | "dueDate">
> & {
  dueDate?: string | null;
};

type TimeEntryInput = {
  startDate?: string | null;
  task?: string;
  price?: number;
  channel?: TimeEntryChannel | null;
  deliveryDate?: string | null;
  status?: TimeEntryStatus;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string) =>
      request<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    requestPasswordReset: (email: string, origin: string) =>
      request<{ message: string; resetLink?: string }>("/api/auth/password-reset", {
        method: "POST",
        body: JSON.stringify({ email, origin }),
      }),
    confirmPasswordReset: (token: string, password: string) =>
      request<{ success: boolean }>("/api/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
  },

  users: {
    me: () => request<User>("/api/users/me"),
    list: () => request<User[]>("/api/users"),
    byProject: (projectId: string) =>
      request<Pick<User, "id" | "name" | "email" | "avatar">[]>(
        `/api/users/project/${projectId}`
      ),
  },

  projects: {
    list: () => request<Project[]>("/api/projects"),
    get: (id: string) => request<Project>(`/api/projects/${id}`),
    create: (data: { name: string; description?: string; color?: string }) =>
      request<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Project>) =>
      request<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),
    members: (id: string) => request<ProjectMember[]>(`/api/projects/${id}/members`),
    addMember: (
      id: string,
      data: { userId: string; role?: Extract<User["role"], "admin" | "member"> }
    ) =>
      request<{ success: boolean }>(`/api/projects/${id}/members`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    removeMember: (id: string, userId: string) =>
      request<{ success: boolean }>(`/api/projects/${id}/members/${userId}`, {
        method: "DELETE",
      }),
  },

  stages: {
    list: (projectId: string) =>
      request<Stage[]>(`/api/stages?projectId=${projectId}`),
    create: (data: { name: string; projectId: string; color?: string }) =>
      request<Stage>("/api/stages", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Stage>) =>
      request<Stage>(`/api/stages/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/stages/${id}`, { method: "DELETE" }),
  },

  tasks: {
    list: (projectId: string, params: { stageId?: string; status?: string } = {}) => {
      const qs = new URLSearchParams({ projectId, ...params }).toString();
      return request<TaskRow[]>(`/api/tasks?${qs}`);
    },
    get: (id: string) => request<{ task: Task; assignee: User | null }>(`/api/tasks/${id}`),
    create: (data: {
      name: string;
      projectId: string;
      stageId?: string;
      assigneeId?: string;
      status?: Task["status"];
      priority?: Task["priority"];
      dueDate?: string;
      channel?: Task["channel"];
    }) => request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: TaskUpdateInput) =>
      request<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
    reorder: (updates: { taskId: string; stageId: string | null; orderIndex: number }[]) =>
      request<{ success: boolean }>("/api/tasks/reorder", {
        method: "POST",
        body: JSON.stringify(updates),
      }),
  },

  comments: {
    list: (taskId: string) => request<TaskComment[]>(`/api/tasks/${taskId}/comments`),
    create: (taskId: string, body: string) =>
      request<TaskComment>(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
  },

  attachments: {
    list: (taskId: string) =>
      request<TaskAttachment[]>(`/api/tasks/${taskId}/attachments`),
    upload: (taskId: string, file: File) => {
      const data = new FormData();
      data.append("file", file);
      return upload<TaskAttachment>(`/api/tasks/${taskId}/attachments`, data);
    },
  },

  timeEntries: {
    list: () => request<TimeEntry[]>("/api/time-entries"),
    create: (data: Required<Pick<TimeEntryInput, "task">> & TimeEntryInput) =>
      request<TimeEntry>("/api/time-entries", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: TimeEntryInput) =>
      request<TimeEntry>(`/api/time-entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/time-entries/${id}`, { method: "DELETE" }),
  },
};

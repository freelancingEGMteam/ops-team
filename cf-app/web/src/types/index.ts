export type UserRole = "owner" | "admin" | "member";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskChannel = "BIV" | "EGM";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: UserRole;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  icon: string | null;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  role: UserRole;
  joinedAt: number;
  user: Pick<User, "id" | "name" | "email" | "avatar">;
}

export interface Stage {
  id: string;
  name: string;
  projectId: string;
  orderIndex: number;
  color: string | null;
}

export interface Task {
  id: string;
  name: string;
  description: string | null;
  link: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  stageId: string | null;
  channel: TaskChannel | null;
  projectId: string;
  dueDate: number | null;
  orderIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskRow {
  task: Task;
  assignee: Pick<User, "id" | "name" | "email" | "avatar"> | null;
  stage: Pick<Stage, "id" | "name" | "color"> | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  createdAt: number;
  author: Pick<User, "id" | "name" | "email" | "avatar">;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileType: string | null;
  fileSize: number;
  createdAt: number;
  uploader: Pick<User, "id" | "name" | "email" | "avatar">;
}

export interface AuthResponse {
  token: string;
  user: Pick<User, "id" | "name" | "email" | "avatar">;
}

export type TaskStatusConfig = {
  label: string;
  color: string;
  bg: string;
};

export const STATUS_CONFIG: Record<TaskStatus, TaskStatusConfig> = {
  todo: { label: "Todo", color: "text-slate-600", bg: "bg-slate-100" },
  in_progress: { label: "In Progress", color: "text-blue-600", bg: "bg-blue-100" },
  in_review: { label: "In Review", color: "text-violet-600", bg: "bg-violet-100" },
  done: { label: "Done", color: "text-emerald-600", bg: "bg-emerald-100" },
  cancelled: { label: "Cancelled", color: "text-red-500", bg: "bg-red-50" },
};

export type PriorityConfig = { label: string; color: string };
export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  low: { label: "Low", color: "text-slate-400" },
  medium: { label: "Medium", color: "text-yellow-500" },
  high: { label: "High", color: "text-orange-500" },
  urgent: { label: "Urgent", color: "text-red-600" },
};

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, MessageSquare, Paperclip, Send } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { getStageStyle } from "@/lib/stages";
import {
  type TaskRow,
  type TaskStatus,
  type TaskPriority,
  type TaskChannel,
  type Stage,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useUndoRedo } from "@/lib/undo-redo";
import { InlineSelectCell, InlineTextCell } from "./TaskInlineEdit";

interface TaskDetailPanelProps {
  row: TaskRow | null;
  stages: Stage[];
  onClose: () => void;
}

const CHANNEL_OPTIONS: { value: TaskChannel; label: string }[] = [
  { value: "BIV", label: "BIV" },
  { value: "EGM", label: "EGM" },
];

function toDateInputValue(timestamp: number | null): string {
  if (!timestamp) return "";
  return new Date(timestamp).toISOString().slice(0, 10);
}

function fromDateInputValue(value: string): string | null {
  return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : null;
}

function toTaskDateValue(timestamp: number | null): string | null {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function StageBadge({ name }: { name: string }) {
  const style = getStageStyle(name);
  return (
    <span
      className="inline-flex max-w-full items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.color, color: style.textColor }}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}

export function TaskDetailPanel({ row, stages, onClose }: TaskDetailPanelProps) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { record } = useUndoRedo();
  const [description, setDescription] = React.useState("");
  const [link, setLink] = React.useState("");
  const [commentText, setCommentText] = React.useState("");
  const prevTaskId = React.useRef<string | null>(null);
  const savedDescription = React.useRef("");
  const savedLink = React.useRef("");

  React.useEffect(() => {
    if (row && row.task.id !== prevTaskId.current) {
      prevTaskId.current = row.task.id;
      setDescription(row.task.description ?? "");
      setLink(row.task.link ?? "");
      setCommentText("");
      savedDescription.current = row.task.description ?? "";
      savedLink.current = row.task.link ?? "";
    }
  }, [row?.task.id]);

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: api.users.list,
    enabled: !!row,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["task-comments", row?.task.id],
    queryFn: () => api.comments.list(row!.task.id),
    enabled: !!row,
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["task-attachments", row?.task.id],
    queryFn: () => api.attachments.list(row!.task.id),
    enabled: !!row,
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.tasks.update>[1] }) =>
      api.tasks.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData<TaskRow[]>(["tasks", updated.projectId], (current) =>
        current?.map((taskRow) =>
          taskRow.task.id === updated.id ? { ...taskRow, task: updated } : taskRow
        )
      );
      qc.invalidateQueries({ queryKey: ["tasks", updated.projectId] });
    },
  });

  const visible = !!row;

  const createComment = useMutation({
    mutationFn: (body: string) => api.comments.create(row!.task.id, body),
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["task-comments", row?.task.id] });
      showToast("Comment posted");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Comment failed", "error");
    },
  });

  const uploadAttachment = useMutation({
    mutationFn: (file: File) => api.attachments.upload(row!.task.id, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-attachments", row?.task.id] });
      showToast("Attachment complete");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "Attachment failed", "error");
    },
  });

  const addComment = () => {
    if (!commentText.trim()) return;
    createComment.mutate(commentText.trim());
  };

  async function saveTaskData(
    data: Parameters<typeof api.tasks.update>[1],
    successMessage: string,
    undoLabel = "task update"
  ) {
    if (!row) return null;
    const taskId = row.task.id;
    const projectId = row.task.projectId;
    const previous: Parameters<typeof api.tasks.update>[1] = {};
    for (const key of Object.keys(data) as Array<keyof typeof data>) {
      if (key === "dueDate") previous.dueDate = toTaskDateValue(row.task.dueDate);
      else previous[key] = row.task[key] as never;
    }
    try {
      const updated = await updateTask.mutateAsync({ id: taskId, data });
      record({
        label: undoLabel,
        undo: async () => {
          await api.tasks.update(taskId, previous);
          await qc.invalidateQueries({ queryKey: ["tasks", projectId] });
        },
        redo: async () => {
          await api.tasks.update(taskId, data);
          await qc.invalidateQueries({ queryKey: ["tasks", projectId] });
        },
      });
      showToast(successMessage);
      return updated;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Save failed", "error");
      return null;
    }
  }

  async function saveDescription() {
    if (!row || updateTask.isPending || description === savedDescription.current) return;
    const updated = await saveTaskData({ description }, "Description saved");
    if (updated) savedDescription.current = updated.description ?? "";
  }

  async function saveLink() {
    const nextLink = link.trim() || null;
    if (!row || updateTask.isPending || nextLink === savedLink.current) return;
    const updated = await saveTaskData({ link: nextLink }, "Google Drive link saved");
    if (updated) savedLink.current = updated.link ?? "";
  }

  async function handleClose() {
    await Promise.all([saveDescription(), saveLink()]);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300",
          visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => void handleClose()}
      />

      {/* Sliding panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 flex h-full flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out"
        )}
        style={{
          width: "min(680px, 100vw)",
          transform: visible ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Panel header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-[#0f172a] px-4 py-4 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Task Details
          </span>
          <button
            onClick={() => void handleClose()}
            className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Panel body */}
        {row && (
          <div className="flex-1 overflow-y-auto">
            {/* Title section */}
            <div className="border-b border-slate-100 px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
              <InlineTextCell
                value={row.task.name}
                onCommit={(name) => void saveTaskData({ name }, "Task name saved")}
                className="text-xl font-bold text-slate-800"
              />
            </div>

            {/* Fields */}
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Status</p>
                  <InlineSelectCell
                    value={row.task.status}
                    options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({
                      value: v as TaskStatus,
                      label: c.label,
                    }))}
                    onCommit={(s) => void saveTaskData({ status: s }, "Status saved")}
                    renderValue={(v) => (
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_CONFIG[v].bg, STATUS_CONFIG[v].color)}>
                        {STATUS_CONFIG[v].label}
                      </span>
                    )}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Priority</p>
                  <InlineSelectCell
                    value={row.task.priority}
                    options={Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({
                      value: v as TaskPriority,
                      label: c.label,
                      className: c.color,
                    }))}
                    onCommit={(p) => void saveTaskData({ priority: p }, "Priority saved")}
                    renderValue={(v) => (
                      <span className={cn("text-sm font-medium", PRIORITY_CONFIG[v].color)}>
                        {PRIORITY_CONFIG[v].label}
                      </span>
                    )}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Channel</p>
                  <InlineSelectCell
                    value={row.task.channel ?? "__none"}
                    options={[{ value: "__none", label: "None" }, ...CHANNEL_OPTIONS]}
                    onCommit={(channel) =>
                      void saveTaskData(
                        { channel: channel === "__none" ? null : (channel as TaskChannel) },
                        "Channel saved"
                      )
                    }
                    renderValue={(channel) =>
                      channel === "__none" ? (
                        <span className="text-sm text-slate-400">None</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {channel}
                        </span>
                      )
                    }
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Stage</p>
                  <InlineSelectCell
                    value={row.stage?.id ?? "__none"}
                    options={[
                      { value: "__none", label: "None" },
                      ...stages.map((stage) => ({
                        value: stage.id,
                        label: <StageBadge name={stage.name} />,
                      })),
                    ]}
                    onCommit={(stageId) =>
                      void saveTaskData(
                        { stageId: stageId === "__none" ? null : stageId },
                        "Stage saved"
                      )
                    }
                    renderValue={(stageId) => {
                      const selected =
                        stageId === "__none"
                          ? null
                          : stages.find((stage) => stage.id === stageId) ?? row.stage;
                      if (!selected) return <span className="text-sm text-slate-400">None</span>;
                      return <StageBadge name={selected.name} />;
                    }}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Assignee</p>
                  <InlineSelectCell
                    value={row.assignee?.id ?? "__unassigned"}
                    options={[
                      { value: "__unassigned", label: "Unassigned" },
                      ...assignableUsers.map((user) => ({ value: user.id, label: user.name })),
                    ]}
                    onCommit={(assigneeId) =>
                      void saveTaskData(
                        { assigneeId: assigneeId === "__unassigned" ? null : assigneeId },
                        "Assignee saved"
                      )
                    }
                    renderValue={(userId) => {
                      const selected =
                        userId === "__unassigned"
                          ? null
                          : assignableUsers.find((user) => user.id === userId) ?? row.assignee;
                      if (!selected) return <span className="text-sm text-slate-400">Unassigned</span>;
                      return (
                        <span className="flex items-center gap-2 text-sm text-slate-700">
                          <Avatar className="h-6 w-6">
                            {selected.avatar && <AvatarImage src={selected.avatar} />}
                            <AvatarFallback className="text-[10px]">
                              {getInitials(selected.name)}
                            </AvatarFallback>
                          </Avatar>
                          {selected.name}
                        </span>
                      );
                    }}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Due Date</p>
                  <input
                    type="date"
                    value={toDateInputValue(row.task.dueDate)}
                    onChange={(event) =>
                      void saveTaskData(
                        { dueDate: fromDateInputValue(event.target.value) },
                        "Due date saved"
                      )
                    }
                    className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700 outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                    title={formatDate(row.task.dueDate)}
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Google Drive Link</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={(link.trim() || null) === savedLink.current || updateTask.isPending}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void saveLink()}
                >
                  Save
                </Button>
              </div>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                placeholder="Paste Google Drive link..."
                value={link}
                onChange={(event) => setLink(event.target.value)}
                onBlur={() => void saveLink()}
              />
            </div>

            {/* Description */}
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Description</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={description === savedDescription.current || updateTask.isPending}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void saveDescription()}
                >
                  Save
                </Button>
              </div>
              <textarea
                className="w-full min-h-[120px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-y transition-colors"
                placeholder="Add a description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => void saveDescription()}
              />
            </div>

            {/* Attachments placeholder */}
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <Paperclip className="h-3 w-3" /> Attachments
              </p>
              <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer transition-colors">
                <Paperclip className="h-4 w-4" />
                Click to attach files
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    files.forEach((file) => uploadAttachment.mutate(file));
                    event.target.value = "";
                  }}
                />
              </label>
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{attachment.fileName}</span>
                      <span className="ml-auto text-xs text-slate-400">
                        {Math.max(1, Math.round(attachment.fileSize / 1024))} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {uploadAttachment.isPending && (
                <p className="mt-2 text-xs text-slate-400">Uploading attachment...</p>
              )}
            </div>

            {/* Comments */}
            <div className="px-4 py-4 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Comments
              </p>

              <div className="space-y-3 mb-4">
                {commentsLoading && (
                  <p className="text-xs text-slate-400">Loading comments...</p>
                )}
                {!commentsLoading && comments.length === 0 && (
                  <p className="text-xs text-slate-400">No comments yet. Be the first to comment.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600 shrink-0">
                      {getInitials(c.author.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700">{c.author.name}</span>
                        <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-sm text-slate-700">
                        {c.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                  placeholder="Write a comment… (Enter to post)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addComment}
                  disabled={!commentText.trim() || createComment.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                  Post
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

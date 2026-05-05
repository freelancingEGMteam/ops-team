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
  const [description, setDescription] = React.useState("");
  const [link, setLink] = React.useState("");
  const [commentText, setCommentText] = React.useState("");
  const prevTaskId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (row && row.task.id !== prevTaskId.current) {
      prevTaskId.current = row.task.id;
      setDescription(row.task.description ?? "");
      setLink(row.task.link ?? "");
      setCommentText("");
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
    onSuccess: () => {
      if (row) qc.invalidateQueries({ queryKey: ["tasks", row.task.projectId] });
    },
  });

  const visible = !!row;

  const createComment = useMutation({
    mutationFn: (body: string) => api.comments.create(row!.task.id, body),
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({ queryKey: ["task-comments", row?.task.id] });
    },
  });

  const uploadAttachment = useMutation({
    mutationFn: (file: File) => api.attachments.upload(row!.task.id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task-attachments", row?.task.id] }),
  });

  const addComment = () => {
    if (!commentText.trim()) return;
    createComment.mutate(commentText.trim());
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300",
          visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out border-l border-slate-200"
        )}
        style={{
          width: "min(680px, 95vw)",
          transform: visible ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0f172a] px-6 py-4 flex-shrink-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Task Details
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Panel body */}
        {row && (
          <div className="flex-1 overflow-y-auto">
            {/* Title section */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <InlineTextCell
                value={row.task.name}
                onCommit={(name) => updateTask.mutate({ id: row.task.id, data: { name } })}
                className="text-xl font-bold text-slate-800"
              />
            </div>

            {/* Fields */}
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Status</p>
                  <InlineSelectCell
                    value={row.task.status}
                    options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({
                      value: v as TaskStatus,
                      label: c.label,
                    }))}
                    onCommit={(s) => updateTask.mutate({ id: row.task.id, data: { status: s } })}
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
                    onCommit={(p) => updateTask.mutate({ id: row.task.id, data: { priority: p } })}
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
                      updateTask.mutate({
                        id: row.task.id,
                        data: { channel: channel === "__none" ? null : (channel as TaskChannel) },
                      })
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
                      updateTask.mutate({
                        id: row.task.id,
                        data: { stageId: stageId === "__none" ? null : stageId },
                      })
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
                      updateTask.mutate({
                        id: row.task.id,
                        data: { assigneeId: assigneeId === "__unassigned" ? null : assigneeId },
                      })
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
                      updateTask.mutate({
                        id: row.task.id,
                        data: { dueDate: fromDateInputValue(event.target.value) },
                      })
                    }
                    className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-700 outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                    title={formatDate(row.task.dueDate)}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Google Drive Link</p>
              <input
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                placeholder="Paste Google Drive link..."
                value={link}
                onChange={(event) => setLink(event.target.value)}
                onBlur={() => {
                  if (link !== (row.task.link ?? "")) {
                    updateTask.mutate({ id: row.task.id, data: { link: link.trim() || null } });
                  }
                }}
              />
            </div>

            {/* Description */}
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Description</p>
              <textarea
                className="w-full min-h-[120px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-y transition-colors"
                placeholder="Add a description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  if (description !== (row.task.description ?? "")) {
                    updateTask.mutate({ id: row.task.id, data: { description } });
                  }
                }}
              />
            </div>

            {/* Attachments placeholder */}
            <div className="px-6 py-4 border-b border-slate-100">
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
            <div className="px-6 py-4">
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

              <div className="flex gap-2">
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

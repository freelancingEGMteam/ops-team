import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, MessageSquare, Paperclip } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import {
  type TaskRow,
  type TaskStatus,
  type TaskPriority,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InlineSelectCell, InlineTextCell } from "./TaskInlineEdit";

interface TaskDetailPanelProps {
  row: TaskRow | null;
  onClose: () => void;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  time: string;
}

export function TaskDetailPanel({ row, onClose }: TaskDetailPanelProps) {
  const qc = useQueryClient();
  const [description, setDescription] = React.useState("");
  const [commentText, setCommentText] = React.useState("");
  const [comments, setComments] = React.useState<Comment[]>([]);
  const prevTaskId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (row && row.task.id !== prevTaskId.current) {
      prevTaskId.current = row.task.id;
      setDescription(row.task.description ?? "");
    }
  }, [row?.task.id]);

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.tasks.update>[1] }) =>
      api.tasks.update(id, data),
    onSuccess: () => {
      if (row) qc.invalidateQueries({ queryKey: ["tasks", row.task.projectId] });
    },
  });

  const visible = !!row;

  const addComment = () => {
    if (!commentText.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: commentText.trim(),
        author: "You",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setCommentText("");
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

                {row.stage && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Stage</p>
                    <span className="flex items-center gap-1.5 text-sm text-slate-700">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: row.stage.color ?? "#94a3b8" }} />
                      {row.stage.name}
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Assignee</p>
                  {row.assignee ? (
                    <span className="flex items-center gap-2 text-sm text-slate-700">
                      <Avatar className="h-6 w-6">
                        {row.assignee.avatar && <AvatarImage src={row.assignee.avatar} />}
                        <AvatarFallback className="text-[10px]">{getInitials(row.assignee.name)}</AvatarFallback>
                      </Avatar>
                      {row.assignee.name}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">Unassigned</span>
                  )}
                </div>

                {row.task.dueDate !== null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Due Date</p>
                    <span className="text-sm text-slate-700">{formatDate(row.task.dueDate)}</span>
                  </div>
                )}
              </div>
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
                Click to attach a file
                <input type="file" className="hidden" />
              </label>
            </div>

            {/* Comments */}
            <div className="px-6 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Comments
              </p>

              <div className="space-y-3 mb-4">
                {comments.length === 0 && (
                  <p className="text-xs text-slate-400">No comments yet. Be the first to comment.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600 shrink-0">
                      {c.author[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700">{c.author}</span>
                        <span className="text-[10px] text-slate-400">{c.time}</span>
                      </div>
                      <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-sm text-slate-700">
                        {c.text}
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
                <Button size="sm" variant="outline" onClick={addComment} disabled={!commentText.trim()}>
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

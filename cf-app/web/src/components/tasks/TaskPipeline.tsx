import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { type Stage, type TaskRow, STATUS_CONFIG, PRIORITY_CONFIG } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskPipelineProps {
  projectId: string;
  stages: Stage[];
  rows: TaskRow[];
}

export function TaskPipeline({ projectId, stages, rows }: TaskPipelineProps) {
  const qc = useQueryClient();
  const [newTaskStage, setNewTaskStage] = React.useState<string | null>(null);
  const [newTaskName, setNewTaskName] = React.useState("");
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState<string | null>(null);

  const createTask = useMutation({
    mutationFn: ({ name, stageId }: { name: string; stageId: string }) =>
      api.tasks.create({ name, projectId, stageId }),
    onSuccess: () => {
      setNewTaskStage(null);
      setNewTaskName("");
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const moveTask = useMutation({
    mutationFn: ({ taskId, stageId }: { taskId: string; stageId: string }) =>
      api.tasks.update(taskId, { stageId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  function tasksByStage(stageId: string): TaskRow[] {
    return rows.filter((r) => r.task.stageId === stageId);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className={cn(
            "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors",
            dragOver === stage.id && "ring-2 ring-primary"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(stage.id);
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            if (dragging) moveTask.mutate({ taskId: dragging, stageId: stage.id });
          }}
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: stage.color ?? "#94a3b8" }}
              />
              <span className="text-sm font-medium">{stage.name}</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {tasksByStage(stage.id).length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setNewTaskStage(stage.id);
                setNewTaskName("");
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Task cards */}
          <div className="flex flex-col gap-2 px-2 pb-2">
            {tasksByStage(stage.id).map((row) => (
              <TaskCard
                key={row.task.id}
                row={row}
                onDragStart={() => setDragging(row.task.id)}
                onDragEnd={() => setDragging(null)}
              />
            ))}

            {/* Inline new task */}
            {newTaskStage === stage.id ? (
              <form
                className="rounded-lg border bg-card p-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newTaskName.trim()) {
                    createTask.mutate({ name: newTaskName.trim(), stageId: stage.id });
                  }
                }}
              >
                <Input
                  autoFocus
                  placeholder="Task name…"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="mb-2 h-7 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setNewTaskStage(null);
                  }}
                />
                <div className="flex gap-1.5">
                  <Button type="submit" size="sm" className="h-7 text-xs" disabled={!newTaskName.trim()}>
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setNewTaskStage(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskCard({
  row,
  onDragStart,
  onDragEnd,
}: {
  row: TaskRow;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const { task, assignee } = row;
  const statusCfg = STATUS_CONFIG[task.status];
  const priorityCfg = PRIORITY_CONFIG[task.priority];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing active:shadow-lg"
    >
      <p className="mb-2 text-sm font-medium leading-snug">{task.name}</p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", statusCfg.bg, statusCfg.color)}
          >
            {statusCfg.label}
          </span>
          <span className={cn("text-[10px] font-medium", priorityCfg.color)}>
            {priorityCfg.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {task.dueDate && <span>{formatDate(task.dueDate)}</span>}
          {assignee && (
            <Avatar className="h-5 w-5">
              {assignee.avatar && <AvatarImage src={assignee.avatar} alt={assignee.name} />}
              <AvatarFallback className="text-[9px]">{getInitials(assignee.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}

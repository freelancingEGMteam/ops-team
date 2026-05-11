import * as React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, LayoutGrid, List } from "lucide-react";
import { api } from "@/lib/api";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskPipeline } from "@/components/tasks/TaskPipeline";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { ProjectShareDialog } from "@/components/projects/ProjectShareDialog";
import { Button } from "@/components/ui/button";
import { STANDARD_STAGE_NAMES } from "@/lib/stages";
import { type TaskRow } from "@/types";

type ViewMode = "table" | "pipeline" | "calendar";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [view, setView] = React.useState<ViewMode>("table");
  const [selectedRow, setSelectedRow] = React.useState<TaskRow | null>(null);
  const taskIdFromUrl = searchParams.get("task");
  const mentionIdFromUrl = searchParams.get("mention");

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.projects.get(id!),
    enabled: !!id,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["stages", id],
    queryFn: () => api.stages.list(id!),
    enabled: !!id,
  });

  const { data: taskRows = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => api.tasks.list(id!),
    enabled: !!id,
  });

  const workflowStages = React.useMemo(() => {
    const byName = new Map<string, (typeof stages)[number]>();
    for (const stage of stages) {
      if (!byName.has(stage.name)) byName.set(stage.name, stage);
    }
    const uniqueStages = Array.from(byName.values());
    const standard = uniqueStages
      .filter((stage) => STANDARD_STAGE_NAMES.includes(stage.name))
      .sort(
        (a, b) =>
          STANDARD_STAGE_NAMES.indexOf(a.name) - STANDARD_STAGE_NAMES.indexOf(b.name)
      );
    return standard.length > 0
      ? standard
      : uniqueStages.sort((a, b) => a.orderIndex - b.orderIndex);
  }, [stages]);

  React.useEffect(() => {
    if (!selectedRow) return;
    const freshRow = taskRows.find((row) => row.task.id === selectedRow.task.id);
    if (freshRow && freshRow !== selectedRow) {
      setSelectedRow(freshRow);
    }
  }, [selectedRow, taskRows]);

  const markMentionRead = useMutation({
    mutationFn: api.mentions.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mentions"] }),
  });

  React.useEffect(() => {
    if (!taskIdFromUrl || taskRows.length === 0) return;
    const row = taskRows.find((item) => item.task.id === taskIdFromUrl);
    if (row) setSelectedRow(row);
  }, [taskIdFromUrl, taskRows]);

  React.useEffect(() => {
    if (mentionIdFromUrl) markMentionRead.mutate(mentionIdFromUrl);
  }, [mentionIdFromUrl]);

  if (projectLoading) {
    return <div className="text-muted-foreground text-sm">Loading project…</div>;
  }

  if (!project) {
    return <div className="text-destructive text-sm">Project not found.</div>;
  }

  return (
    <>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
            <h1 className="truncate text-lg font-bold sm:text-xl">{project.name}</h1>
          </div>
          <div className="flex w-full items-center gap-2 overflow-x-auto sm:w-auto">
            <ProjectShareDialog projectId={id!} />
            <div className="flex shrink-0 items-center gap-1 rounded-lg border p-0.5">
              <Button
                variant={view === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 shrink-0 sm:h-7"
                onClick={() => setView("table")}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </Button>
              <Button
                variant={view === "pipeline" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 shrink-0 sm:h-7"
                onClick={() => setView("pipeline")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Pipeline
              </Button>
              <Button
                variant={view === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 shrink-0 sm:h-7"
                onClick={() => setView("calendar")}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Calendar
              </Button>
            </div>
          </div>
        </div>

        {tasksLoading ? (
          <div className="text-sm text-muted-foreground">Loading tasks…</div>
        ) : view === "table" ? (
          <TaskTable
            projectId={id!}
            stages={workflowStages}
            rows={taskRows}
            onRowClick={(row) => setSelectedRow(row)}
          />
        ) : view === "pipeline" ? (
          <TaskPipeline projectId={id!} stages={workflowStages} rows={taskRows} />
        ) : (
          <TaskCalendar rows={taskRows} />
        )}
      </div>

      <TaskDetailPanel
        row={selectedRow}
        stages={workflowStages}
        onClose={() => setSelectedRow(null)}
      />
    </>
  );
}

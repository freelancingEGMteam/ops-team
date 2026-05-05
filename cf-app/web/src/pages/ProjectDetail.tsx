import * as React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LayoutGrid, List } from "lucide-react";
import { api } from "@/lib/api";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskPipeline } from "@/components/tasks/TaskPipeline";
import { TaskCalendar } from "@/components/tasks/TaskCalendar";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { Button } from "@/components/ui/button";
import { STANDARD_STAGE_NAMES } from "@/lib/stages";
import { type TaskRow } from "@/types";

type ViewMode = "table" | "pipeline" | "calendar";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = React.useState<ViewMode>("table");
  const [selectedRow, setSelectedRow] = React.useState<TaskRow | null>(null);

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

  if (projectLoading) {
    return <div className="text-muted-foreground text-sm">Loading project…</div>;
  }

  if (!project) {
    return <div className="text-destructive text-sm">Project not found.</div>;
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
            <h1 className="text-xl font-bold">{project.name}</h1>
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <Button
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-7"
              onClick={() => setView("table")}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </Button>
            <Button
              variant={view === "pipeline" ? "secondary" : "ghost"}
              size="sm"
              className="h-7"
              onClick={() => setView("pipeline")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Pipeline
            </Button>
            <Button
              variant={view === "calendar" ? "secondary" : "ghost"}
              size="sm"
              className="h-7"
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </Button>
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

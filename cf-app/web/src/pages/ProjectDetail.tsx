import * as React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List } from "lucide-react";
import { api } from "@/lib/api";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { Button } from "@/components/ui/button";

type ViewMode = "table" | "board";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = React.useState<ViewMode>("table");

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

  if (projectLoading) {
    return <div className="text-muted-foreground text-sm">Loading project…</div>;
  }

  if (!project) {
    return <div className="text-destructive text-sm">Project not found.</div>;
  }

  return (
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
            variant={view === "board" ? "secondary" : "ghost"}
            size="sm"
            className="h-7"
            onClick={() => setView("board")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </Button>
        </div>
      </div>

      {tasksLoading ? (
        <div className="text-sm text-muted-foreground">Loading tasks…</div>
      ) : view === "table" ? (
        <TaskTable projectId={id!} rows={taskRows} />
      ) : (
        <TaskBoard projectId={id!} stages={stages} rows={taskRows} />
      )}
    </div>
  );
}

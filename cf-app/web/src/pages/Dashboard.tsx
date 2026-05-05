import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleDashed, FolderKanban, ListTodo, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { type TaskRow, type TaskStatus } from "@/types";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  });

  const { data: taskRowsByProject = [] } = useQuery({
    queryKey: ["dashboard-tasks", projects.map((project) => project.id).join(",")],
    queryFn: async () => {
      const all = await Promise.all(projects.map((project) => api.tasks.list(project.id)));
      return all.flat();
    },
    enabled: projects.length > 0,
  });

  const counts = taskRowsByProject.reduce<Record<TaskStatus, number>>(
    (acc, row: TaskRow) => {
      acc[row.task.status] += 1;
      return acc;
    },
    { todo: 0, in_progress: 0, in_review: 0, done: 0, cancelled: 0 }
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl font-bold sm:text-2xl">
          {greeting}, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">Here's what's going on today.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 lg:grid-cols-5">
        <StatCard label="To Do" value={counts.todo} icon={<ListTodo className="h-5 w-5 text-slate-500" />} />
        <StatCard label="In Progress" value={counts.in_progress} icon={<CircleDashed className="h-5 w-5 text-blue-500" />} />
        <StatCard label="In Review" value={counts.in_review} icon={<CircleDashed className="h-5 w-5 text-violet-500" />} />
        <StatCard label="Done" value={counts.done} icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} />
        <StatCard label="Cancelled" value={counts.cancelled} icon={<CircleDashed className="h-5 w-5 text-red-500" />} />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Button asChild size="sm" variant="outline">
          <Link to="/projects/new">
            <Plus className="h-3.5 w-3.5" />
            New project
          </Link>
        </Button>
      </div>

      {projects.length === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <FolderKanban className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm">No projects yet.</p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/projects/new">Create your first project</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="group rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="font-medium group-hover:text-primary transition-colors">
                {p.name}
              </span>
            </div>
            {p.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

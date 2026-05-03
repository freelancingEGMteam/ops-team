import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FolderKanban, CheckSquare, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {greeting}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Here's what's going on today.</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Projects"
          value={projects?.length ?? 0}
          icon={<FolderKanban className="h-5 w-5 text-primary" />}
        />
        <StatCard
          label="Open Tasks"
          value="—"
          icon={<CheckSquare className="h-5 w-5 text-emerald-500" />}
        />
      </div>

      {/* Projects grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Button asChild size="sm" variant="outline">
          <Link to="/projects/new">
            <Plus className="h-3.5 w-3.5" />
            New project
          </Link>
        </Button>
      </div>

      {projects?.length === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <FolderKanban className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm">No projects yet.</p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/projects/new">Create your first project</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((p) => (
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
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Clock3,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/time-tracker", icon: Clock3, label: "Time Tracker" },
  { to: "/users", icon: Users, label: "Users" },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  });

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 font-bold text-primary">
        <span className="text-lg">⚡ Ops</span>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Projects section */}
      <div className="mt-4 px-2">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Projects
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => navigate("/projects/new")}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="mt-1 flex flex-col gap-0.5">
          {projects?.slice(0, 8).map((p) => (
            <NavLink
              key={p.id}
              to={`/projects/${p.id}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto border-t p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="text-xs">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user?.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

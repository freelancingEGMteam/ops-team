import type * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Clock3,
  FolderKanban,
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

  function handleNavClick(event: React.MouseEvent<HTMLAnchorElement>, to: string) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    navigate(to);

    const target = new URL(to, window.location.origin);
    window.setTimeout(() => {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const targetPath = `${target.pathname}${target.search}${target.hash}`;
      if (currentPath !== targetPath) {
        window.location.assign(target.href);
      }
    }, 100);
  }

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  });

  return (
    <aside className="sticky top-0 z-[2000] flex w-full shrink-0 flex-col border-b bg-card md:h-screen md:w-56 md:border-b-0 md:border-r">
      {/* Logo */}
      <div className="flex h-10 items-center px-3 font-bold text-primary sm:h-12 md:h-14 md:px-4">
        <span className="text-lg">⚡ Ops</span>
      </div>

      {/* Primary nav */}
      <nav className="pointer-events-auto flex gap-1 overflow-x-auto px-2 pb-1.5 md:flex-col md:gap-0.5 md:py-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={(event) => handleNavClick(event, to)}
            className={({ isActive }) =>
              cn(
                "relative z-[2001] flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:gap-2.5 sm:px-3 sm:py-2 sm:text-sm",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {label}
          </NavLink>
        ))}
        {projects?.slice(0, 8).map((p) => (
          <NavLink
            key={p.id}
            to={`/projects/${p.id}`}
            onClick={(event) => handleNavClick(event, `/projects/${p.id}`)}
            className={({ isActive }) =>
              cn(
                "relative z-[2001] flex max-w-[12rem] shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:max-w-none sm:gap-2.5 sm:px-3 sm:py-2 sm:text-sm md:shrink",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <FolderKanban className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate">{p.name}</span>
          </NavLink>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="relative z-[2001] h-7 w-7 shrink-0 md:h-8 md:w-8"
          onClick={() => navigate("/projects/new")}
          title="New project"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </nav>

      {/* Footer */}
      <div className="mt-auto hidden border-t p-3 md:block">
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

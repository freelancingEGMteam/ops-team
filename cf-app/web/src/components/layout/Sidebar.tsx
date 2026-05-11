import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Clock3,
  FolderKanban,
  LogOut,
  Users,
  AtSign,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UndoRedoControls } from "@/lib/undo-redo";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/time-tracker", icon: Clock3, label: "Time Tracker" },
  { to: "/mentions", icon: AtSign, label: "My Mentions" },
  { to: "/users", icon: Users, label: "Users" },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects.list,
  });

  return (
    <aside className="app-sidebar relative z-[2000] flex w-full shrink-0 flex-col border-b border-slate-800 bg-[#061a33] text-slate-100 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:border-b-0 lg:border-r">
      {/* Logo */}
      <div className="flex h-12 items-center justify-between gap-2 px-3 font-bold text-white lg:h-14 lg:px-4">
        <span className="text-lg">⚡ Ops</span>
        <UndoRedoControls />
      </div>

      {/* Primary nav */}
      <nav className="pointer-events-auto flex gap-1 overflow-x-auto px-2 pb-1.5 lg:flex-col lg:gap-0.5 lg:py-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            reloadDocument
            className={({ isActive }) =>
              cn(
                "relative z-[2001] flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:gap-2.5 sm:px-3 sm:py-2 sm:text-sm",
                isActive
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
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
            reloadDocument
            className={({ isActive }) =>
              cn(
                "relative z-[2001] flex max-w-[12rem] shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:max-w-none sm:gap-2.5 sm:px-3 sm:py-2 sm:text-sm lg:shrink",
                isActive
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )
            }
          >
            <FolderKanban className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate">{p.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto hidden border-t border-white/10 p-3 lg:block">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            {user?.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="text-xs">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{user?.name}</p>
            <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

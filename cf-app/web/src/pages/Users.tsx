import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users as UsersIcon, Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { type User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-red-100 text-red-700",
  admin: "bg-purple-100 text-purple-700",
  member: "bg-blue-100 text-blue-700",
};

type EditableUserRole = Extract<User["role"], "admin" | "member">;
type UserUpdateInput = {
  name?: string;
  avatar?: string | null;
  role?: EditableUserRole;
};

export function UsersPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [drafts, setDrafts] = React.useState<Record<string, Pick<User, "name" | "avatar" | "role">>>(
    {}
  );
  const [newUser, setNewUser] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "member" as EditableUserRole,
  });

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: api.users.list,
  });
  const { data: currentUser } = useQuery<User>({
    queryKey: ["me"],
    queryFn: api.users.me,
  });
  const canManageUsers = currentUser?.role === "owner" || currentUser?.role === "admin";

  React.useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const user of users) {
        if (!next[user.id]) {
          next[user.id] = { name: user.name, avatar: user.avatar, role: user.role };
        }
      }
      return next;
    });
  }, [users]);

  const createUser = useMutation({
    mutationFn: () =>
      api.users.create({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
      }),
    onSuccess: () => {
      setNewUser({ name: "", email: "", password: "", role: "member" });
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast("User added");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "User add failed", "error");
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateInput }) =>
      api.users.update(id, data),
    onSuccess: (updated) => {
      setDrafts((current) => ({
        ...current,
        [updated.id]: { name: updated.name, avatar: updated.avatar, role: updated.role },
      }));
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast("User saved");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "User save failed", "error");
    },
  });

  const deleteUser = useMutation({
    mutationFn: api.users.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      showToast("User removed");
    },
    onError: (error) => {
      showToast(error instanceof Error ? error.message : "User remove failed", "error");
    },
  });

  function updateDraft(id: string, patch: Partial<Pick<User, "name" | "avatar" | "role">>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        name: current[id]?.name ?? "",
        avatar: current[id]?.avatar ?? null,
        role: current[id]?.role ?? "member",
        ...patch,
      },
    }));
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <UsersIcon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">User Management</h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            All registered accounts in this organization. Use these users when assigning tasks.
          </p>
        </div>
        <div className="w-full rounded-xl border bg-card px-4 py-2 text-center sm:w-auto">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
      </div>

      {canManageUsers && (
        <form
          className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-[1fr_1fr_1fr_130px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (newUser.name.trim() && newUser.email.trim() && newUser.password.length >= 8) {
              createUser.mutate();
            }
          }}
        >
          <Input
            placeholder="Name"
            value={newUser.name}
            onChange={(event) => setNewUser((user) => ({ ...user, name: event.target.value }))}
          />
          <Input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(event) => setNewUser((user) => ({ ...user, email: event.target.value }))}
          />
          <Input
            type="password"
            placeholder="Temporary password"
            value={newUser.password}
            onChange={(event) => setNewUser((user) => ({ ...user, password: event.target.value }))}
          />
          <select
            value={newUser.role}
            onChange={(event) =>
              setNewUser((user) => ({
                ...user,
                role: event.target.value as EditableUserRole,
              }))
            }
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <Button
            type="submit"
            disabled={!newUser.name.trim() || !newUser.email.trim() || newUser.password.length < 8}
          >
            <UserPlus className="h-4 w-4" />
            Add user
          </Button>
        </form>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <UsersIcon className="h-12 w-12 opacity-30" />
          <p>No users found.</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border">
          <table className="min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b bg-[#0f172a]">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Created</th>
                {canManageUsers && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const draft = drafts[user.id] ?? user;
                const canEditRow =
                  canManageUsers && (user.role !== "owner" || currentUser?.role === "owner");
                const changed =
                  draft.name !== user.name ||
                  (draft.avatar ?? null) !== (user.avatar ?? null) ||
                  draft.role !== user.role;

                return (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {draft.avatar && <AvatarImage src={draft.avatar} alt={draft.name} />}
                          <AvatarFallback className="text-xs">{getInitials(draft.name)}</AvatarFallback>
                        </Avatar>
                        {canEditRow ? (
                          <Input
                            value={draft.name}
                            onChange={(event) => updateDraft(user.id, { name: event.target.value })}
                            className="h-8 min-w-48"
                          />
                        ) : (
                          <span className="font-medium text-slate-800">{user.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canEditRow && user.role !== "owner" ? (
                        <select
                          value={draft.role}
                          onChange={(event) =>
                            updateDraft(user.id, {
                              role: event.target.value as EditableUserRole,
                            })
                          }
                          className="h-8 rounded-md border bg-background px-2 text-sm capitalize"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          ROLE_STYLES[user.role] ?? "bg-gray-100 text-gray-600"
                        )}>
                          <ShieldCheck className="h-3 w-3" />
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    {canManageUsers && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canEditRow || !changed || !draft.name.trim() || updateUser.isPending}
                            onClick={() => {
                              const data: UserUpdateInput = {
                                name: draft.name.trim(),
                                avatar: draft.avatar || null,
                              };
                              if (user.role !== "owner") data.role = draft.role as EditableUserRole;
                              updateUser.mutate({ id: user.id, data });
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-destructive"
                            disabled={user.id === currentUser?.id || user.role === "owner" || deleteUser.isPending}
                            onClick={() => {
                              if (window.confirm(`Remove ${user.name}?`)) deleteUser.mutate(user.id);
                            }}
                            title="Remove user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

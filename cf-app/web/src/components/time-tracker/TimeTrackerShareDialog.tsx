import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Trash2, UserPlus, X } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TimeTrackerMember, User } from "@/types";
import { useUndoRedo } from "@/lib/undo-redo";

type ShareRole = "admin" | "member";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function sortUsers(users: User[]) {
  return [...users].sort((a, b) => a.name.localeCompare(b.name));
}

function sortMembers(members: TimeTrackerMember[]) {
  const order = { owner: 0, admin: 1, member: 2 };
  return [...members].sort((a, b) => {
    const roleSort = order[a.role] - order[b.role];
    return roleSort || a.user.name.localeCompare(b.user.name);
  });
}

function getShareErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 404) {
    return "Time Tracker sharing is not active on the API yet. Deploy the Worker API, then try again.";
  }

  return error instanceof Error ? error.message : "Could not share Time Tracker.";
}

export function TimeTrackerShareDialog() {
  const queryClient = useQueryClient();
  const { record } = useUndoRedo();
  const [open, setOpen] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<ShareRole>("member");

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: api.users.list,
    enabled: open,
  });

  const {
    data: members = [],
    error: membersError,
    isError: membersIsError,
    isLoading,
  } = useQuery({
    queryKey: ["time-tracker-members"],
    queryFn: api.timeEntries.members,
    enabled: open,
  });

  const memberUserIds = React.useMemo(
    () => new Set(members.map((member) => member.user.id)),
    [members]
  );
  const availableUsers = React.useMemo(
    () => sortUsers(users.filter((user) => !memberUserIds.has(user.id))),
    [memberUserIds, users]
  );
  const sortedMembers = React.useMemo(() => sortMembers(members), [members]);

  const addMember = useMutation({
    mutationFn: () =>
      api.timeEntries.addMember({
        userId: selectedUserId,
        role: selectedRole,
      }),
    onSuccess: async () => {
      const userId = selectedUserId;
      const role = selectedRole;
      record({
        label: "time tracker member add",
        undo: async () => {
          await api.timeEntries.removeMember(userId);
          await queryClient.invalidateQueries({ queryKey: ["time-tracker-members"] });
        },
        redo: async () => {
          await api.timeEntries.addMember({ userId, role });
          await queryClient.invalidateQueries({ queryKey: ["time-tracker-members"] });
        },
      });
      setSelectedUserId("");
      setSelectedRole("member");
      await queryClient.invalidateQueries({ queryKey: ["time-tracker-members"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: api.timeEntries.removeMember,
    onSuccess: async (_result, userId) => {
      const member = members.find((item) => item.user.id === userId);
      if (member) {
        record({
          label: "time tracker member removal",
          undo: async () => {
            await api.timeEntries.addMember({
              userId,
              role: member.role === "admin" ? "admin" : "member",
            });
            await queryClient.invalidateQueries({ queryKey: ["time-tracker-members"] });
          },
          redo: async () => {
            await api.timeEntries.removeMember(userId);
            await queryClient.invalidateQueries({ queryKey: ["time-tracker-members"] });
          },
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["time-tracker-members"] });
    },
  });

  return (
    <>
      <Button variant="outline" size="sm" className="h-8 shrink-0 sm:h-7" onClick={() => setOpen(true)}>
        <Share2 className="h-3.5 w-3.5" />
        Share View
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/40 sm:items-center sm:justify-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close share dialog"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-[81] flex max-h-[92vh] w-full flex-col rounded-t-xl border bg-background shadow-xl sm:max-w-xl sm:rounded-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Share Time Tracker</h2>
                <p className="text-sm text-muted-foreground">
                  Add existing users so they can see this Time Tracker view.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={availableUsers.length ? "Select user" : "All users already added"} />
                  </SelectTrigger>
                  <SelectContent className="z-[90]">
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} - {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as ShareRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[90]">
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  disabled={!selectedUserId || addMember.isPending}
                  onClick={() => addMember.mutate()}
                >
                  <UserPlus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {addMember.isError ? (
                <p className="mt-2 text-sm text-destructive">
                  {getShareErrorMessage(addMember.error)}
                </p>
              ) : null}

              <div className="mt-5 overflow-hidden rounded-lg border">
                <div className="bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current Members
                </div>
                {isLoading ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">Loading members...</div>
                ) : membersIsError ? (
                  <div className="px-4 py-6 text-sm text-destructive">
                    {getShareErrorMessage(membersError)}
                  </div>
                ) : (
                  <div className="divide-y">
                    {sortedMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{member.user.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{member.user.email}</div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-medium capitalize",
                            member.role === "owner"
                              ? "bg-blue-100 text-blue-700"
                              : member.role === "admin"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-slate-100 text-slate-700"
                          )}
                        >
                          {member.role}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={
                            member.role === "owner" ||
                            member.id.startsWith("global-") ||
                            member.id.startsWith("bootstrap-") ||
                            removeMember.isPending
                          }
                          onClick={() => removeMember.mutate(member.user.id)}
                          aria-label={`Remove ${member.user.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {removeMember.isError ? (
                <p className="mt-2 text-sm text-destructive">
                  {removeMember.error instanceof Error ? removeMember.error.message : "Could not remove user."}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

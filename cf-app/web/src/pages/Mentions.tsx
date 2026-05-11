import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/types";

export function MentionsPage() {
  const queryClient = useQueryClient();
  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ["mentions"],
    queryFn: api.mentions.list,
  });
  const unreadMentions = mentions.filter((mention) => !mention.readAt);

  const markRead = useMutation({
    mutationFn: api.mentions.markRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["mentions"] });
      const previous = queryClient.getQueryData<typeof mentions>(["mentions"]);
      queryClient.setQueryData<typeof mentions>(["mentions"], (current) =>
        current?.filter((mention) => mention.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(["mentions"], context?.previous ?? []);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["mentions"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold sm:text-xl">My Mentions</h1>
        <p className="text-sm text-muted-foreground">
          Comments where teammates tagged you.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-white px-4 py-8 text-sm text-muted-foreground">
          Loading mentions...
        </div>
      ) : unreadMentions.length === 0 ? (
        <div className="rounded-lg border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
          No mentions yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <div className="divide-y">
            {unreadMentions.map((mention) => (
              <article
                key={mention.id}
                className={cn(
                  "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start",
                  !mention.readAt && "bg-indigo-50/50"
                )}
              >
                <Avatar className="h-9 w-9 shrink-0">
                  {mention.author.avatar && (
                    <AvatarImage src={mention.author.avatar} alt={mention.author.name} />
                  )}
                  <AvatarFallback className="text-xs">
                    {getInitials(mention.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{mention.author.name}</span>
                    <span className="text-sm text-muted-foreground">mentioned you in</span>
                    <Link
                      to={`/projects/${mention.project.id}?task=${mention.task.id}&mention=${mention.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {mention.task.name}
                    </Link>
                    {!mention.readAt && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                        New
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className="rounded-full px-2 py-0.5 font-medium"
                      style={{ backgroundColor: mention.project.color ?? "#e0e7ff" }}
                    >
                      {mention.project.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-medium",
                        STATUS_CONFIG[mention.task.status].bg,
                        STATUS_CONFIG[mention.task.status].color
                      )}
                    >
                      {STATUS_CONFIG[mention.task.status].label}
                    </span>
                    <span className={cn("font-medium", PRIORITY_CONFIG[mention.task.priority].color)}>
                      {PRIORITY_CONFIG[mention.task.priority].label}
                    </span>
                    <span className="text-muted-foreground">{formatDate(mention.createdAt)}</span>
                  </div>
                  <p className="mt-3 rounded-lg border bg-white px-3 py-2 text-sm text-slate-700">
                    {mention.comment.body}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link
                    to={`/projects/${mention.project.id}?task=${mention.task.id}&mention=${mention.id}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  disabled={markRead.isPending}
                  onClick={() => markRead.mutate(mention.id)}
                >
                  Mark as read
                </Button>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

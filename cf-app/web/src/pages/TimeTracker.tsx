import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Share2, Trash2, X } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { TimeEntry, TimeEntryChannel, TimeEntryStatus } from "@/types";

type EditableEntry = {
  id: string;
  startDate: string;
  task: string;
  price: string;
  channel: "None" | TimeEntryChannel;
  deliveryDate: string;
  status: TimeEntryStatus;
  userName: string;
};

type DraftEntry = Omit<EditableEntry, "id" | "userName">;

function formatDateInput(value: number | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function dateToIso(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}

function mapEntry(entry: TimeEntry): EditableEntry {
  return {
    id: entry.id,
    startDate: formatDateInput(entry.startDate),
    task: entry.task,
    price: entry.price.toFixed(2),
    channel: entry.channel ?? "None",
    deliveryDate: formatDateInput(entry.deliveryDate),
    status: entry.status,
    userName: entry.user?.name ?? "Unknown",
  };
}

const emptyDraft: DraftEntry = {
  startDate: "",
  task: "",
  price: "",
  channel: "None",
  deliveryDate: "",
  status: "Pending",
};

export function TimeTrackerPage() {
  const queryClient = useQueryClient();
  const [entries, setEntries] = React.useState<EditableEntry[]>([]);
  const [draft, setDraft] = React.useState<DraftEntry>(emptyDraft);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["time-entries"],
    queryFn: api.timeEntries.list,
  });

  React.useEffect(() => {
    setEntries(data.map(mapEntry));
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<EditableEntry> }) =>
      api.timeEntries.update(id, {
        ...(patch.startDate !== undefined ? { startDate: dateToIso(patch.startDate) } : {}),
        ...(patch.task !== undefined ? { task: patch.task } : {}),
        ...(patch.price !== undefined ? { price: Number(patch.price || 0) } : {}),
        ...(patch.channel !== undefined
          ? { channel: patch.channel === "None" ? null : patch.channel }
          : {}),
        ...(patch.deliveryDate !== undefined
          ? { deliveryDate: dateToIso(patch.deliveryDate) }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.timeEntries.create({
        startDate: dateToIso(draft.startDate),
        task: draft.task.trim(),
        price: Number(draft.price || 0),
        channel: draft.channel === "None" ? null : draft.channel,
        deliveryDate: dateToIso(draft.deliveryDate),
        status: draft.status,
      }),
    onSuccess: async (entry) => {
      if (entry) {
        setEntries((current) => {
          const next = mapEntry(entry);
          return current.some((item) => item.id === next.id) ? current : [...current, next];
        });
      }
      setDraft(emptyDraft);
      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.timeEntries.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
  });

  const total = entries.reduce((sum, entry) => sum + Number(entry.price || 0), 0);
  const completed = entries.filter((entry) => entry.status === "Done").length;

  function updateEntry(id: string, patch: Partial<EditableEntry>, save = false) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );

    if (save) updateMutation.mutate({ id, patch });
  }

  function saveEntry(id: string, patch: Partial<EditableEntry>) {
    updateMutation.mutate({ id, patch });
  }

  function addEntry() {
    if (!draft.task.trim()) return;
    createMutation.mutate();
  }

  async function copyShareLink() {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
      setCopyError("");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyError("Copy failed. Select the link and copy it manually.");
    }
  }

  function getCreateErrorMessage() {
    const error = createMutation.error;
    if (error instanceof ApiError && error.status === 404) {
      return "Time Tracker sharing is not active on the API yet. Deploy the Worker API, then try again.";
    }

    if (error instanceof ApiError && error.status >= 500) {
      return "The shared Time Tracker database is not ready yet. Apply the production migration, then try again.";
    }

    return error instanceof Error ? error.message : "Could not add this time entry.";
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold sm:text-xl">Time Tracker</h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 sm:h-7"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share View
          </Button>
        </div>
        <div className="flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold sm:w-auto sm:gap-4 sm:px-4">
          <button type="button" className="px-2 text-muted-foreground">{"<"}</button>
          <span>Shared entries</span>
          <button type="button" className="px-2 text-muted-foreground">{">"}</button>
          <button type="button" className="rounded-md border px-3 py-1 text-xs">All time</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary label="Total Entries" value={String(entries.length)} />
        <Summary label="Total Earned" value={`$${total.toFixed(2)}`} accent />
        <Summary label="Completed" value={`${completed} / ${entries.length}`} />
      </div>

      <div className="space-y-3 sm:hidden">
        {isLoading ? (
          <div className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            Loading shared time entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            No time entries yet.
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="space-y-3 rounded-lg border bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <input
                  value={entry.task}
                  onChange={(event) => updateEntry(entry.id, { task: event.target.value })}
                  onBlur={(event) => saveEntry(entry.id, { task: event.target.value })}
                  className="h-9 min-w-0 flex-1 rounded-md border px-2 font-medium"
                />
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(entry.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-destructive"
                  title="Delete entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={entry.startDate}
                  onChange={(event) =>
                    updateEntry(entry.id, { startDate: event.target.value }, true)
                  }
                  className="h-9 rounded-md border px-2 text-sm"
                />
                <input
                  type="number"
                  step="0.01"
                  value={entry.price}
                  onChange={(event) => updateEntry(entry.id, { price: event.target.value })}
                  onBlur={(event) => saveEntry(entry.id, { price: event.target.value })}
                  className="h-9 rounded-md border px-2 text-sm font-semibold text-emerald-700"
                />
                <ChannelSelect
                  value={entry.channel}
                  onChange={(channel) => updateEntry(entry.id, { channel }, true)}
                />
                <StatusSelect
                  value={entry.status}
                  onChange={(status) => updateEntry(entry.id, { status }, true)}
                />
                <input
                  type="date"
                  value={entry.deliveryDate}
                  onChange={(event) =>
                    updateEntry(entry.id, { deliveryDate: event.target.value }, true)
                  }
                  className="h-9 rounded-md border px-2 text-sm"
                />
                <div className="flex h-9 items-center rounded-md border px-2 text-sm text-muted-foreground">
                  {entry.userName}
                </div>
              </div>
            </article>
          ))
        )}

        <form
          className="grid gap-2 rounded-lg border bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault();
            addEntry();
          }}
        >
          <input
            placeholder="Task name..."
            value={draft.task}
            onChange={(event) => setDraft((entry) => ({ ...entry, task: event.target.value }))}
            className="h-9 rounded-md border px-2"
          />
          {createMutation.isError ? (
            <p className="text-sm text-destructive">{getCreateErrorMessage()}</p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={draft.startDate}
              onChange={(event) =>
                setDraft((entry) => ({ ...entry, startDate: event.target.value }))
              }
              className="h-9 rounded-md border px-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={draft.price}
              onChange={(event) => setDraft((entry) => ({ ...entry, price: event.target.value }))}
              className="h-9 rounded-md border px-2 text-sm"
            />
            <ChannelSelect
              value={draft.channel}
              onChange={(channel) => setDraft((entry) => ({ ...entry, channel }))}
            />
            <StatusSelect
              value={draft.status}
              onChange={(status) => setDraft((entry) => ({ ...entry, status }))}
            />
            <input
              type="date"
              value={draft.deliveryDate}
              onChange={(event) =>
                setDraft((entry) => ({ ...entry, deliveryDate: event.target.value }))
              }
              className="h-9 rounded-md border px-2 text-sm"
            />
            <button
              type="submit"
              disabled={!draft.task.trim() || createMutation.isPending}
              className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      <div className="hidden overflow-auto rounded-lg border bg-white sm:block">
        <table className="min-w-[1080px] text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Start Date</th>
              <th className="px-4 py-3 text-left">Task</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Channel</th>
              <th className="px-4 py-3 text-left">Delivery Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Added By</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="border-t">
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Loading shared time entries...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr className="border-t">
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No time entries yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-t">
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={entry.startDate}
                      onChange={(event) =>
                        updateEntry(entry.id, { startDate: event.target.value }, true)
                      }
                      className="h-8 rounded-md border px-2"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={entry.task}
                      onChange={(event) => updateEntry(entry.id, { task: event.target.value })}
                      onBlur={(event) => saveEntry(entry.id, { task: event.target.value })}
                      className="h-8 w-full rounded-md border px-2 font-medium"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={entry.price}
                      onChange={(event) => updateEntry(entry.id, { price: event.target.value })}
                      onBlur={(event) => saveEntry(entry.id, { price: event.target.value })}
                      className="h-8 w-28 rounded-md border px-2 font-semibold text-emerald-700"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ChannelSelect
                      value={entry.channel}
                      onChange={(channel) => updateEntry(entry.id, { channel }, true)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={entry.deliveryDate}
                      onChange={(event) =>
                        updateEntry(entry.id, { deliveryDate: event.target.value }, true)
                      }
                      className="h-8 rounded-md border px-2"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect
                      value={entry.status}
                      onChange={(status) => updateEntry(entry.id, { status }, true)}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.userName}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(entry.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-destructive"
                      title="Delete entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
            <tr className="border-t bg-slate-50">
              <td className="px-4 py-3">
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) =>
                    setDraft((entry) => ({ ...entry, startDate: event.target.value }))
                  }
                  className="h-8 rounded-md border px-2"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  placeholder="Task name..."
                  value={draft.task}
                  onChange={(event) =>
                    setDraft((entry) => ({ ...entry, task: event.target.value }))
                  }
                  className="h-8 rounded-md border px-2"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={draft.price}
                  onChange={(event) =>
                    setDraft((entry) => ({ ...entry, price: event.target.value }))
                  }
                  className="h-8 w-24 rounded-md border px-2"
                />
              </td>
              <td className="px-4 py-3">
                <ChannelSelect
                  value={draft.channel}
                  onChange={(channel) => setDraft((entry) => ({ ...entry, channel }))}
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="date"
                  value={draft.deliveryDate}
                  onChange={(event) =>
                    setDraft((entry) => ({ ...entry, deliveryDate: event.target.value }))
                  }
                  className="h-8 rounded-md border px-2"
                />
              </td>
              <td className="px-4 py-3">
                <StatusSelect
                  value={draft.status}
                  onChange={(status) => setDraft((entry) => ({ ...entry, status }))}
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground">You</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={addEntry}
                  disabled={!draft.task.trim() || createMutation.isPending}
                  className="h-8 rounded-md border px-3 text-sm disabled:opacity-50"
                >
                  Add
                </button>
              </td>
            </tr>
            {createMutation.isError ? (
              <tr className="border-t bg-red-50">
                <td colSpan={8} className="px-4 py-3 text-sm text-destructive">
                  {getCreateErrorMessage()}
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot className="border-t bg-slate-50 font-semibold">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground">
                Total
              </td>
              <td className="px-4 py-3 text-emerald-700">${total.toFixed(2)}</td>
              <td colSpan={5} />
            </tr>
          </tfoot>
        </table>
      </div>

      {shareOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/40 sm:items-center sm:justify-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close share view dialog"
            onClick={() => setShareOpen(false)}
          />
          <div className="relative z-[81] flex w-full max-w-lg flex-col rounded-t-xl border bg-background shadow-xl sm:rounded-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Share Time Tracker</h2>
                <p className="text-sm text-muted-foreground">Copy the shared view link.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShareOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 px-5 py-4">
              <div className="rounded-md border bg-white px-3 py-2 text-sm text-muted-foreground">
                {window.location.href}
              </div>
              <Button type="button" onClick={copyShareLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
              {copyError ? <p className="text-sm text-destructive">{copyError}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChannelSelect({
  value,
  onChange,
}: {
  value: EditableEntry["channel"];
  onChange: (value: EditableEntry["channel"]) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as EditableEntry["channel"])}
      className="h-8 rounded-md border px-2"
    >
      <option>None</option>
      <option>BIV</option>
      <option>EGM</option>
    </select>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: TimeEntryStatus;
  onChange: (value: TimeEntryStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TimeEntryStatus)}
      className="h-8 rounded-md border px-2"
    >
      <option>Pending</option>
      <option>Done</option>
    </select>
  );
}

function Summary({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={accent ? "text-2xl font-bold text-emerald-700" : "text-2xl font-bold"}>
        {value}
      </p>
    </div>
  );
}

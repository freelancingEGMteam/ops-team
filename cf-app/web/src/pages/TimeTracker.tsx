import * as React from "react";

type TimeStatus = "Pending" | "Done";
type TimeEntry = {
  id: string;
  startDate: string;
  task: string;
  price: string;
  channel: "None" | "BIV" | "EGM";
  deliveryDate: string;
  status: TimeStatus;
};

const initialEntries: TimeEntry[] = [
  {
    id: "1",
    startDate: "2026-05-05",
    task: "video9",
    price: "30.00",
    channel: "BIV",
    deliveryDate: "2026-05-08",
    status: "Done",
  },
  {
    id: "2",
    startDate: "2026-05-05",
    task: "video4 (copy)",
    price: "20.00",
    channel: "BIV",
    deliveryDate: "2026-05-06",
    status: "Done",
  },
];

export function TimeTrackerPage() {
  const [entries, setEntries] = React.useState<TimeEntry[]>(initialEntries);
  const [draft, setDraft] = React.useState<TimeEntry>({
    id: "new",
    startDate: "",
    task: "",
    price: "",
    channel: "None",
    deliveryDate: "",
    status: "Pending",
  });

  const total = entries.reduce((sum, entry) => sum + Number(entry.price || 0), 0);
  const completed = entries.filter((entry) => entry.status === "Done").length;

  function updateEntry(id: string, patch: Partial<TimeEntry>) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );
  }

  function addEntry() {
    if (!draft.task.trim()) return;
    setEntries((current) => [...current, { ...draft, id: crypto.randomUUID() }]);
    setDraft({
      id: "new",
      startDate: "",
      task: "",
      price: "",
      channel: "None",
      deliveryDate: "",
      status: "Pending",
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Time Tracker</h1>
        <div className="flex items-center gap-4 rounded-lg border bg-white px-4 py-2 text-sm font-semibold">
          <button className="px-2 text-muted-foreground">‹</button>
          <span>04-may – 10-may</span>
          <button className="px-2 text-muted-foreground">›</button>
          <button className="rounded-md border px-3 py-1 text-xs">This week</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Summary label="Total Entries" value={String(entries.length)} />
        <Summary label="Total Earned" value={`$${total.toFixed(2)}`} accent />
        <Summary label="Completed" value={`${completed} / ${entries.length}`} />
      </div>

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Start Date</th>
              <th className="px-4 py-3 text-left">Task</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Channel</th>
              <th className="px-4 py-3 text-left">Delivery Date</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t">
                <td className="px-4 py-3">
                  <input
                    type="date"
                    value={entry.startDate}
                    onChange={(event) => updateEntry(entry.id, { startDate: event.target.value })}
                    className="h-8 rounded-md border px-2"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    value={entry.task}
                    onChange={(event) => updateEntry(entry.id, { task: event.target.value })}
                    className="h-8 w-full rounded-md border px-2 font-medium"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.01"
                    value={entry.price}
                    onChange={(event) => updateEntry(entry.id, { price: event.target.value })}
                    className="h-8 w-28 rounded-md border px-2 font-semibold text-emerald-700"
                  />
                </td>
                <td className="px-4 py-3">
                  <ChannelSelect
                    value={entry.channel}
                    onChange={(channel) => updateEntry(entry.id, { channel })}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="date"
                    value={entry.deliveryDate}
                    onChange={(event) =>
                      updateEntry(entry.id, { deliveryDate: event.target.value })
                    }
                    className="h-8 rounded-md border px-2"
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusSelect
                    value={entry.status}
                    onChange={(status) => updateEntry(entry.id, { status })}
                  />
                </td>
              </tr>
            ))}
            <tr className="border-t bg-slate-50">
              <td className="px-4 py-3">
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => setDraft((entry) => ({ ...entry, startDate: event.target.value }))}
                  className="h-8 rounded-md border px-2"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  placeholder="Task name..."
                  value={draft.task}
                  onChange={(event) => setDraft((entry) => ({ ...entry, task: event.target.value }))}
                  className="h-8 rounded-md border px-2"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={draft.price}
                  onChange={(event) => setDraft((entry) => ({ ...entry, price: event.target.value }))}
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
                <div className="flex items-center gap-2">
                  <StatusSelect
                    value={draft.status}
                    onChange={(status) => setDraft((entry) => ({ ...entry, status }))}
                  />
                  <button
                    type="button"
                    onClick={addEntry}
                    disabled={!draft.task.trim()}
                    className="h-8 rounded-md border px-3 text-sm disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot className="border-t bg-slate-50 font-semibold">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground">
                Week total
              </td>
              <td className="px-4 py-3 text-emerald-700">${total.toFixed(2)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ChannelSelect({
  value,
  onChange,
}: {
  value: TimeEntry["channel"];
  onChange: (value: TimeEntry["channel"]) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TimeEntry["channel"])}
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
  value: TimeStatus;
  onChange: (value: TimeStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TimeStatus)}
      className="h-8 rounded-md border px-2"
    >
      <option>Pending</option>
      <option>Done</option>
    </select>
  );
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={accent ? "text-2xl font-bold text-emerald-700" : "text-2xl font-bold"}>
        {value}
      </p>
    </div>
  );
}

import { type TaskRow } from "@/types";

interface TaskCalendarProps {
  rows: TaskRow[];
}

export function TaskCalendar({ rows }: TaskCalendarProps) {
  const monthBase = rows.find((row) => row.task.dueDate)?.task.dueDate ?? Date.now();
  const current = new Date(monthBase);
  const year = current.getFullYear();
  const month = current.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  const tasksByDay = rows.reduce<Record<string, TaskRow[]>>((acc, row) => {
    if (!row.task.dueDate) return acc;
    const key = new Date(row.task.dueDate).toISOString().slice(0, 10);
    acc[key] = [...(acc[key] ?? []), row];
    return acc;
  }, {});

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="flex flex-col gap-1 border-b bg-[#061a33] px-3 py-3 text-white sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <span className="text-xs font-semibold uppercase tracking-wider">Calendar</span>
        <span className="text-sm font-semibold">
          {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(current)}
        </span>
      </div>
      <div className="grid grid-cols-7 border-b bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="px-1.5 py-2 sm:px-3">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const tasks = tasksByDay[key] ?? [];
          const muted = day.getMonth() !== month;

          return (
            <div key={key} className="min-h-24 border-b border-r p-1.5 sm:min-h-32 sm:p-2">
              <div
                className={
                  muted
                    ? "text-xs font-medium text-slate-300"
                    : "text-xs font-semibold text-slate-600"
                }
              >
                {day.getDate()}
              </div>
              <div className="mt-2 space-y-1">
                {tasks.map((row) => (
                  <div
                    key={row.task.id}
                    className="rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-1 sm:px-2"
                  >
                    <p className="truncate text-[10px] font-semibold text-indigo-950 sm:text-xs">
                      {row.task.name}
                    </p>
                    <p className="truncate text-[10px] text-indigo-700 sm:text-[11px]">
                      {row.assignee?.name ?? "Unassigned"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

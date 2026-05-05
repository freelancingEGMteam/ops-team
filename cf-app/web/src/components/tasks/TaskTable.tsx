import * as React from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { getStageStyle } from "@/lib/stages";
import {
  type Stage,
  type TaskChannel,
  type TaskPriority,
  type TaskRow,
  type TaskStatus,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
} from "@/types";
import { InlineSelectCell, InlineTextCell } from "./TaskInlineEdit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskTableProps {
  projectId: string;
  stages: Stage[];
  rows: TaskRow[];
  onRowClick?: (row: TaskRow) => void;
}

const colHelper = createColumnHelper<TaskRow>();
const CHANNEL_OPTIONS: { value: TaskChannel; label: string }[] = [
  { value: "BIV", label: "BIV" },
  { value: "EGM", label: "EGM" },
];
type GroupBy = "stage" | "channel" | "status" | "priority" | "assignee";
const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "stage", label: "Stage" },
  { value: "channel", label: "Channel" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee" },
];

function toDateInputValue(timestamp: number | null): string {
  if (!timestamp) return "";
  return new Date(timestamp).toISOString().slice(0, 10);
}

function fromDateInputValue(value: string): string | null {
  return value ? new Date(`${value}T12:00:00.000Z`).toISOString() : null;
}

function StageBadge({ name }: { name: string }) {
  const style = getStageStyle(name);
  return (
    <span
      className="inline-flex max-w-full items-center rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.color, color: style.textColor }}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}

export function TaskTable({ projectId, stages, rows, onRowClick }: TaskTableProps) {
  const qc = useQueryClient();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [groupBy, setGroupBy] = React.useState<GroupBy>(() => {
    return (localStorage.getItem(`ops-view-${projectId}-group-by`) as GroupBy | null) ?? "stage";
  });
  const [orderedRows, setOrderedRows] = React.useState<TaskRow[]>(rows);
  const [dragTaskId, setDragTaskId] = React.useState<string | null>(null);
  const [dropTaskId, setDropTaskId] = React.useState<string | null>(null);
  const [newTask, setNewTask] = React.useState({
    name: "",
    status: "todo" as TaskStatus,
    priority: "medium" as TaskPriority,
    channel: "__none",
    stageId: "__none",
    assigneeId: "__unassigned",
    dueDate: "",
  });

  React.useEffect(() => {
    setOrderedRows([...rows].sort((a, b) => a.task.orderIndex - b.task.orderIndex));
  }, [rows]);

  const { data: assignableUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: api.users.list,
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.tasks.update>[1] }) =>
      api.tasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const createTask = useMutation({
    mutationFn: () =>
      api.tasks.create({
        name: newTask.name.trim(),
        projectId,
        status: newTask.status,
        priority: newTask.priority,
        channel: newTask.channel === "__none" ? null : (newTask.channel as TaskChannel),
        stageId: newTask.stageId === "__none" ? undefined : newTask.stageId,
        assigneeId: newTask.assigneeId === "__unassigned" ? undefined : newTask.assigneeId,
        dueDate: fromDateInputValue(newTask.dueDate) ?? undefined,
      }),
    onSuccess: () => {
      setNewTask({
        name: "",
        status: "todo",
        priority: "medium",
        channel: "__none",
        stageId: "__none",
        assigneeId: "__unassigned",
        dueDate: "",
      });
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const reorderTasks = useMutation({
    mutationFn: (updates: { taskId: string; stageId: string | null; orderIndex: number }[]) =>
      api.tasks.reorder(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const handleDragStart = (taskId: string) => setDragTaskId(taskId);
  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    setDropTaskId(taskId);
  };
  const handleDrop = (visibleRows: TaskRow[]) => {
    if (!dragTaskId || !dropTaskId || dragTaskId === dropTaskId) {
      setDragTaskId(null);
      setDropTaskId(null);
      return;
    }

    const updatedVisible = [...visibleRows];
    const from = updatedVisible.findIndex((r) => r.task.id === dragTaskId);
    const to = updatedVisible.findIndex((r) => r.task.id === dropTaskId);
    if (from === -1 || to === -1) return;

    const [moved] = updatedVisible.splice(from, 1);
    updatedVisible.splice(to, 0, moved);

    const visibleIds = new Set(updatedVisible.map((r) => r.task.id));
    const hiddenRows = orderedRows.filter((r) => !visibleIds.has(r.task.id));
    const updated = [...updatedVisible, ...hiddenRows];
    setOrderedRows(updated);
    setDragTaskId(null);
    setDropTaskId(null);
    reorderTasks.mutate(
      updated.map((r, i) => ({ taskId: r.task.id, stageId: r.task.stageId, orderIndex: i }))
    );
  };

  const columns = [
    colHelper.display({
      id: "drag",
      size: 44,
      cell: ({ row }) => (
        <div
          draggable
          onDragStart={() => handleDragStart(row.original.task.id)}
          onDragEnd={() => {
            setDragTaskId(null);
            setDropTaskId(null);
          }}
          className="flex h-8 w-8 cursor-grab items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          title="Move task"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      ),
    }),
    colHelper.accessor((r) => r.task.name, {
      id: "name",
      header: "Task",
      size: 260,
      cell: ({ getValue, row }) => (
        <InlineTextCell
          value={getValue()}
          onCommit={(name) => updateTask.mutate({ id: row.original.task.id, data: { name } })}
          className="font-medium"
        />
      ),
    }),
    colHelper.accessor((r) => r.task.status, {
      id: "status",
      header: "Status",
      size: 130,
      cell: ({ getValue, row }) => (
        <InlineSelectCell
          value={getValue()}
          options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({
            value: v as TaskStatus,
            label: c.label,
          }))}
          onCommit={(status) =>
            updateTask.mutate({ id: row.original.task.id, data: { status } })
          }
          renderValue={(status) => (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_CONFIG[status].bg,
                STATUS_CONFIG[status].color
              )}
            >
              {STATUS_CONFIG[status].label}
            </span>
          )}
        />
      ),
    }),
    colHelper.accessor((r) => r.task.priority, {
      id: "priority",
      header: "Priority",
      size: 120,
      cell: ({ getValue, row }) => (
        <InlineSelectCell
          value={getValue()}
          options={Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({
            value: v as TaskPriority,
            label: c.label,
            className: c.color,
          }))}
          onCommit={(priority) =>
            updateTask.mutate({ id: row.original.task.id, data: { priority } })
          }
          renderValue={(priority) => (
            <span className={cn("text-xs font-medium", PRIORITY_CONFIG[priority].color)}>
              {PRIORITY_CONFIG[priority].label}
            </span>
          )}
        />
      ),
    }),
    colHelper.accessor((r) => r.task.channel, {
      id: "channel",
      header: "Channel",
      size: 110,
      cell: ({ getValue, row }) => (
        <InlineSelectCell
          value={getValue() ?? "__none"}
          options={[{ value: "__none", label: "None" }, ...CHANNEL_OPTIONS]}
          onCommit={(channel) =>
            updateTask.mutate({
              id: row.original.task.id,
              data: { channel: channel === "__none" ? null : (channel as TaskChannel) },
            })
          }
          renderValue={(channel) =>
            channel === "__none" ? (
              <span className="text-muted-foreground text-xs">None</span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {channel}
              </span>
            )
          }
        />
      ),
    }),
    colHelper.accessor((r) => r.stage, {
      id: "stage",
      header: "Stage",
      size: 150,
      cell: ({ getValue, row }) => {
        const stage = getValue();
        return (
          <InlineSelectCell
            value={stage?.id ?? "__none"}
            options={[
              { value: "__none", label: "None" },
              ...stages.map((s) => ({ value: s.id, label: <StageBadge name={s.name} /> })),
            ]}
            onCommit={(stageId) =>
              updateTask.mutate({
                id: row.original.task.id,
                data: { stageId: stageId === "__none" ? null : stageId },
              })
            }
            renderValue={(stageId) => {
              const selected =
                stageId === "__none" ? null : stages.find((s) => s.id === stageId) ?? stage;
              if (!selected) return <span className="text-muted-foreground text-xs">None</span>;
              return <StageBadge name={selected.name} />;
            }}
          />
        );
      },
    }),
    colHelper.accessor((r) => r.assignee, {
      id: "assignee",
      header: "Assignee",
      size: 150,
      cell: ({ getValue, row }) => {
        const assignee = getValue();
        return (
          <InlineSelectCell
            value={assignee?.id ?? "__unassigned"}
            options={[
              { value: "__unassigned", label: "Unassigned" },
              ...assignableUsers.map((user) => ({ value: user.id, label: user.name })),
            ]}
            onCommit={(assigneeId) =>
              updateTask.mutate({
                id: row.original.task.id,
                data: { assigneeId: assigneeId === "__unassigned" ? null : assigneeId },
              })
            }
            renderValue={(userId) => {
              const selected =
                userId === "__unassigned"
                  ? null
                  : assignableUsers.find((user) => user.id === userId) ?? assignee;
              if (!selected) {
                return <span className="text-muted-foreground text-xs">Unassigned</span>;
              }
              return (
                <span className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {selected.avatar && <AvatarImage src={selected.avatar} alt={selected.name} />}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(selected.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{selected.name}</span>
                </span>
              );
            }}
          />
        );
      },
    }),
    colHelper.accessor((r) => r.task.dueDate, {
      id: "dueDate",
      header: "Due Date",
      size: 140,
      cell: ({ getValue, row }) => (
        <input
          type="date"
          value={toDateInputValue(getValue())}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            updateTask.mutate({
              id: row.original.task.id,
              data: { dueDate: fromDateInputValue(event.target.value) },
            })
          }
          className="h-8 rounded-md border border-transparent bg-transparent px-2 text-sm text-muted-foreground outline-none hover:border-input hover:bg-background focus:border-ring focus:ring-1 focus:ring-ring"
          title={formatDate(getValue())}
        />
      ),
    }),
    colHelper.display({
      id: "actions",
      size: 48,
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteTask.mutate(row.original.task.id);
          }}
          className="rounded p-1 opacity-0 transition-opacity hover:text-destructive group-hover/row:opacity-100"
          title="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: orderedRows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleRows = table.getRowModel().rows.map((row) => row.original);
  const groupedRows = table.getRowModel().rows.reduce<
    { key: string; label: string; rows: Row<TaskRow>[] }[]
  >((groups, row) => {
    const values = {
      stage: {
        key: row.original.stage?.id ?? "no-stage",
        label: row.original.stage?.name ?? "No Stage",
      },
      channel: {
        key: row.original.task.channel ?? "no-channel",
        label: row.original.task.channel ?? "No Channel",
      },
      status: {
        key: row.original.task.status,
        label: STATUS_CONFIG[row.original.task.status].label,
      },
      priority: {
        key: row.original.task.priority,
        label: PRIORITY_CONFIG[row.original.task.priority].label,
      },
      assignee: {
        key: row.original.assignee?.id ?? "unassigned",
        label: row.original.assignee?.name ?? "Unassigned",
      },
    };
    const { key, label } = values[groupBy];
    const current = groups.find((group) => group.key === key);
    if (current) current.rows.push(row);
    else groups.push({ key, label, rows: [row] });
    return groups;
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search tasks..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-64"
        />
        <select
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value as GroupBy)}
          className="h-8 rounded-md border bg-background px-3 text-sm"
        >
          {GROUP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Group by: {option.label}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => localStorage.setItem(`ops-view-${projectId}-group-by`, groupBy)}
        >
          Save View
        </Button>
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-[#061a33]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider first:rounded-tl-lg last:rounded-tr-lg"
                  >
                    {h.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 hover:text-white transition-colors"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getCanSort() && (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {groupedRows.map((group, groupIndex) => (
              <React.Fragment key={group.key}>
                {groupIndex > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={columns.length} className="h-5 bg-background" />
                  </tr>
                )}
                <tr>
                  <td
                    colSpan={columns.length}
                    className="border-y bg-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    {group.label}
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {group.rows.length}
                    </span>
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr
                    key={row.id}
                    draggable={false}
                    onDragOver={(e) => handleDragOver(e, row.original.task.id)}
                    onDrop={() => handleDrop(visibleRows)}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "group/row border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
                      dropTaskId === row.original.task.id &&
                        dragTaskId !== null &&
                        "border-t-2 border-indigo-500"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No tasks yet. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        className="overflow-auto rounded-lg border bg-white"
        onSubmit={(e) => {
          e.preventDefault();
          if (newTask.name.trim()) createTask.mutate();
        }}
      >
        <div
          className="grid min-w-[1180px] items-center gap-2 px-3 py-2"
          style={{
            gridTemplateColumns: "44px 260px 130px 120px 110px 150px 150px 140px 48px",
          }}
        >
          <span />
          <Input
            placeholder="+ Add task..."
            value={newTask.name}
            onChange={(event) => setNewTask((task) => ({ ...task, name: event.target.value }))}
            className="h-8"
          />
          <select
            value={newTask.status}
            onChange={(event) =>
              setNewTask((task) => ({ ...task, status: event.target.value as TaskStatus }))
            }
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
          <select
            value={newTask.priority}
            onChange={(event) =>
              setNewTask((task) => ({ ...task, priority: event.target.value as TaskPriority }))
            }
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
          <select
            value={newTask.channel}
            onChange={(event) =>
              setNewTask((task) => ({ ...task, channel: event.target.value }))
            }
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="__none">None</option>
            {CHANNEL_OPTIONS.map((channel) => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </select>
          <select
            value={newTask.stageId}
            onChange={(event) =>
              setNewTask((task) => ({ ...task, stageId: event.target.value }))
            }
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="__none">None</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <select
            value={newTask.assigneeId}
            onChange={(event) =>
              setNewTask((task) => ({ ...task, assigneeId: event.target.value }))
            }
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="__unassigned">Unassigned</option>
            {assignableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newTask.dueDate}
            onChange={(event) => setNewTask((task) => ({ ...task, dueDate: event.target.value }))}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!newTask.name.trim() || createTask.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </form>
    </div>
  );
}

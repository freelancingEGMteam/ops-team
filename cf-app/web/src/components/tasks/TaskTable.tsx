import * as React from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, getInitials } from "@/lib/utils";
import {
  type TaskRow,
  type TaskStatus,
  type TaskPriority,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from "@/types";
import { InlineTextCell, InlineSelectCell } from "./TaskInlineEdit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskTableProps {
  projectId: string;
  rows: TaskRow[];
  onRowClick?: (row: TaskRow) => void;
}

const colHelper = createColumnHelper<TaskRow>();

export function TaskTable({ projectId, rows, onRowClick }: TaskTableProps) {
  const qc = useQueryClient();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [newTaskName, setNewTaskName] = React.useState("");
  const [orderedRows, setOrderedRows] = React.useState<TaskRow[]>(rows);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    setOrderedRows(rows);
  }, [rows]);

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
    mutationFn: (name: string) => api.tasks.create({ name, projectId }),
    onSuccess: () => {
      setNewTaskName("");
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropIndex(index);
  };
  const handleDrop = () => {
    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const updated = [...orderedRows];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, moved);
    setOrderedRows(updated);
    setDragIndex(null);
    setDropIndex(null);
    api.tasks.reorder(
      updated.map((r, i) => ({ taskId: r.task.id, stageId: r.task.stageId, orderIndex: i }))
    );
  };

  const columns = [
    colHelper.display({
      id: "drag",
      size: 32,
      cell: ({ row }) => (
        <div
          draggable
          onDragStart={() => handleDragStart(row.index)}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      ),
    }),
    colHelper.accessor((r) => r.task.name, {
      id: "name",
      header: "Task",
      size: 300,
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
      size: 140,
      cell: ({ getValue, row }) => {
        const status = getValue();
        const cfg = STATUS_CONFIG[status];
        return (
          <InlineSelectCell
            value={status}
            options={Object.entries(STATUS_CONFIG).map(([v, c]) => ({
              value: v as TaskStatus,
              label: c.label,
            }))}
            onCommit={(s) =>
              updateTask.mutate({ id: row.original.task.id, data: { status: s } })
            }
            renderValue={(v) => (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", cfg.bg, cfg.color)}>
                {STATUS_CONFIG[v].label}
              </span>
            )}
          />
        );
      },
    }),
    colHelper.accessor((r) => r.task.priority, {
      id: "priority",
      header: "Priority",
      size: 110,
      cell: ({ getValue, row }) => {
        const priority = getValue();
        return (
          <InlineSelectCell
            value={priority}
            options={Object.entries(PRIORITY_CONFIG).map(([v, c]) => ({
              value: v as TaskPriority,
              label: c.label,
              className: c.color,
            }))}
            onCommit={(p) =>
              updateTask.mutate({ id: row.original.task.id, data: { priority: p } })
            }
            renderValue={(v) => (
              <span className={cn("text-xs font-medium", PRIORITY_CONFIG[v].color)}>
                {PRIORITY_CONFIG[v].label}
              </span>
            )}
          />
        );
      },
    }),
    colHelper.accessor((r) => r.stage, {
      id: "stage",
      header: "Stage",
      size: 130,
      cell: ({ getValue }) => {
        const stage = getValue();
        if (!stage) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: stage.color ?? "#94a3b8" }}
            />
            <span className="text-sm">{stage.name}</span>
          </span>
        );
      },
    }),
    colHelper.accessor((r) => r.assignee, {
      id: "assignee",
      header: "Assignee",
      size: 140,
      cell: ({ getValue }) => {
        const assignee = getValue();
        if (!assignee) return <span className="text-muted-foreground text-xs">Unassigned</span>;
        return (
          <span className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {assignee.avatar && <AvatarImage src={assignee.avatar} alt={assignee.name} />}
              <AvatarFallback className="text-[10px]">
                {getInitials(assignee.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{assignee.name}</span>
          </span>
        );
      },
    }),
    colHelper.accessor((r) => r.task.dueDate, {
      id: "dueDate",
      header: "Due Date",
      size: 100,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDate(getValue())}</span>
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Search tasks…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-8 w-64"
        />
      </div>

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b bg-[#0f172a]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className="px-3 py-2.5 text-left text-xs font-medium text-white/70 uppercase tracking-wider"
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
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                draggable={false}
                onDragOver={(e) => handleDragOver(e, row.index)}
                onDrop={handleDrop}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  "group/row border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer",
                  dropIndex === row.index && dragIndex !== null && "border-t-2 border-indigo-500"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
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
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newTaskName.trim()) createTask.mutate(newTaskName.trim());
        }}
      >
        <Input
          placeholder="+ Add task…"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          className="h-8 flex-1"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!newTaskName.trim() || createTask.isPending}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </form>
    </div>
  );
}

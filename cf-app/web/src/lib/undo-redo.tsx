import * as React from "react";
import { Redo2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export type UndoRedoAction = {
  label: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
};

type UndoRedoContextValue = {
  canUndo: boolean;
  canRedo: boolean;
  isWorking: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  record: (action: UndoRedoAction) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

const UndoRedoContext = React.createContext<UndoRedoContextValue | null>(null);

export function UndoRedoProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [undoStack, setUndoStack] = React.useState<UndoRedoAction[]>([]);
  const [redoStack, setRedoStack] = React.useState<UndoRedoAction[]>([]);
  const [isWorking, setIsWorking] = React.useState(false);

  const record = React.useCallback((action: UndoRedoAction) => {
    setUndoStack((current) => [...current, action].slice(-50));
    setRedoStack([]);
  }, []);

  const run = React.useCallback(
    async (direction: "undo" | "redo") => {
      if (isWorking) return;

      const stack = direction === "undo" ? undoStack : redoStack;
      const action = stack.at(-1);
      if (!action) return;

      setIsWorking(true);
      try {
        if (direction === "undo") {
          await action.undo();
          setUndoStack((current) => current.slice(0, -1));
          setRedoStack((current) => [...current, action]);
          showToast(`Undid ${action.label}`);
        } else {
          await action.redo();
          setRedoStack((current) => current.slice(0, -1));
          setUndoStack((current) => [...current, action]);
          showToast(`Redid ${action.label}`);
        }
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Undo/redo failed", "error");
      } finally {
        setIsWorking(false);
      }
    },
    [isWorking, redoStack, showToast, undoStack]
  );

  const undo = React.useCallback(() => run("undo"), [run]);
  const redo = React.useCallback(() => run("redo"), [run]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping || !(event.ctrlKey || event.metaKey)) return;

      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        void undo();
      }
      if (event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        void redo();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const value = React.useMemo<UndoRedoContextValue>(
    () => ({
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      isWorking,
      undoLabel: undoStack.at(-1)?.label ?? null,
      redoLabel: redoStack.at(-1)?.label ?? null,
      record,
      undo,
      redo,
    }),
    [isWorking, record, redo, redoStack, undo, undoStack]
  );

  return <UndoRedoContext.Provider value={value}>{children}</UndoRedoContext.Provider>;
}

export function useUndoRedo() {
  const context = React.useContext(UndoRedoContext);
  if (!context) throw new Error("useUndoRedo must be used inside UndoRedoProvider");
  return context;
}

export function UndoRedoControls() {
  const { canUndo, canRedo, isWorking, undoLabel, redoLabel, undo, redo } = useUndoRedo();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/10 p-1 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-200 hover:bg-white/10 hover:text-white disabled:text-slate-500"
        disabled={!canUndo || isWorking}
        onClick={() => void undo()}
        title={undoLabel ? `Undo ${undoLabel}` : "Undo"}
        aria-label={undoLabel ? `Undo ${undoLabel}` : "Undo"}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-200 hover:bg-white/10 hover:text-white disabled:text-slate-500"
        disabled={!canRedo || isWorking}
        onClick={() => void redo()}
        title={redoLabel ? `Redo ${redoLabel}` : "Redo"}
        aria-label={redoLabel ? `Redo ${redoLabel}` : "Redo"}
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

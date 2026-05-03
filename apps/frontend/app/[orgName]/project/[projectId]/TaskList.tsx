import ListMode from './views/ListMode'
import TaskFilter from '@/features/TaskFilter'
import { HiBars3BottomLeft } from 'react-icons/hi2'

export default function TaskList() {
  return (
    <div className="relative px-3 py-3 sm:px-4 sm:py-4">
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-3 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.22)] sm:p-4 dark:border-gray-800 dark:bg-[#121a2a]">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-slate-900/70">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <HiBars3BottomLeft className="h-4 w-4" />
              List Workspace
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Scan details quickly, edit inline, and keep grouped task work readable at higher density.
            </p>
          </div>
        </div>

        <TaskFilter />
        <ListMode />
      </div>
    </div>
  )
}

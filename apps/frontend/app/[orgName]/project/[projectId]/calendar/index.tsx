import TaskFilter from '@/features/TaskFilter'
import CalMonthContainer from './CalMonthContainer'
import './style.css'
import { CalendarProvider, ICalendarView } from './context'
import { useState } from 'react'
import { HiOutlineCalendarDays } from 'react-icons/hi2'


export default function Calendar() {
  const [month, setMonth] = useState(new Date().getMonth())
  const [calendarView, setCalendarView] = useState<ICalendarView>(ICalendarView.MONTH)
  const d = new Date()
  const date = new Date(d.getFullYear(), month, 15)

  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4">
      <CalendarProvider value={{
        month,
        setMonth,
        calendarView,
        setCalendarView
      }}>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-3 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.22)] sm:p-4 dark:border-gray-800 dark:bg-[#121a2a]">
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-slate-900/70">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <HiOutlineCalendarDays className="h-4 w-4" />
                Calendar Workspace
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Plan work across weeks and months with a clearer schedule surface and more readable task events.
              </p>
            </div>
          </div>

          <TaskFilter />
          <CalMonthContainer date={date} type={calendarView} />
        </div>
      </CalendarProvider>
    </div>
  )
}

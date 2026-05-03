'use client'
import ProjectTabContent from './ProjectTabContent'
import TaskCreate from './TaskCreate'
import ProjectView from '@/features/ProjectView'
import { TaskUpdate2 } from './TaskUpdate2'
import ProjectAdvanceTabs from '@/features/ProjectAdvanceTabs'
import ProjectHeader from '@/features/Project/Header'
import CustomFieldModal from '@/features/CustomField/CustomFieldModal'
import { useSearchParams } from 'next/navigation'
import { useProjectStore } from '@/store/project'
import { HiBolt, HiOutlineSquares2X2 } from 'react-icons/hi2'

export default function ProjectNav() {
  const searchParams = useSearchParams()
  const { selectedProject } = useProjectStore(state => state)
  const mode = searchParams.get('mode') || 'list'

  const modeLabelMap = new Map([
    ['list', 'List view'],
    ['board', 'Board view'],
    ['calendar', 'Calendar view'],
    ['goal', 'Goal view'],
    ['setting', 'Settings'],
    ['automation', 'Automation'],
    ['automation-create', 'Automation'],
    ['dashboard', 'Dashboard'],
    ['team', 'Team view'],
    ['grid', 'Grid view'],
  ])

  const modeLabel = modeLabelMap.get(mode) || 'Workspace view'

  return (
    <div className="project-nav">
      <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-[0_20px_70px_-40px_rgba(15,23,42,0.9)] dark:border-gray-800">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-indigo-200">
                  <HiOutlineSquares2X2 className="h-4 w-4" />
                  Task Tracker
                </div>
                <div className="mt-4">
                  <ProjectHeader />
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  {selectedProject?.desc ||
                    'A focused execution space for planning, prioritizing, and moving work across the team.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Current mode
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{modeLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Switch views without losing project context or task state.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center gap-2 text-indigo-200">
                    <HiBolt className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Flow
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Designed to keep navigation, task creation, and view switching visible in one compact command layer.
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-slate-950/40 p-3 sm:flex">
              <ProjectView />
              <ProjectAdvanceTabs />
            </div>
          </div>
        </div>
      </div>

      <div className="task w-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
        <div className="mx-auto w-full max-w-[1600px] overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.25)] backdrop-blur dark:border-gray-800 dark:bg-[#182031]">
          <ProjectTabContent />
        </div>
      </div>
      <div className="absolute bottom-10 right-10 z-[11]">
        <div className="hidden sm:flex items-center gap-2 ">
          {/* <PromptGenerator /> */}
          {/* <FavoriteAddModal /> */}
          <TaskCreate />
        </div>
      </div>
      <TaskUpdate2 />
      <CustomFieldModal />
    </div>
  )
}

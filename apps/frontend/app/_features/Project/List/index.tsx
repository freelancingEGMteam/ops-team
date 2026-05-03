'use client'

import './style.css'

import { AiOutlinePlus } from 'react-icons/ai'
import ProjectAddModal from '../Add/ProjectAddModal'
import ProjectArchived from './ProjectArchived'
import ProjectAvailable from './ProjectAvailable'
import { HiBolt, HiFolderOpen, HiSparkles } from 'react-icons/hi2'
import { useParams } from 'next/navigation'

export default function ProjectList() {
  const params = useParams()
  const orgName = Array.isArray(params.orgName) ? params.orgName[0] : params.orgName
  const orgLabel = decodeURIComponent(orgName || '').replace(/-/g, ' ')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.7)]">
          <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-indigo-200">
                <HiSparkles className="h-4 w-4" />
                Project Hub
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Projects in {orgLabel}, organized for fast daily execution.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                This view keeps project creation, active work, and archived history in one place while matching the new workspace direction.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-indigo-400/15 p-3 text-indigo-200">
                    <HiFolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Active space
                    </p>
                    <p className="mt-1 text-sm text-slate-200">
                      Keep current delivery work visible and easy to enter.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200">
                    <HiBolt className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Fast access
                    </p>
                    <p className="mt-1 text-sm text-slate-200">
                      Open any board quickly without leaving the organization flow.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.25)] backdrop-blur sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Project Directory
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                Your projects
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Create a new workspace, jump into active delivery, or revisit archived work without leaving the team context.
              </p>
            </div>

            <ProjectAddModal
              triggerComponent={
                <div className="project-item project-item-create min-w-[220px] border-dashed">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <AiOutlinePlus className="text-base text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Create project
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Start a fresh board, plan, or delivery stream.
                    </p>
                  </div>
                </div>
              }
            />
          </div>

          <div className="pt-6">
            <ProjectAvailable />
            <ProjectArchived />
          </div>
        </section>
      </div>
    </div>
  )
}

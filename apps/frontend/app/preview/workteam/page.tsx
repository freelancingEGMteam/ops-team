import Link from 'next/link'
import {
  HiArrowRight,
  HiBars3BottomLeft,
  HiBolt,
  HiCalendarDays,
  HiChartBar,
  HiCheckCircle,
  HiFolderOpen,
  HiOutlineViewColumns,
  HiSparkles,
  HiUserGroup,
} from 'react-icons/hi2'

const quickLinks = [
  { title: 'Projects', icon: HiFolderOpen },
  { title: 'My Work', icon: HiBolt },
  { title: 'Reports', icon: HiChartBar },
  { title: 'Meetings', icon: HiUserGroup },
]

const boardColumns = [
  {
    title: 'Backlog',
    count: 8,
    cards: ['Finalize onboarding copy', 'QA dark mode states'],
  },
  {
    title: 'In Progress',
    count: 5,
    cards: ['Redesign project shell', 'List view spacing pass'],
  },
  {
    title: 'Review',
    count: 3,
    cards: ['Calendar polish', 'Settings IA cleanup'],
  },
]

const listRows = [
  ['Refine board card hierarchy', 'Maya', 'High', 'Today'],
  ['Unify tab shell spacing', 'Chris', 'Normal', 'Tomorrow'],
  ['Review task create flows', 'Ava', 'Urgent', 'Fri'],
]

const calendarDays = [
  { day: '12', active: false, tasks: ['Kickoff'] },
  { day: '13', active: true, tasks: ['Board review', 'Ship preview'] },
  { day: '14', active: false, tasks: ['UX QA'] },
  { day: '15', active: false, tasks: ['Sprint plan'] },
  { day: '16', active: false, tasks: ['Stakeholder sync'] },
  { day: '17', active: false, tasks: [] },
  { day: '18', active: false, tasks: ['Release'] },
]

export default function WorkteamPreviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 text-white shadow-[0_28px_90px_-40px_rgba(15,23,42,0.75)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.35fr)_360px] lg:px-10 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-indigo-200">
                <HiSparkles className="h-4 w-4" />
                Workteam Preview
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Mock redesign preview for the task tracker app.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                This page gives you one local URL with mock data so you can review the new direction without needing a real organization or project loaded.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <a href="#org" className="rounded-full bg-white/10 px-4 py-2 text-slate-200 hover:bg-white/15">
                  Org Hub
                </a>
                <a href="#projects" className="rounded-full bg-white/10 px-4 py-2 text-slate-200 hover:bg-white/15">
                  Project Directory
                </a>
                <a href="#board" className="rounded-full bg-white/10 px-4 py-2 text-slate-200 hover:bg-white/15">
                  Board
                </a>
                <a href="#list" className="rounded-full bg-white/10 px-4 py-2 text-slate-200 hover:bg-white/15">
                  List
                </a>
                <a href="#calendar" className="rounded-full bg-white/10 px-4 py-2 text-slate-200 hover:bg-white/15">
                  Calendar
                </a>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Open the live app
              </p>
              <div className="mt-3 space-y-3 text-sm text-slate-300">
                <p>
                  Org route: <code className="rounded bg-black/20 px-1.5 py-0.5">/workteam</code>
                </p>
                <p>
                  Projects: <code className="rounded bg-black/20 px-1.5 py-0.5">/workteam/project</code>
                </p>
                <p>
                  Mock preview: <code className="rounded bg-black/20 px-1.5 py-0.5">/preview/workteam</code>
                </p>
              </div>
              <Link
                href="/workteam"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Try the live route
                <HiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section id="org" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-32px_rgba(15,23,42,0.22)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Org Hub</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Workspace command center</h2>
            </div>
            <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-indigo-600">
              workteam
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map(link => {
              const Icon = link.icon
              return (
                <div key={link.title} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="rounded-2xl bg-white p-3 shadow-sm w-fit">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-slate-900">{link.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">Direct access with the new card-based entry layout.</p>
                </div>
              )
            })}
          </div>
        </section>

        <section id="projects" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-32px_rgba(15,23,42,0.22)]">
          <div className="mb-5 flex items-center gap-3">
            <HiFolderOpen className="h-5 w-5 text-slate-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Project directory preview</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-5">
              <p className="text-sm font-semibold text-slate-900">Create project</p>
              <p className="mt-2 text-sm text-slate-500">Start a fresh board, plan, or delivery stream.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Website Redesign</p>
              <p className="mt-2 text-sm text-slate-500">Active product and marketing delivery workspace.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Mobile App Sprint</p>
              <p className="mt-2 text-sm text-slate-500">Shared roadmap for current mobile execution.</p>
            </div>
          </div>
        </section>

        <section id="board" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-32px_rgba(15,23,42,0.22)]">
          <div className="mb-5 flex items-center gap-3">
            <HiOutlineViewColumns className="h-5 w-5 text-slate-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Board view preview</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {boardColumns.map(column => (
              <div key={column.title} className="min-w-[300px] rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span className="text-sm font-semibold text-slate-900">{column.title}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{column.count}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {column.cards.map(card => (
                    <div key={card} className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-medium text-slate-800">{card}</p>
                      <p className="mt-2 text-xs text-slate-400">Preview task card styling</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="list" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-32px_rgba(15,23,42,0.22)]">
          <div className="mb-5 flex items-center gap-3">
            <HiBars3BottomLeft className="h-5 w-5 text-slate-600" />
            <h2 className="text-2xl font-semibold text-slate-900">List view preview</h2>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <div className="grid grid-cols-[1.8fr_0.9fr_0.7fr_0.7fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <span>Task</span>
              <span>Assignee</span>
              <span>Priority</span>
              <span>Due</span>
            </div>
            {listRows.map(row => (
              <div key={row[0]} className="grid grid-cols-[1.8fr_0.9fr_0.7fr_0.7fr] gap-3 border-b border-slate-200 px-4 py-4 text-sm last:border-b-0 hover:bg-slate-50">
                <span className="font-medium text-slate-800">{row[0]}</span>
                <span className="text-slate-500">{row[1]}</span>
                <span className="text-slate-500">{row[2]}</span>
                <span className="text-slate-500">{row[3]}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="calendar" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-32px_rgba(15,23,42,0.22)]">
          <div className="mb-5 flex items-center gap-3">
            <HiCalendarDays className="h-5 w-5 text-slate-600" />
            <h2 className="text-2xl font-semibold text-slate-900">Calendar view preview</h2>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="px-4 py-3">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-slate-200">
              {calendarDays.map(day => (
                <div key={day.day} className="min-h-[190px] bg-white p-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${day.active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    {day.day}
                  </div>
                  <div className="mt-4 space-y-2">
                    {day.tasks.map(task => (
                      <div key={task} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        {task}
                      </div>
                    ))}
                    {!day.tasks.length ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                        No events
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-between rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-5 text-sm text-emerald-900">
          <div className="flex items-center gap-3">
            <HiCheckCircle className="h-5 w-5" />
            <span>Mock preview route is ready for local review.</span>
          </div>
          <code className="rounded bg-white px-3 py-1 text-emerald-800">/preview/workteam</code>
        </section>
      </div>
    </div>
  )
}

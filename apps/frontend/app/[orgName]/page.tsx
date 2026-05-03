import Link from 'next/link'
import {
  HiArrowTrendingUp,
  HiBolt,
  HiChartBar,
  HiChevronRight,
  HiClock,
  HiFolderOpen,
  HiSparkles,
  HiUserGroup,
} from 'react-icons/hi2'

const quickLinks = [
  {
    title: 'Projects',
    description: 'Open active boards, roadmaps, and delivery lanes.',
    href: 'project',
    icon: HiFolderOpen,
  },
  {
    title: 'My Work',
    description: 'Review assigned tasks, priorities, and deadlines.',
    href: 'my-works',
    icon: HiBolt,
  },
  {
    title: 'Reports',
    description: 'Track progress, workload, and delivery trends.',
    href: 'report',
    icon: HiChartBar,
  },
  {
    title: 'Meetings',
    description: 'Jump into rooms and keep project decisions moving.',
    href: 'meeting',
    icon: HiUserGroup,
  },
]

const spotlightCards = [
  {
    label: 'Delivery health',
    value: '78%',
    note: 'Healthy flow across current sprint work.',
  },
  {
    label: 'Focus window',
    value: '11 tasks',
    note: 'Recommended cap for in-progress items this week.',
  },
  {
    label: 'Upcoming risk',
    value: '2 blockers',
    note: 'Needs triage before the next planning session.',
  },
]

const todayItems = [
  'Triage urgent work before expanding the sprint scope.',
  'Move recurring standup notes into a shared meeting room.',
  'Review report trends before locking next week priorities.',
]

type PageProps = {
  params: {
    orgName: string
  }
}

export default function Page({ params }: PageProps) {
  const orgLabel = decodeURIComponent(params.orgName).replace(/-/g, ' ')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.7)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] lg:px-10 lg:py-10">
            <div className="flex flex-col gap-6">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-indigo-200">
                <HiSparkles className="h-4 w-4" />
                Design Preview
              </div>

              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {orgLabel} workspace, redesigned around daily execution.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  This preview turns the organization landing page into a calm command center with direct access to projects, work queues, reporting, and team collaboration.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {spotlightCards.map(card => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      {card.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{card.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Today
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    Recommended flow
                  </h2>
                </div>
                <div className="rounded-full bg-emerald-400/10 p-2 text-emerald-300">
                  <HiArrowTrendingUp className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {todayItems.map(item => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-full bg-indigo-400/15 p-1 text-indigo-200">
                        <HiClock className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-6 text-slate-200">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {quickLinks.map(link => {
            const Icon = link.icon

            return (
              <Link
                key={link.title}
                href={`/${params.orgName}/${link.href}`}
                className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_20px_60px_-28px_rgba(79,70,229,0.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <HiChevronRight className="mt-1 h-5 w-5 text-slate-300 transition group-hover:text-indigo-500" />
                </div>

                <h3 className="mt-8 text-lg font-semibold text-slate-900">
                  {link.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {link.description}
                </p>
              </Link>
            )
          })}
        </section>
      </div>
    </div>
  )
}

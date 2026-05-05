'use client'

import { useOrgMemberGet } from '@/services/organizationMember'
import { useOrgMemberStore } from '@/store/orgMember'
import { Avatar } from '@ui-components'
import { HiOutlineUserCircle, HiOutlineEnvelope, HiOutlineShieldCheck } from 'react-icons/hi2'

const roleColor: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MANAGER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MEMBER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VIEWER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export default function UsersPage() {
  useOrgMemberGet()
  const { orgMembers } = useOrgMemberStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 dark:bg-[#0f172a]">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-[0_20px_70px_-40px_rgba(15,23,42,0.9)] dark:border-gray-800">
        <div className="mx-auto flex w-full max-w-[1600px] px-6 py-8">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-indigo-200 w-fit">
              <HiOutlineUserCircle className="h-4 w-4" />
              User Management
            </div>
            <h1 className="text-2xl font-bold text-white">Team Members</h1>
            <p className="text-sm text-slate-300">
              All accounts registered in this organization. Use these members when assigning tasks.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
        {/* Stats row */}
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white dark:bg-[#182031] dark:border-gray-800 px-5 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Members</p>
            <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">{orgMembers.length}</p>
          </div>
        </div>

        {/* Member grid */}
        {orgMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-600">
            <HiOutlineUserCircle className="h-16 w-16 mb-4 opacity-40" />
            <p className="text-lg font-medium">No members found</p>
            <p className="text-sm mt-1">Invite members via Organization Settings → People</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orgMembers.map(member => (
              <div
                key={member.id}
                className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white dark:bg-[#182031] dark:border-gray-800 p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800">

                {/* Role badge */}
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${roleColor[member.role] || roleColor.MEMBER}`}>
                    <HiOutlineShieldCheck className="h-3 w-3" />
                    {member.role}
                  </span>
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <Avatar
                    size="lg"
                    src={member.photo || ''}
                    name={member.name || member.email || ''}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800 dark:text-white">
                      {member.name || '—'}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <HiOutlineEnvelope className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Member ID (useful for debugging assignee issues) */}
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Member ID</p>
                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">{member.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

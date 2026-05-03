import MemberAvatar from '@/components/MemberAvatar'
import TaskTypeIcon from '@/components/TaskTypeSelect/Icon'
import TimerButton from '@/features/TimeTracker/TimerButton'
import { TaskType } from '@prisma/client'

export default function CalTaskInMonth({
  id,
  color,
  time,
  title,
  type,
  assigneeId
}: {
  id: string
  color: string
  time: string
  type: TaskType
  title: string
  assigneeId: string
}) {
  return (
    <div className="px-2 pt-2 pb-2">
      <div
        className="absolute left-0 top-0 h-full w-[4px]"
        style={{ backgroundColor: color }}></div>
      <div className="flex items-center justify-between gap-1" title={title}>
        <h2 className="truncate space-x-1 text-slate-700 dark:text-slate-200">
          <TaskTypeIcon size="sm" type={type || ''} />
          <span>{title}</span>
        </h2>
        <TimerButton taskId={id} pauseOnly={true} />
        <MemberAvatar noName={true} uid={assigneeId} />
      </div>
      <div className="text-xs text-slate-400 dark:text-slate-500">{time}</div>
    </div>
  )
}

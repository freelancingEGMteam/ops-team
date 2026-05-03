import { ETaskFilterGroupByType } from '@/features/TaskFilter/context'
import useOutsideClick from '@/hooks/useOutsideClick'
import { useServiceTaskAdd } from '@/hooks/useServiceTaskAdd'
import { useUser } from '@auth-client'
import { Task, TaskPriority } from '@prisma/client'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { AiOutlinePlus } from 'react-icons/ai'

interface IListCreateTaskProps {
  type: ETaskFilterGroupByType
  groupId: string
}

export default function ListCreateTask({
  type,
  groupId
}: IListCreateTaskProps) {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { taskCreateOne } = useServiceTaskAdd()
  const { projectId } = useParams()
  const { user } = useUser()

  const handleClickOutside = () => {
    if (visible) {
      setVisible(false)
      inputRef.current && (inputRef.current.value = '')
    }
  }

  useOutsideClick(containerRef, handleClickOutside)

  useEffect(() => {
    if (inputRef.current) {
      const inp = inputRef.current

      visible && inp.focus()
    }
  }, [visible])

  const onKeyup = (ev: KeyboardEvent<HTMLInputElement>) => {
    const key = ev.key
    const target = ev.target as HTMLInputElement
    const userId = user?.id;

    if (key.toLowerCase() === 'escape') {
      setVisible(false)
      target.value = ''
      return
    }

    if (key !== 'Enter') return

    const value = target.value.trim()
    if (!value) return

    const data: Partial<Task> = {
      dueDate: new Date(),
      title: value,
      projectId
    }

    if (userId) {
      data.assigneeIds = [userId]
    }

    if (type === ETaskFilterGroupByType.STATUS) {
      data.taskStatusId = groupId
    }

    if (type === ETaskFilterGroupByType.ASSIGNEE && groupId) {
      data.assigneeIds = [groupId]
    }

    if (type === ETaskFilterGroupByType.PRIORITY) {
      data.priority = groupId as TaskPriority
    }

    taskCreateOne(data)

    target.value = ''
    setVisible(false)
  }

  return (
    <div
      ref={containerRef}
      onClick={() => {
        setVisible(true)
      }}
      className={`group flex cursor-pointer items-center justify-between px-4 py-3 text-sm rounded-b-[24px] border-t border-dashed border-slate-200 dark:border-gray-800 ${
        visible ? 'bg-slate-50 dark:bg-[#162033]' : 'bg-white/70 dark:bg-slate-900/70'
      }`}>
      <div className="flex items-center gap-2 w-full">
        <AiOutlinePlus
          className={`shrink-0 text-slate-500 ${
            visible ? 'text-indigo-500' : ''
          }`}
        />
        <span
          className={`cursor-pointer text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 ${
            visible ? 'hidden' : ''
          }`}
          onClick={() => setVisible(true)}>
          Create new task
        </span>
        <input
          ref={inputRef}
          onKeyUp={onKeyup}
          placeholder="Input task name and press Enter to create"
          className={`bg-transparent outline-none w-full ${
            visible ? '' : 'hidden'
          }`}
        />
      </div>
    </div>
  )
}

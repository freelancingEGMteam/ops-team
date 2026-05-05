'use client'

import { messageError, messageSuccess } from '@ui-components'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ITaskDefaultValues, defaultFormikValues } from './TaskForm'
import { useTaskStore } from '@/store/task'
import { useUser } from '@auth-client'
import { taskUpdate } from '@/services/task'
import { Task } from '@prisma/client'
import { useTaskAutomation } from '@/hooks/useTaskAutomation'
import FileKitContainer from '@/components/FileKits'
import TaskDetail from '@/features/TaskDetail'
import { deleteState, onPushStateRun } from 'apps/frontend/libs/pushState'
import { HiOutlineXMark } from 'react-icons/hi2'


function TaskRightPanel({
  id,
  visible,
  setVisible,
  task,
  onSubmit
}: {
  id: string
  task: ITaskDefaultValues
  visible: boolean
  setVisible: () => void
  onSubmit: (v: ITaskDefaultValues, cb: () => void) => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={setVisible}
      />

      {/* Sliding right panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: 'min(720px, 95vw)' }}>

        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-800 px-6 py-4 flex-shrink-0">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Task Details
          </span>
          <button
            onClick={setVisible}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-800 dark:hover:text-slate-300 transition-colors">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {visible && (
            <FileKitContainer taskId={id} fileIds={task.fileIds}>
              <TaskDetail
                id={id || ''}
                cover={task.cover || ''}
                defaultValue={task}
                onSubmit={onSubmit}
              />
            </FileKitContainer>
          )}
        </div>
      </div>
    </>
  )
}

function useTaskIdChange(fn: (id: string) => void) {
  useEffect(() => {
    const destroy = onPushStateRun((url: string) => {
      const newUrl = new URL(url)
      const taskId = newUrl.searchParams.get('taskId')
      fn(taskId || '')
    })

    return () => {
      destroy()
    }
  }, [])

  useEffect(() => {
    const newUrl = new URL(window.location.toString())
    const taskId = newUrl.searchParams.get('taskId')
    if (taskId) {
      fn(taskId)
    }
  }, [])
}

export const TaskUpdate2 = () => {
  const [taskId, setTaskId] = useState('')
  const { syncRemoteTaskById, tasks, updateTask } = useTaskStore()

  const { refactorTaskFieldByAutomationConfig } = useTaskAutomation()

  const [currentTask, setCurrentTask] =
    useState<ITaskDefaultValues>(defaultFormikValues)
  const refCurrentTask = useRef<Task>()
  const { user } = useUser()

  useTaskIdChange((id) => {
    setTaskId(id)
  })

  useEffect(() => {
    if (!taskId) return
  }, [taskId])

  const closeThePanel = () => {
    deleteState('taskId')
  }

  const handleSubmit = (v: ITaskDefaultValues, cb: () => void) => {
    if (!taskId) return

    const dataUpdate = {
      ...v,
      id: taskId,
      updatedBy: user?.id,
      updatedAt: new Date()
    }

    updateTask(dataUpdate)
    closeThePanel()
    refactorTaskFieldByAutomationConfig('task', dataUpdate)

    dataUpdate.fileIds = []

    taskUpdate(dataUpdate)
      .then(res => {
        const { data, status } = res.data
        if (status !== 200) {
          cb()
          return
        }

        messageSuccess('Synced success !')
        syncRemoteTaskById(data.id, data as Task)
        cb()
      })
      .catch(err => {
        messageError('Update new task error')
        cb()
        console.log(err)
      })
  }

  useLayoutEffect(() => {
    if (!taskId || !tasks || !tasks.length) return
    const currentTask = tasks.find(task => task.id === taskId)
    refCurrentTask.current = currentTask

    if (currentTask) {
      setCurrentTask({
        title: currentTask?.title || defaultFormikValues.title,
        type: currentTask.type || defaultFormikValues.type,
        fileIds: currentTask.fileIds || [],
        cover: currentTask.cover || '',
        taskStatusId:
          currentTask?.taskStatusId || defaultFormikValues.taskStatusId,
        priority: currentTask.priority
          ? currentTask.priority
          : defaultFormikValues.priority,
        startDate: currentTask.startDate
          ? new Date(currentTask.startDate)
          : defaultFormikValues.startDate,
        dueDate: currentTask.dueDate
          ? new Date(currentTask.dueDate)
          : defaultFormikValues.dueDate,
        plannedDueDate: currentTask.plannedDueDate
          ? new Date(currentTask.plannedDueDate)
          : defaultFormikValues.plannedDueDate,
        planedStartDate: currentTask.plannedStartDate
          ? new Date(currentTask.plannedStartDate)
          : defaultFormikValues.planedStartDate,
        assigneeIds: currentTask.assigneeIds
          ? currentTask.assigneeIds
          : defaultFormikValues.assigneeIds,
        desc: currentTask.desc ? currentTask.desc : defaultFormikValues.desc,
        progress: currentTask.progress
          ? currentTask.progress
          : defaultFormikValues.progress
      })
    }
  }, [taskId, tasks])

  return (
    <TaskRightPanel
      id={taskId}
      task={currentTask}
      onSubmit={handleSubmit}
      visible={!!taskId}
      setVisible={() => {
        deleteState('taskId')
      }}
    />
  )
}

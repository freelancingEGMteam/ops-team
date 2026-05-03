'use client'

import { useTaskStore } from '../../../../../store/task'

import TaskCheckAll from './TaskCheckAll'
import ListCell from './ListCell'
import { Avatar, Loading } from '@ui-components'
import ListCreateTask from './ListCreateTask'
import TaskMultipleActions from '@/features/TaskMultipleActions'
import ListRow from './ListRow'
import useTaskFilterContext from '@/features/TaskFilter/useTaskFilterContext'

export default function ListMode() {
  const {
    groupByLoading,
    groupByItems,
    filter,
    isGroupbyPriority,
    isGroupbyAssignee,
    isGroupbyStatus
  } = useTaskFilterContext()

  const { tasks, taskLoading } = useTaskStore()

  return (
    <div className="list-view-container pb-[300px]">
      {groupByItems.map(group => {
        return (
          <div
            className="mx-1 mt-4 mb-4 relative overflow-hidden rounded-[24px] border border-slate-200 bg-white/90 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.25)] dark:border-gray-800 dark:bg-slate-900/90"
            key={group.id}>
            <div className="sticky top-[40px] z-10 flex items-center justify-between rounded-t-[24px] border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-b-gray-800 dark:bg-slate-900/95">
              <div
                style={{ color: group.color }}
                className="flex items-center gap-2 text-xs uppercase font-bold tracking-[0.14em]">
                <TaskCheckAll groupId={group.id} />
                <div
                  className={`status-name flex items-center ${groupByLoading ? 'loading' : ''
                    }`}>
                  {isGroupbyAssignee ? (
                    <div className="mr-2 inline-block">
                      <Avatar
                        size="md"
                        name={group.name}
                        src={group.icon || ''}
                      />
                    </div>
                  ) : null}
                  <span
                    className={`${isGroupbyAssignee ? 'text-slate-500 dark:text-slate-300' : ''}`}>
                    {group.name}
                  </span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[11px] uppercase font-medium tracking-[0.14em] text-slate-400 dark:text-slate-500">
                <ListCell width={150}>Assignee</ListCell>
                <ListCell width={115}>Type</ListCell>
                <ListCell width={75}>Priority</ListCell>
                <ListCell width={50}>Point</ListCell>
                <ListCell width={110}>Duedate</ListCell>
                <ListCell width={70}>Progress</ListCell>
                {/* <ListCell width={100}>Created by</ListCell> */}
              </div>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-gray-800">
              {taskLoading ? (
                <Loading className="px-4 py-3 text-sm" title="Loading ..." />
              ) : null}

              {!taskLoading &&
                tasks.map(task => {
                  if (isGroupbyStatus && task.taskStatusId !== group.id) {
                    if (group.id === 'NONE' && group.items.includes(task.id)) {
                      return <ListRow key={task.id} task={task} />
                    }
                    return null
                  }

                  if (isGroupbyAssignee) {
                    if (
                      task.assigneeIds.length &&
                      !task.assigneeIds.includes(group.id)
                    ) {
                      return null
                    }

                    if (!task.assigneeIds.length && group.id !== 'NONE') {
                      return null
                    }
                  }

                  if (isGroupbyPriority && task.priority !== group.id) {
                    return null
                  }

                  return <ListRow key={task.id} task={task} />
                })}
              <ListCreateTask type={filter.groupBy} groupId={group.id} />
            </div>
          </div>
        )
      })}
      <TaskMultipleActions />
    </div>
  )
}

'use client'

import { useTaskStore } from '../../../../../store/task'

import TaskCheckAll from './TaskCheckAll'
import ListCell from './ListCell'
import { Avatar, Loading } from '@ui-components'
import ListCreateTask from './ListCreateTask'
import TaskMultipleActions from '@/features/TaskMultipleActions'
import ListRow from './ListRow'
import useTaskFilterContext from '@/features/TaskFilter/useTaskFilterContext'
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd'
import { useBoardDndAction } from '../board/useBoardDndAction'

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
  const { dragItemToAnotherPosition } = useBoardDndAction()

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result
    if (!source || !destination) return
    if (source.index === destination.index && source.droppableId === destination.droppableId) return

    dragItemToAnotherPosition({
      sourceIndex: source.index,
      destIndex: destination.index,
      sourceColId: source.droppableId
    })
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="list-view-container pb-[300px]">
        {groupByItems.map(group => {
          return (
            <div
              className="mx-1 mt-8 mb-6 relative overflow-hidden rounded-[24px] border border-slate-200 bg-white/90 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.25)] dark:border-gray-800 dark:bg-slate-900/90"
              key={group.id}>
              <div className="sticky top-[40px] z-10 flex items-center justify-between rounded-t-[24px] border-b border-[#1e293b] bg-[#0f172a] px-4 py-3">
                <div
                  style={{ color: group.color || '#94a3b8' }}
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
                      className={`${isGroupbyAssignee ? 'text-slate-300' : 'text-white'}`}>
                      {group.name}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[11px] uppercase font-medium tracking-[0.14em] text-white/60">
                  <ListCell width={150}>Assignee</ListCell>
                  <ListCell width={115}>Type</ListCell>
                  <ListCell width={75}>Priority</ListCell>
                  <ListCell width={50}>Point</ListCell>
                  <ListCell width={110}>Duedate</ListCell>
                  <ListCell width={70}>Progress</ListCell>
                </div>
              </div>
              <Droppable droppableId={group.id} type="list-task">
                {provided => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="divide-y divide-slate-200 dark:divide-gray-800">
                    {taskLoading ? (
                      <Loading className="px-4 py-3 text-sm" title="Loading ..." />
                    ) : null}

                    {!taskLoading &&
                      group.items.map((taskId, index) => {
                        const task = tasks.find(t => t.id === taskId)
                        if (!task) return null
                        return <ListRow key={task.id} task={task} index={index} />
                      })}

                    {!taskLoading &&
                      group.items.length === 0 &&
                      tasks.map(task => {
                        if (isGroupbyStatus && task.taskStatusId !== group.id) {
                          if (group.id === 'NONE' && group.items.includes(task.id)) {
                            return <ListRow key={task.id} task={task} index={0} />
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

                        return <ListRow key={task.id} task={task} index={0} />
                      })}

                    {provided.placeholder}
                    <ListCreateTask type={filter.groupBy} groupId={group.id} />
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
        <TaskMultipleActions />
      </div>
    </DragDropContext>
  )
}

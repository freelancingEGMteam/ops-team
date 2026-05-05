import TaskCheckbox from '@/components/TaskCheckbox'
import { ExtendedTask } from '@/store/task'
import TaskStatus from './TaskStatus'
import TaskActions from '@/features/TaskActions'
import ListCell from './ListCell'
import TaskAssignee from './TaskAssignee'
import TaskPriorityCell from './TaskPriorityCell'
import TaskPoint from './TaskPoint'
import TaskDate from './TaskDate'
import { Loading } from '@ui-components'
import TaskTypeCell from './TaskTypeCell'
import TaskProgress from './TaskProgress'
import { useMemo } from 'react'
import TaskTitle from './TaskTitle'
import { Draggable } from 'react-beautiful-dnd'
import { HiOutlineBars3 } from 'react-icons/hi2'

export default function ListRow({ task, index }: { task: ExtendedTask; index: number }) {
  const isRandomId = task.id.includes('TASK-ID-RAND')
  const progress = useMemo(() => {
    const done = task.checklistDone || 0
    const todo = task.checklistTodos || 0
    const percent = (done / (todo + done)) * 100
    return isNaN(percent) ? 0 : Math.round(percent)
  }, [JSON.stringify(task)])

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group relative px-4 py-3 text-sm transition-all sm:flex items-center justify-between ${
            snapshot.isDragging
              ? 'bg-white shadow-xl dark:bg-[#1e2d45] z-50'
              : 'hover:bg-slate-50 dark:hover:bg-[#162033]'
          }`}
          key={task.id}>
          <div className="flex items-center gap-2 dark:text-gray-300 min-w-0">
            {/* Drag handle */}
            <div
              {...provided.dragHandleProps}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
              title="Drag to reorder">
              <HiOutlineBars3 className="h-4 w-4" />
            </div>
            <TaskCheckbox id={task.id} selected={task.selected} />
            <TaskStatus taskId={task.id} value={task.taskStatusId || ''} />

            {isRandomId ? <Loading enabled={true} spinnerSpeed="fast" /> : null}
            <TaskTitle id={task.id} projectId={task.projectId} title={task.title} />
            <TaskActions
              className="opacity-0 group-hover:opacity-100 transition-all duration-100"
              taskId={task.id}
            />
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-gray-300 sm:mt-0">
            <ListCell className="absolute top-3 right-3 sm:top-0 sm:left-0 sm:relative sm:w-[150px]">
              <TaskAssignee
                className="no-name"
                taskId={task.id}
                uids={task.assigneeIds}
              />
            </ListCell>
            <ListCell width={115}>
              <TaskTypeCell type={task.type} taskId={task.id} />
            </ListCell>
            <ListCell width={75} className="hidden sm:block">
              <TaskPriorityCell taskId={task.id} value={task.priority} />
            </ListCell>
            <ListCell className="hidden sm:w-[50px] sm:block">
              <TaskPoint taskId={task.id} value={task.taskPoint} />
            </ListCell>
            <ListCell className={`ml-6 sm:ml-0 sm:w-[110px]`}>
              <TaskDate
                toNow={true}
                taskId={task.id}
                date={task.dueDate ? new Date(task.dueDate) : null}
              />
            </ListCell>
            <ListCell className="hidden sm:block" width={70}>
              <TaskProgress progress={progress} taskId={task.id} />
            </ListCell>
          </div>
        </div>
      )}
    </Draggable>
  )
}

import { Droppable } from 'react-beautiful-dnd'

import BoardItemDraggable from './BoardItemDraggable'
import { BoardActionCreateTask } from './BoardActionCreateTask'

export default function BoardList({
  items,
  groupId
}: {
  items: string[]
  groupId: string
}) {
  return (
    <Droppable droppableId={groupId} type="task">
      {provided => (
        <div
          className="board-list custom-scrollbar"
          ref={provided.innerRef}
          {...provided.droppableProps}>
          {items.map((item, itemIndex) => {
            return (
              <BoardItemDraggable item={item} key={item} index={itemIndex} />
            )
          })}

          <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/90 px-3 pb-3 pt-3 backdrop-blur dark:border-gray-800 dark:bg-slate-900/90">
            <BoardActionCreateTask groupId={groupId} />
          </div>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )
}

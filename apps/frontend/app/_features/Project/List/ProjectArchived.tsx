import { useDebounce } from '@/hooks/useDebounce'
import ProjectItem from './ProjectItem'
import { useProjectArchiveStore } from '@/store/projecArchived'
import useServiceProjectArchive from '@/hooks/useServiceProjectArchive'

export default function ProjectArchived() {
  const { projects: archivedProjects } = useProjectArchiveStore()
  const { getArchivedProject } = useServiceProjectArchive()

  useDebounce(() => {
    getArchivedProject()
  }, [])

  if (!archivedProjects.length) return null

  return (
    <div className="mt-4">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Archived projects
      </h2>
      <p className="mb-5 text-sm text-slate-500">
        Keep older work accessible without cluttering active delivery.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {archivedProjects.map(project => {
          return (
            <ProjectItem isArchived={true} key={project.id} project={project} />
          )
        })}
      </div>
    </div>
  )
}

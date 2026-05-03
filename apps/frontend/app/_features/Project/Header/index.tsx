import ProjectMemberView from "@/features/ProjectMember/View"
import { useProjectStore } from "@/store/project"

export default function ProjectHeader() {
  const { selectedProject } = useProjectStore(state => state)
  return <div className="flex items-start justify-between gap-4">
    <div className="flex min-w-0 items-center gap-3">
      {/* <Link */}
      {/*   href={`${params.orgID}/project`} */}
      {/*   className="hidden sm:inline-block p-2 border rounded-md bg-white text-sm text-gray-500 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:hover:bg-slate-800"> */}
      {/*   <AiOutlineArrowLeft /> */}
      {/* </Link> */}

      {selectedProject?.icon ? (
        <img
          alt={selectedProject.icon}
          src={selectedProject?.icon || ''}
          className="h-8 w-8 rounded-xl"
        />
      ) : null}
      <div className="min-w-0">
        <h2 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {selectedProject?.name || (
            <span className="h-8 rounded-md bg-white/10 text-transparent animate-pulse">
              Project
            </span>
          )}
        </h2>
      </div>
    </div>
    <ProjectMemberView />
  </div>
}

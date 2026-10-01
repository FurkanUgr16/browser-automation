import { WorkflowShell } from "@/features/workflows/components/workflow-shell"

type WorkflowPageProps = {
  params: Promise<{ id: string }>
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = await params

  return <WorkflowShell workflowId={id} />
}

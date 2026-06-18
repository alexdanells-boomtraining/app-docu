import Workspace from "../workspace"

export default async function Page({
  params,
}: {
  params: Promise<{ id?: string[] }>
}) {
  const { id } = await params
  return <Workspace initialId={id?.[0] ?? null} />
}

import { AdminGlobalEditor } from "./_components/AdminGlobalEditor";

export default async function AdminGlobalEditPage({ params }) {
  const { key } = await params;

  return <AdminGlobalEditor globalKey={key} />;
}

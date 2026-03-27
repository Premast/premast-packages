import { AdminPageEditor } from "./_components/AdminPageEditor";

export default async function AdminPageEditPage({ params }) {
  const { id } = await params;

  return <AdminPageEditor pageId={id} />;
}

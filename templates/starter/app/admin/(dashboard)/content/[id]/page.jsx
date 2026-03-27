import { AdminContentEditor } from "./_components/AdminContentEditor";

export default async function AdminContentEditPage({ params }) {
  const { id } = await params;

  return <AdminContentEditor contentId={id} />;
}

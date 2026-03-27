import { AdminTemplateEditor } from "./_components/AdminTemplateEditor";

export default async function AdminTemplateEditPage({ params }) {
  const { id } = await params;

  return <AdminTemplateEditor templateId={id} />;
}

import { Suspense } from "react";
import { AdminContentView } from "./_components/AdminContentView";

export default function AdminContentPage() {
  return (
    <Suspense>
      <AdminContentView />
    </Suspense>
  );
}

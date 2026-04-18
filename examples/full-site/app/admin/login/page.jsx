import { Suspense } from "react";
import { LoginPage } from "@premast/site-core/admin";

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}

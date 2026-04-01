import { cookies } from "next/headers";
import MainLayout from "@/common/components/layout/MainLayout";

export default async function MainGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialRole = cookieStore.get("user_role")?.value ?? "RECEPTIONIST";

  return <MainLayout initialRole={initialRole}>{children}</MainLayout>;
}

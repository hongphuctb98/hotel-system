import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import MainLayout from "@/common/components/layout/MainLayout";

export default async function MainGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getAuthUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <MainLayout role={user.role} userId={user.sub}>{children}</MainLayout>;
}

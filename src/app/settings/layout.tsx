import { auth } from "@/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar userName={session?.user?.name ?? session?.user?.email ?? ""} />
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}

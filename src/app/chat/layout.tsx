import { auth } from "@/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar userName={session?.user?.name ?? session?.user?.email ?? ""} />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}

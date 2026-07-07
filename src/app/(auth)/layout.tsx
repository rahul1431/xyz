export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-pink-50 to-white px-4 dark:from-zinc-950 dark:to-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500 text-2xl">
            💬
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Saathi
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your private AI companion
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

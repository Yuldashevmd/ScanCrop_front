export function ErrorBoundary({ error }: { error: string | null }) {
  if (!error) return null;

  return <div className="bg-red-100 text-red-700 rounded-xl p-4 w-full">{error}</div>;
}

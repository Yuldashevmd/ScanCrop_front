export function Loading({ loading }: { loading: boolean }) {
  if (!loading) return null;

  return <div className="text-gray-800 text-lg animate-pulse">Analysing photos...</div>;
}

export function Loading({ loading }: { loading: boolean }) {
  if (!loading) return null;

  return <div className="text-white mt-6 text-xl animate-pulse">Analysing photos...</div>;
}

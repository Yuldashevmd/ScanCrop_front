import { Outlet } from 'react-router';
import { HeaderUI } from 'widgets/header';

export function Layout() {
  return (
    <main>
      <HeaderUI />
      <section className="max-w-[1080px] mx-auto px-2 xl:px-0">
        <Outlet />
      </section>
    </main>
  );
}

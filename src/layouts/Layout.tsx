import { Outlet } from 'react-router';
import Header from '../components/Header';

export default function Layout() {
  return (
    <>
      <Header />
      <main className="mx-10 mb-10 flex flex-col items-center justify-center lg:mx-20 lg:mb-20">
        <Outlet />
      </main>
    </>
  );
}

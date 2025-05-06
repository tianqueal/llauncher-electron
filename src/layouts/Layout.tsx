import { Outlet } from 'react-router';
import Header from '../components/Header';
import { ToastContainer, Bounce } from 'react-toastify';

export default function Layout() {
  return (
    <>
      <Header />
      <main className="mx-10 mb-10 flex flex-col items-center justify-center lg:mx-20 lg:mb-20">
        <Outlet />
      </main>

      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        limit={3}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        stacked
        theme="dark"
        transition={Bounce}
      />
    </>
  );
}

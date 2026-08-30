import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar />
      <div className="flex min-h-[calc(100vh-70px)] pt-[70px]">
        <Sidebar />
        <main className="flex-1 overflow-auto md:ml-[280px]">
          {children}
        </main>
      </div>
    </div>
  );
}

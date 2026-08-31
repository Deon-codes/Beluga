import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#050a14] text-slate-100">
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] pt-16">{children}</main>
    </div>
  );
}

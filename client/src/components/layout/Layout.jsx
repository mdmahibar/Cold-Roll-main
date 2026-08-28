import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import { SidebarProvider } from '../../context/SidebarContext';

const Layout = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col bg-sap-light overflow-hidden font-inter">
        {/* Top Navbar - full width */}
        <Navbar />
        {/* Below navbar: Sidebar + (TopNav + Content) */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopNav />
            <main className="flex-1 overflow-auto bg-sap-light px-6 py-5">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;

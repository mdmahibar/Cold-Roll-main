import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import router from './routes/AppRoutes';
import { DivisionProvider } from './context/DivisionContext';
import { AuthProvider } from './context/AuthContext';
import { CookiesProvider } from 'react-cookie';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <CookiesProvider>
        <AuthProvider>
          <DivisionProvider>
            <RouterProvider router={router} />
            {/* Single app-wide toast host. Must live above the router so it
                stays mounted across navigation — a ToastContainer that unmounts
                (e.g. one inside LoginPage) buffers in-flight toasts and replays
                them when it remounts, e.g. the stale "Welcome back" on logout. */}
            <ToastContainer />
          </DivisionProvider>
        </AuthProvider>
      </CookiesProvider>
    </QueryClientProvider>
  );
}

export default App;

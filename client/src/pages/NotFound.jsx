import { useNavigate } from 'react-router-dom';
import { SearchX, LayoutDashboard } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-[60vh] w-full items-center justify-center">
            <div className="max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <SearchX className="h-7 w-7 text-slate-400" />
                </div>
                <h1 className="text-[20px] font-bold text-gray-900">Screen not found</h1>
                <p className="mt-2 text-[13px] text-gray-500">
                    This module has not been built yet or the link is out of date.
                </p>
                <button
                    onClick={() => navigate('/dashboard', { replace: true })}
                    className="mt-7 inline-flex items-center gap-1.5 rounded-lg bg-sap-primary px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Back to dashboard
                </button>
            </div>
        </div>
    );
};

export default NotFound;

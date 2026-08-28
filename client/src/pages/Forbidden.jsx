import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';

/**
 * Shown when PermissionRoute blocks a navigation. Deliberately does not
 * reveal what the screen contains — only that access was denied.
 */
const Forbidden = () => {
    const navigate = useNavigate();
    const { state } = useLocation();

    return (
        <div className="flex min-h-[60vh] w-full items-center justify-center">
            <div className="max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                    <ShieldAlert className="h-7 w-7 text-amber-500" />
                </div>

                <h1 className="text-[20px] font-bold text-gray-900">Access denied</h1>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
                    Your role does not have permission to open this screen.
                    {state?.menuKey ? (
                        <>
                            {' '}Requested: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11.5px]">{state.menuKey}</code>
                        </>
                    ) : null}
                </p>
                <p className="mt-2 text-[12px] text-gray-400">
                    Contact your administrator to have it granted in the Authorisation Matrix.
                </p>

                <div className="mt-7 flex items-center justify-center gap-2.5">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-[12.5px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Go back
                    </button>
                    <button
                        onClick={() => navigate('/dashboard', { replace: true })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sap-primary px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
                    >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Forbidden;

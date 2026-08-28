const AuthLoader = ({ message = 'Loading...' }) => (
    <div className="flex h-screen w-full items-center justify-center bg-sap-light">
        <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-sap-primary" />
            <p className="text-sm font-medium text-gray-500">{message}</p>
        </div>
    </div>
);

export default AuthLoader;

import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TOP_NAV_ITEMS } from '../../routes/menuConfig';

/** Quick-access tab strip — same permission filter as the sidebar. */
const TopNav = () => {
    const { can } = useAuth();

    const tabs = useMemo(() => TOP_NAV_ITEMS.filter((tab) => can(tab.path, 'view')), [can]);

    if (tabs.length === 0) return null;

    return (
        <div className="flex h-10 w-full shrink-0 border-b border-gray-200 bg-white px-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] z-10 relative">
            <nav className="flex items-stretch gap-0 overflow-x-auto overflow-y-hidden" aria-label="Tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            className={({ isActive }) =>
                                `flex items-center gap-1.5 whitespace-nowrap border-b-[2.5px] px-3.5 text-[11.5px] font-semibold tracking-wide transition-colors h-full ${
                                    isActive
                                        ? 'border-sap-primary text-sap-primary'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-sap-primary' : 'text-gray-400'}`} />
                                    <span>{tab.name}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>
        </div>
    );
};

export default TopNav;

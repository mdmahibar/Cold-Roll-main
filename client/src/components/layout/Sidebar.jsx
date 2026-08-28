import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { MENU_SECTIONS } from '../../routes/menuConfig';
import { menuTreeToSections } from '../../routes/dynamicMenu';

/**
 * The sidebar renders the server-owned menu (objMenu from LoginWiseData),
 * filtered by the live permission matrix so a user never sees a link they
 * cannot open. When that menu has not loaded yet it falls back to the static
 * MENU_SECTIONS config. Either way the real enforcement is PermissionRoute
 * inside the router — this is a UX convenience.
 */
const Sidebar = () => {
    const { isCollapsed } = useSidebar();
    const { can, menu } = useAuth();

    const sections = useMemo(() => {
        //! Prefer the dynamic menu shipped by the API; fall back to the
        //! bundled config until (or if) it arrives.
        const dynamic = menuTreeToSections(menu, can);
        if (dynamic.length > 0) return dynamic;

        return MENU_SECTIONS.map((section) => ({
            ...section,
            items: section.items.filter((item) => can(item.path, 'view')),
        })).filter((section) => section.items.length > 0);
    }, [menu, can]);

    return (
        <aside
            className={`relative z-0 flex shrink-0 flex-col border-r border-blue-700 bg-blue-600 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${
                isCollapsed ? 'w-[52px]' : 'w-[210px]'
            }`}
        >
            <nav className={`flex flex-col gap-3 py-3 ${isCollapsed ? 'px-1' : 'px-2.5'}`} aria-label="Sidebar">
                {sections.length === 0 && !isCollapsed && (
                    <p className="px-2 py-4 text-[11px] leading-relaxed text-blue-200">
                        No screens have been assigned to your role yet. Please contact your administrator.
                    </p>
                )}

                {sections.map((section, index) => (
                    <div key={section.title || `section-${index}`} className="flex flex-col gap-[2px]">
                        {!isCollapsed && section.title && (
                            <h3 className="px-2 text-[9.5px] font-bold uppercase tracking-[0.08em] text-blue-200 mb-1 mt-0.5 select-none">
                                {section.title}
                            </h3>
                        )}
                        {isCollapsed && <div className="mx-2 my-1 border-t border-blue-500" />}

                        {section.items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    title={isCollapsed ? item.name : undefined}
                                    className={({ isActive }) =>
                                        `group flex items-center rounded-md text-[12.5px] font-medium transition-all duration-150 relative ${
                                            isCollapsed
                                                ? `justify-center p-2 ${
                                                      isActive
                                                          ? 'bg-blue-700 text-white border-l-[3px] border-white'
                                                          : 'text-blue-100 hover:bg-blue-700 hover:text-white border-l-[3px] border-transparent'
                                                  }`
                                                : `gap-2 px-2 py-[6px] ${
                                                      isActive
                                                          ? 'bg-blue-700 text-white border-l-[3px] border-white pl-[7px]'
                                                          : 'text-blue-100 hover:bg-blue-700 hover:text-white border-l-[3px] border-transparent pl-[7px]'
                                                  }`
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon
                                                className={`h-[15px] w-[15px] shrink-0 ${
                                                    isActive ? 'text-white' : 'text-blue-300 group-hover:text-white'
                                                }`}
                                            />
                                            {!isCollapsed && <span className="truncate flex-1">{item.name}</span>}
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;

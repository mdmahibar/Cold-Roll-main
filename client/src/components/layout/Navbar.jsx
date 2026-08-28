import { useState, useRef, useEffect } from 'react';
import { Menu, MapPin, LogOut, User, ChevronDown, Building2, CalendarDays } from 'lucide-react';
import { useDivision } from '../../context/DivisionContext';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import ColdRollLogo from '../../common/images/Logo .PNG';

const Navbar = () => {
  const { selectedDivision, setSelectedDivision } = useDivision();
  const { toggleSidebar } = useSidebar();
  const { user, logout, loginWiseData, divisions } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDivDropdown, setShowDivDropdown] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dropRef = useRef(null);
  const divDropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (divDropRef.current && !divDropRef.current.contains(e.target)) {
        setShowDivDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-select the Milk division from API when available, fallback to first
  useEffect(() => {
    if (divisions.length > 0 && !selectedDivision) {
      const milkDiv = divisions.find(d => d.divisionName?.toUpperCase().includes('MILK'));
      setSelectedDivision(milkDiv ? milkDiv.divisionCode : divisions[0].divisionCode);
    }
  }, [divisions, selectedDivision, setSelectedDivision]);

  const displayName = user?.userName || user?.userCode || 'User';
  const displayRole = user?.roleName || (user?.isSuperUser ? 'Administrator' : 'User');
  const initial = displayName.charAt(0).toUpperCase();

  //! Branch / financial year come from /api/LoginData/LoginWiseData
  const branch = loginWiseData?.BranchName || loginWiseData?.branchName || '';
  const financialYear = loginWiseData?.FinancialYear || loginWiseData?.financialYear || '';

  const handleSignOut = async () => {
    setShowDropdown(false);
    setIsSigningOut(true);
    await logout();
    setIsSigningOut(false);
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between bg-sap-dark px-4 text-white shadow-md z-30 relative w-full">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded p-1.5 hover:bg-white/10 transition-colors focus:outline-none"
        >
          <Menu className="h-5 w-5 text-slate-300" />
        </button>

        {/* Logo & Brand */}
        <div className="flex items-center gap-3 ml-1">
          <img
            src={ColdRollLogo}
            alt="Cold Roll"
            className="object-contain drop-shadow-md"
            style={{ height: '36px', filter: 'contrast(1.1) brightness(1.05)' }}
          />
          <div className="hidden md:flex flex-col leading-none">
            <span className="text-[14px] font-bold tracking-wide text-white" style={{ letterSpacing: '0.04em' }}>
              COLD ROLL
            </span>
            <span className="text-[9.5px] font-medium text-slate-400 mt-0.5 tracking-wider">
              MASHAKTI FOOD PRODUCTS
            </span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Division Dropdown — dynamic from API objDivision */}
        {divisions.length > 0 && (
          <div className="relative hidden md:block" ref={divDropRef}>
            <button
              onClick={() => setShowDivDropdown(!showDivDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-sap-primary text-white shadow-sm hover:bg-sap-primary/90 transition-colors"
            >
              {(() => {
                const activeDiv = divisions.find((d) => d.divisionCode === selectedDivision);
                const activeName = activeDiv?.divisionName || 'Select Division';
                const activeIcon = activeName.toUpperCase().includes('ICE') ? '🍦' : '🥛';
                return (
                  <>
                    <span>{activeIcon} {activeName}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showDivDropdown ? 'rotate-180' : ''}`} />
                  </>
                );
              })()}
            </button>

            {/* Dropdown Menu */}
            {showDivDropdown && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                <div className="py-1">
                  {divisions.map((div) => {
                    const code = div.divisionCode;
                    const name = div.divisionName;
                    const icon = name.toUpperCase().includes('ICE') ? '🍦' : '🥛';
                    const isActive = selectedDivision === code;

                    return (
                      <button
                        key={code}
                        onClick={() => {
                          setSelectedDivision(code);
                          setShowDivDropdown(false);
                        }}
                        className={`w-full text-left flex items-center gap-2.5 px-4 py-2 text-[12px] font-medium transition-colors ${
                          isActive 
                            ? 'bg-blue-50 text-sap-primary' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="text-sm">{icon}</span>
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Branch */}
        {branch && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-300 cursor-pointer hover:text-white transition-colors">
            <MapPin className="h-3.5 w-3.5 text-red-400" />
            <span>{branch}</span>
          </div>
        )}

        {/* User avatar + dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 pl-3 border-l border-white/15 cursor-pointer hover:bg-white/5 rounded-r-lg pr-2 py-1 transition-colors"
          >
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-200 tracking-wide">
              {(user?.userCode || 'USER').toUpperCase()}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sap-primary font-bold text-[11px] text-white ring-2 ring-white/20 shadow-sm">
              {initial}
            </div>
            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white text-gray-800 shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              {/* User info header */}
              <div className="px-4 py-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sap-primary text-white font-bold text-sm shadow-sm">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{displayName}</p>
                    <p className="text-[10.5px] text-gray-500 font-medium">{displayRole}</p>
                  </div>
                </div>
              </div>

              {/* Session details */}
              <div className="px-4 py-3 space-y-2 border-b border-gray-100">
                <div className="flex items-center gap-2.5 text-[11.5px] text-gray-600">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-medium">Branch:</span>
                  <span className="font-bold text-gray-800">{branch || '—'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[11.5px] text-gray-600">
                  <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-medium">FY:</span>
                  <span className="font-bold text-gray-800">{financialYear || '—'}</span>
                </div>
              </div>

              {/* Logout */}
              <div className="p-2">
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

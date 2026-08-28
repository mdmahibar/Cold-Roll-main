import React, { useEffect, useState, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useCookies } from 'react-cookie';
import { GetAllUserListData, GetUserData, InsertUserData, UpdateUserData } from '../../services/User';
import { GetAllRoleListData, GetRoleData, InsertRoleData, UpdateRoleData } from '../../services/Role';
import { GetMasterData } from '../../services/Master';
import { GetRoleWiseMenuData, PostUserPermissionData } from '../../services/UserPermission';
import { usePermission } from '../../hooks/usePermission';
import {
    Users,
    Tag,
    ShieldCheck,
    Search,
    Plus,
    Lock,
    X,
    Check,
    UserPlus,
    Save,
    Eye,
    EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/common';
import ListingPage from '../../components/ListingTable/ListingPage';
import './index.css';

const UsersAndRoles = () => {
    const navigate = useNavigate();
    const [cookies] = useCookies(['AccessKey', 'UserId', 'AuthToken', 'SAPApplicable']);

    //! Authorization for this screen (menu key = MenuURL '/users')
    const { canAdd, canEdit } = usePermission('/users');
    const [currentPage1, setCurrentPage1] = useState(0);
    const prevSearchTermRef1 = useRef('');
    const [currentPage2, setCurrentPage2] = useState(0);
    const prevSearchTermRef2 = useRef('');
    const [isLoading, setIsLoading] = useState(false);

    // ── User List Data ──
    const [userListData, setUserListData] = useState([]);
    const [originalUserListData, setOriginalUserListData] = useState([]);

    // ── Role List Data ──
    const [roleListData, setRoleListData] = useState([]);
    const [originalRoleListData, setOriginalRoleListData] = useState([]);

    // ── SAP User List Data ──
    const [SAPUserListData, setSAPUserListData] = useState([]);

    // ── User Modal State ──
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [actionText, setActionText] = useState('Add');
    const [actionBtnText, setActionBtnText] = useState('Save');
    const [isBtnSaving, setIsBtnSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userId, setUserId] = useState(-1);

    // ── User Form State (consolidated) ──
    const [userData, setUserData] = useState({
        userName: '',
        userCode: '',
        fullName: '',
        emailID: '',
        mobileNo: '',
        employeeID: '',
        department: '',
        roleId: '',
        SAPUserID: '',
        userPassword: '',
        confirmPassword: '',
        SAPUserPassword: '',
        isActive: true,
        forcePasswordChange: false,
        enable2FA: false,
    });

    const [showSAPPassword, setShowSAPPassword] = useState(false);

    const [selectedDivisions, setSelectedDivisions] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);

    // ── Role Modal State ──
    const [isAddEditRoleModalOpen, setIsAddEditRoleModalOpen] = useState(false);
    const [roleActionText, setRoleActionText] = useState('Add');
    const [roleActionBtnText, setRoleActionBtnText] = useState('Save');
    const [roleId, setRoleId] = useState(-1);

    // ── Role Form State (consolidated) ──
    const [roleData, setRoleData] = useState({
        roleCode: '',
        roleName: '',
        roleDesc: '',
        // roleDivScope: '',
        // roleLocScope: '',
        roleIsActive: true,
    });

    // ── Tab State ──
    const [activeTab, setActiveTab] = useState('Users');

    // ── Filter State ──
    const [searchText, setSearchText] = useState('');
    const [filterDivision, setFilterDivision] = useState('All Divisions');
    const [filterLocation, setFilterLocation] = useState('All Locations');

    const [availableDivisions, setAvailableDivisions] = useState([]);
    const [availableLocations, setAvailableLocations] = useState([]);

    // ── ListingPage Column Definitions for Users ──
    const userListingColumns = [
        { header: 'Username', field: 'userName', type: 'text' },
        { header: 'Email', field: 'emailID', type: 'text' },
        {
            header: 'Divisions',
            field: 'objDivision',
            render: (val, row) => {
                const divs = row.objDivision || [];
                if (!divs.length) return '—';
                return (
                    <div className="uar-badge-gap">
                        {divs.map((div) => (
                            <span key={div.divisionCode} className="uar-badge-base uar-badge-div-default">
                                {div.divisionName}
                            </span>
                        ))}
                    </div>
                );
            },
        },
        {
            header: 'Locations',
            field: 'objLocation',
            render: (val, row) => {
                const locs = row.objLocation || [];
                if (!locs.length) return '—';
                return (
                    <div className="uar-badge-gap">
                        {locs.map((loc) => (
                            <span key={loc.locationCode} className="uar-badge-location">
                                {loc.locationName}
                            </span>
                        ))}
                    </div>
                );
            },
        },
        {
            header: 'Role',
            field: 'roleId',
            type: 'badge',
            badgeFn: (value) => {
                if (value === 1) return { variant: 'info', label: value };
                if (value === 2) return { variant: 'warning', label: value };
                return { variant: 'neutral', label: value || '—' };
            },
        },
        {
            header: 'Status',
            field: 'isActive',
            type: 'badge',
            badgeFn: (value) => {
                if (value === 'Y') return { variant: 'success', label: 'Active', dot: true };
                return { variant: 'error', label: 'Inactive', dot: true };
            },
        },
        { header: 'Last Login', field: 'lastLoginTime', type: 'text' },
    ];

    const [roleColumns, setRoleColumns] = useState([
        { name: 'roleId', label: 'No', type: 'sl_no', placeholder: '', isFilterDisplay: 0, isTableDisplay: 1 },
        { name: 'roleName', label: 'Role Name', type: '', placeholder: 'Role Name', isFilterDisplay: 0, isTableDisplay: 1, render: (row) => row.name || row.Name || row.roleName },
        { name: 'description', label: 'Description', type: '', placeholder: 'Description', isFilterDisplay: 0, isTableDisplay: 1, render: (row) => row.desc || row.description || row.Desc },
        // { name: 'divScope', label: 'Division Scope', type: '', placeholder: 'Division Scope', isFilterDisplay: 0, isTableDisplay: 1, render: (row) => row.divScope || row.DivisionScope || row.DivScope },
        // { name: 'locScope', label: 'Location Scope', type: '', placeholder: 'Location Scope', isFilterDisplay: 0, isTableDisplay: 1, render: (row) => row.locScope || row.LocationScope || row.LocScope },
        { name: 'action', label: 'Action', type: 'action_icon', placeholder: '', isFilterDisplay: 0, isTableDisplay: 1, isDelete: 0, isView: 1, isEdit: 1 },
        { name: 'Search', label: 'Search', type: 'text', placeholder: 'Search ...', isFilterDisplay: 1, isTableDisplay: 0 },
    ]);

    const roleListingColumns = [
        { header: 'No', field: 'roleId', type: 'text', render: (val, row) => row.roleId || row.id || row.Id || '—' },
        { header: 'Role Name', field: 'roleName', type: 'text', render: (val, row) => row.name || row.Name || row.roleName },
        { header: 'Description', field: 'description', type: 'text', render: (val, row) => row.desc || row.description || row.Desc },
    ];

    /* ═══════════════════════════════════════════════════════════════
       pickField — Resolve a value from an object by matching its keys
       against an ordered list of patterns (handles unknown API casing)
       ═══════════════════════════════════════════════════════════════ */
    const pickField = (obj, patterns) => {
        if (!obj || typeof obj !== 'object') return '';
        const keys = Object.keys(obj);
        for (const pattern of patterns) {
            const key = keys.find(k => pattern.test(k) && obj[k] != null && obj[k] !== '');
            if (key) return obj[key];
        }
        return '';
    };

    /* ═══════════════════════════════════════════════════════════════
       handleChange — Generic User Form Handler
       ═══════════════════════════════════════════════════════════════ */
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUserData(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    /* ═══════════════════════════════════════════════════════════════
       handleRoleChange — Generic Role Form Handler
       ═══════════════════════════════════════════════════════════════ */
    const handleRoleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setRoleData(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    /* ═══════════════════════════════════════════════════════════════
       useEffect — Fetch User List (GET /api/User/GetAllUser)
       ═══════════════════════════════════════════════════════════════ */
    useEffect(() => {
        const fetchUserListData = async () => {
            try {
                setIsLoading(true);
                let PJsonData = {};
                let responseJson = await GetAllUserListData('GetAllUser', PJsonData, cookies);
                let userArr = responseJson.data;
                if (userArr && userArr.Table && Array.isArray(userArr.Table)) {
                    userArr = userArr.Table;
                }
                if (!Array.isArray(userArr)) userArr = [];
                setUserListData(userArr);
                setOriginalUserListData(userArr);
                setIsLoading(false);
            } catch {
                setUserListData([]);
                setOriginalUserListData([]);
                setIsLoading(false);
                toast.error('An error occurred. Please try again later.');
            }
        };

        if (cookies.AuthToken) {
            fetchUserListData();
        }
    }, [cookies.AuthToken]);

    /* ═══════════════════════════════════════════════════════════════
       useEffect — Fetch Role List (GET /api/Role/GetAllRole)
       ═══════════════════════════════════════════════════════════════ */
    useEffect(() => {
        const fetchRoleListData = async () => {
            try {
                let PJsonData = {};
                let responseJson = await GetAllRoleListData('GetAllRole', PJsonData, cookies);
                let roleArr = responseJson.data;
                if (roleArr && roleArr.Table && Array.isArray(roleArr.Table)) {
                    roleArr = roleArr.Table;
                }
                if (!Array.isArray(roleArr)) roleArr = [];
                setRoleListData(roleArr);
                setOriginalRoleListData(roleArr);
            } catch {
                setRoleListData([]);
                setOriginalRoleListData([]);
                toast.error('An error occurred. Please try again later.');
            }
        };

        if (cookies.AuthToken) {
            fetchRoleListData();
        }
    }, [cookies.AuthToken]);

    /* ═══════════════════════════════════════════════════════════════
       useEffect — Fetch SAP User List (GET /api/Master/GetAllSAPUser)
       ═══════════════════════════════════════════════════════════════ */
    useEffect(() => {
        const fetchSAPUserList = async () => {
            try {
                let PJsonData = {};
                let responseJson = await GetMasterData('GetAllSAPUser', PJsonData, cookies);
                setSAPUserListData(responseJson.data || []);
            } catch {
                setSAPUserListData([]);
                toast.error('An error occurred. Please try again later.');
            }
        };

        if (cookies.AuthToken) {
            fetchSAPUserList();
        }
    }, [cookies.AuthToken]);

    /* ═══════════════════════════════════════════════════════════════
       useEffect — Fetch Division List (GET /api/Master/GetAllDivision)
       ═══════════════════════════════════════════════════════════════ */
    useEffect(() => {
        const fetchDivisionList = async () => {
            try {
                let PJsonData = {};
                let responseJson = await GetMasterData('GetAllDivision', PJsonData, cookies);
                let divArr = responseJson.data;
                if (divArr && divArr.Table && Array.isArray(divArr.Table)) divArr = divArr.Table;
                if (!Array.isArray(divArr)) divArr = [];
                setAvailableDivisions(divArr.map(d => {
                    //! Resolve regardless of API casing (e.g. DivisionID / DivName / DivCode)
                    const code = pickField(d, [/^division(code|id)$/i, /^div(code|id)$/i, /(code|id)$/i]);
                    const name = pickField(d, [/^division(name|desc)/i, /^div(name|desc)/i, /(name|desc)$/i]) || code;
                    let colorClass = 'uar-badge-div-default';
                    if (name === 'MILK') colorClass = 'uar-badge-div-milk';
                    else if (name === 'ICE' || name === 'ICE CREAM') colorClass = 'uar-badge-div-ice';
                    return { id: code, label: name, emoji: '', colorClass };
                }));
            } catch {
                setAvailableDivisions([]);
                toast.error('An error occurred. Please try again later.');
            }
        };

        if (cookies.AuthToken) {
            fetchDivisionList();
        }
    }, [cookies.AuthToken]);

    /* ═══════════════════════════════════════════════════════════════
       useEffect — Fetch Location List (GET /api/Master/GetAllLocation)
       ═══════════════════════════════════════════════════════════════ */
    useEffect(() => {
        const fetchLocationList = async () => {
            try {
                let PJsonData = {};
                let responseJson = await GetMasterData('GetAllLocation', PJsonData, cookies);
                let locArr = responseJson.data;
                if (locArr && locArr.Table && Array.isArray(locArr.Table)) locArr = locArr.Table;
                if (!Array.isArray(locArr)) locArr = [];
                setAvailableLocations(locArr.map(l => {
                    //! Resolve regardless of API casing (e.g. LocationID / LocName / LocCode)
                    const code = pickField(l, [/^location(code|id)$/i, /^loc(code|id)$/i, /(code|id)$/i]);
                    const name = pickField(l, [/^location(name|desc)/i, /^loc(name|desc)/i, /(name|desc)$/i]) || code;
                    return { id: code, label: name, emoji: '', colorClass: 'uar-badge-location' };
                }));
            } catch {
                setAvailableLocations([]);
                toast.error('An error occurred. Please try again later.');
            }
        };

        if (cookies.AuthToken) {
            fetchLocationList();
        }
    }, [cookies.AuthToken]);

    /* ═══════════════════════════════════════════════════════════════
       handleSearch — Filter User List
       ═══════════════════════════════════════════════════════════════ */
    const handleSearch = (filterValues) => {
        const newSearchTerm = filterValues.Search || '';

        if (newSearchTerm !== prevSearchTermRef1.current) {
            prevSearchTermRef1.current = newSearchTerm;
            setCurrentPage1(0);
        }

        if (Object.values(filterValues).every(value => !value)) {
            setUserListData(originalUserListData);
            return;
        }

        const filtered = originalUserListData.filter((item) => {
            return (
                (filterValues.Search
                    ? Object.values(item).some(
                        (value) =>
                            typeof value === 'string' && value.toLowerCase().includes(filterValues.Search.toLowerCase())
                    )
                    : true)
            );
        });

        setUserListData(filtered);
    };

    /* ═══════════════════════════════════════════════════════════════
       applyFilters — Apply combined search + division + location filters
       ═══════════════════════════════════════════════════════════════ */
    const applyFilters = (search, division, location) => {
        let filtered = [...originalUserListData];

        // Text search across all string fields
        if (search) {
            const term = search.toLowerCase();
            filtered = filtered.filter(item =>
                (item.username && item.username.toLowerCase().includes(term)) ||
                (item.fullName && item.fullName.toLowerCase().includes(term)) ||
                (item.email && item.email.toLowerCase().includes(term)) ||
                (item.role && item.role.toLowerCase().includes(term))
            );
        }

        // Division filter
        if (division && division !== 'All Divisions') {
            filtered = filtered.filter(item =>
                item.divisions && item.divisions.some(d =>
                    d.toLowerCase().includes(division.toLowerCase())
                )
            );
        }

        // Location filter
        if (location && location !== 'All Locations') {
            filtered = filtered.filter(item =>
                item.locations && item.locations.some(l =>
                    l.toLowerCase().includes(location.toLowerCase())
                )
            );
        }

        setUserListData(filtered);
    };

    const onSearchChange = (value) => {
        setSearchText(value);
        applyFilters(value, filterDivision, filterLocation);
    };

    const onDivisionChange = (value) => {
        setFilterDivision(value);
        applyFilters(searchText, value, filterLocation);
    };

    const onLocationChange = (value) => {
        setFilterLocation(value);
        applyFilters(searchText, filterDivision, value);
    };

    /* ═══════════════════════════════════════════════════════════════
       handleToggleStatus — Activate / Deactivate User
       ═══════════════════════════════════════════════════════════════ */
    const handleToggleStatus = async (user) => {
        if (!canEdit) {
            toast.error('You do not have permission to change a user status.');
            return;
        }

        const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
        try {
            //! PUT /api/User/UpdateUser expects the full user object, so the
            //! current record is re-read first and only isActive is changed.
            const current = await GetUserData(`GetUser?UserId=${user.id}`, {}, cookies);
            const record = Array.isArray(current.data) ? current.data[0] : (current.data?.Table?.[0] ?? current.data);

            if (!record) {
                toast.error('Could not load the user record.');
                return;
            }

            const formData = { ...record, isActive: newStatus === 'Active' ? 'Y' : 'N' };
            const response = await UpdateUserData('UpdateUser', formData, cookies);
            const result = Array.isArray(response.data) ? response.data[0] : response.data;

            if (result?.ReturnCode === 'Y' || result?.returnCode === 'Y') {
                toast.success(`User ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
                const updateList = (list) => list.map(u => (u.id === user.id ? { ...u, status: newStatus } : u));
                setUserListData(prev => updateList(prev));
                setOriginalUserListData(prev => updateList(prev));
            } else {
                toast.error(result?.ReturnMsg || result?.returnMsg || 'Failed to update status');
            }
        } catch {
            //! Never fake success — the operator must know the write failed.
            toast.error('Could not update the user status. Please try again.');
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       handleRoleSearch — Filter Role List
       ═══════════════════════════════════════════════════════════════ */
    const handleRoleSearch = (filterValues) => {
        const newSearchTerm = filterValues.Search || '';

        if (newSearchTerm !== prevSearchTermRef2.current) {
            prevSearchTermRef2.current = newSearchTerm;
            setCurrentPage2(0);
        }

        if (Object.values(filterValues).every(value => !value)) {
            setRoleListData(originalRoleListData);
            return;
        }

        const filtered = originalRoleListData.filter((item) => {
            return (
                (filterValues.Search
                    ? Object.values(item).some(
                        (value) =>
                            typeof value === 'string' && value.toLowerCase().includes(filterValues.Search.toLowerCase())
                    )
                    : true)
            );
        });

        setRoleListData(filtered);
    };

    /* ═══════════════════════════════════════════════════════════════
       clearState — Reset All User Form Fields
       ═══════════════════════════════════════════════════════════════ */
    function clearState() {
        setIsBtnSaving(false);
        setUserId(-1);
        setUserData({
            userName: '',
            userCode: '',
            fullName: '',
            emailID: '',
            mobileNo: '',
            employeeID: '',
            department: '',
            roleId: '',
            SAPUserID: '',
            userPassword: '',
            confirmPassword: '',
            SAPUserPassword: '',
            isActive: true,
            forcePasswordChange: false,
            enable2FA: false,
        });
        setSelectedDivisions([]);
        setSelectedLocations([]);
    }

    /* ═══════════════════════════════════════════════════════════════
       syncUserPermissionsWithRole — After user create/update, copy
       the role's menu permissions as the user's permissions.
       ═══════════════════════════════════════════════════════════════ */
    const syncUserPermissionsWithRole = async (savedUserId, savedRoleId) => {
        try {
            const roleMenuRes = await GetRoleWiseMenuData(
                'GetRoleWiseMenu',
                { RoleId: savedRoleId },
                cookies
            );
            const roleMenus = Array.isArray(roleMenuRes.data) ? roleMenuRes.data : [];
            if (!roleMenus.length) return;

            const userMenus = roleMenus.map(m => ({
                userId: savedUserId,
                roleId: savedRoleId,
                menuId: m.menuId,
                canAdd: m.canAdd || 'N',
                canEdit: m.canEdit || 'N',
                canDelete: m.canDelete || 'N',
                canView: m.canView || 'N',
            }));

            await PostUserPermissionData('PostUserPermission', userMenus, cookies);
        } catch (err) {
            console.error('Permission sync failed:', err);
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       handleModal — Add / Edit / View User 
       ═══════════════════════════════════════════════════════════════ */
    const handleModal = async (action, open, user = null) => {
        clearState();

        if (action === 'Add' || action === 'Edit' || action === 'View') {
            let BtnText = (action == 'Add') ? 'Save' : 'Update';
            setActionText(action);
            setActionBtnText(BtnText);

            if ((action === 'Edit' || action === 'View') && user) {
                try {
                    const code = user.userId || user.UserId || user.id || user.Id;
                    setUserId(code);

                    let PJsonData = {};
                    const response = await GetUserData(`GetUser?UserId=${code}`, PJsonData, cookies);

                    let uData = response?.data;
                    if (Array.isArray(response?.data)) uData = response.data[0];
                    else if (response?.data?.Table) uData = response.data.Table[0];

                    if (uData) {
                        setUserData({
                            userName: uData.userName || uData.UserName || '',
                            userCode: uData.userCode || uData.UserCode || '',
                            fullName: uData.fullName || uData.FullName || '',
                            emailID: uData.emailID || uData.EmailID || uData.email || uData.Email || '',
                            mobileNo: uData.mobileNo || uData.MobileNo || uData.mobile || uData.Mobile || '',
                            employeeID: uData.employeeID || uData.EmployeeID || uData.employeeId || uData.EmployeeId || '',
                            department: uData.department || uData.Department || '',
                            roleId: uData.roleId || uData.RoleId || uData.role || uData.Role || '',
                            SAPUserID: uData.sapUserCode || uData.SAPUserID || uData.SAPUserId || '',
                            userPassword: uData.userPassword || uData.UserPassword || '',
                            confirmPassword: uData.userPassword || uData.UserPassword || '',
                            SAPUserPassword: uData.sapUserPassword || uData.SAPUserPassword || '',
                            isActive: (uData.isActive === 'Y' || uData.isActive === true || uData.IsActive === 'Y') ? true : false,
                            forcePasswordChange: (uData.lastPasswordChange === 'Y') ? true : false,
                            enable2FA: false,
                        });

                        let divisions = [];
                        if (uData.objDivision) {
                            divisions = uData.objDivision.map(d => d.divisionCode || d.DivisionCode);
                        }
                        setSelectedDivisions(divisions);

                        let locations = [];
                        if (uData.objLocation) {
                            locations = uData.objLocation.map(l => l.locationCode || l.LocationCode);
                        }
                        setSelectedLocations(locations);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    toast.error('An error occurred during the data fetch. Please try again later.');
                }
            }

            setIsAddEditModalOpen(open);
        } else if (action === 'Delete') {
            setIsDeleteModalOpen(open);
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       handleSave — Save / Update User 
       ═══════════════════════════════════════════════════════════════ */
    const handleSave = async () => {
        try {
            if (!userData.userName || !userData.userPassword || !userData.roleId || !userData.SAPUserID || !userData.SAPUserPassword) {
                toast.error('Please fill in the required fields: User Name, Password, Role, SAP User Id, and Password of SAP User.');
                return;
            }

            setIsBtnSaving(true);

            const isEdit = actionText === 'Edit';
            const payloadUserId = isEdit ? (userId === -1 ? 0 : userId) : 0;

            const formData = {
                userId: payloadUserId,
                userCode: userData.userCode || "-1",
                userName: userData.userName,
                userPassword: userData.userPassword,
                employeeID: userData.employeeID || null,
                sapUserCode: userData.SAPUserID,
                sapUserPassword: userData.SAPUserPassword,
                roleId: parseInt(userData.roleId, 10) || 0,
                emailID: userData.emailID,
                mobileNo: userData.mobileNo,
                isActive: (userData.isActive === true) ? "Y" : "N",
                isLocked: "N",
                lastLoginTime: "",
                lastPasswordChange: (userData.forcePasswordChange === true) ? "Y" : "N",
                objDivision: selectedDivisions.map(div => ({
                    userId: payloadUserId,
                    divisionCode: div,
                    divisionName: (availableDivisions.find(d => d.id === div)?.label) || div
                })),
                objLocation: selectedLocations.map(loc => ({
                    userId: payloadUserId,
                    locationCode: loc,
                    locationName: (availableLocations.find(l => l.id === loc)?.label) || loc
                }))
            };

            console.log(isEdit ? "Update=>" : "Insert=>", formData);

            // POST /api/User/InsertUser on Add, PUT /api/User/UpdateUser on Edit
            const response = isEdit
                ? await UpdateUserData('UpdateUser', formData, cookies)
                : await InsertUserData('InsertUser', formData, cookies);

            let returnCode = "F";
            let returnMsg = "Failed to save User. Please try again.";

            if (response?.status === 200 || response?.status === 201 || response?.status === 204) {
                if (Array.isArray(response.data) && response.data.length === 0) {
                    returnCode = "Y";
                    returnMsg = "User saved successfully.";
                } else {
                    let result = response.data?.[0] || response.data;
                    returnCode = result?.ReturnCode || result?.returnCode || result?.returncode || "Y";
                    returnMsg = result?.ReturnMsg || result?.returnMsg || result?.returnmsg || "User saved successfully.";
                }
            }

            if (returnCode === "Y") {
                toast.success(returnMsg);
                setIsAddEditModalOpen(false);

                const updatedUserData = await GetAllUserListData('GetAllUser', {}, cookies);
                let refreshedUsers = updatedUserData.data;
                if (refreshedUsers && refreshedUsers.Table && Array.isArray(refreshedUsers.Table)) {
                    refreshedUsers = refreshedUsers.Table;
                }
                if (!Array.isArray(refreshedUsers)) refreshedUsers = [];
                setUserListData(refreshedUsers);
                setOriginalUserListData(refreshedUsers);

                // ── Sync permissions with role ──
                const savedRoleId = parseInt(userData.roleId, 10) || 0;
                let savedUserId = payloadUserId;
                if (!isEdit && refreshedUsers.length) {
                    // For new users, resolve the userId from the insert response or refreshed list
                    const result = response.data?.[0] || response.data;
                    savedUserId = result?.UserId || result?.userId || result?.userid || 0;
                    if (!savedUserId) {
                        const match = refreshedUsers.find(u =>
                            (u.userCode || u.UserCode) === (userData.userCode || formData.userCode)
                        );
                        savedUserId = match?.userId || match?.UserId || 0;
                    }
                }
                if (savedUserId && savedRoleId) {
                    syncUserPermissionsWithRole(savedUserId, savedRoleId);
                }
            } else if (returnCode === "F" || returnCode === "N") {
                toast.error(returnMsg);
            } else {
                toast.error('Failed to save User. Please try again.');
            }
            setIsBtnSaving(false);
        } catch (error) {
            toast.error('An error occurred while saving. Please try again later.');
            console.error('User save error:', error);
            setIsBtnSaving(false);
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       clearRoleState — Reset All Role Form Fields 
       ═══════════════════════════════════════════════════════════════ */
    function clearRoleState() {
        setRoleData({
            roleCode: '',
            roleName: '',
            roleDesc: '',
            // roleDivScope: '',
            // roleLocScope: '',
            roleIsActive: true,
        });
    }

    /* ═══════════════════════════════════════════════════════════════
       handleRoleModal — Add / Edit / View Role 
       ═══════════════════════════════════════════════════════════════ */
    const handleRoleModal = async (action, open, role = null) => {
        clearRoleState();

        if (action === 'Add' || action === 'Edit' || action === 'View') {
            let BtnText = (action == 'Add') ? 'Save' : 'Update';
            setRoleActionText(action);
            setRoleActionBtnText(BtnText);
            setRoleId(action === 'Add' ? 0 : (role?.id || role?.RoleId || role?.roleId || 0));

            if ((action === 'Edit' || action === 'View') && role) {
                try {
                    // Attempt API fetch first
                    let PJsonData = { RoleId: role.id || role.RoleId || role.roleId };
                    const response = await GetRoleData('GetRole', PJsonData, cookies);
                    const roleMasterData = response.data?.[0];

                    // Use API data if available, otherwise fallback to passed-in row data
                    const src = roleMasterData || role;
                    setRoleData({
                        roleCode: src.roleCode || src.RoleCode || src.id || src.roleId || src.RoleId || '',
                        roleName: src.roleName || src.RoleName || src.name || src.Name || '',
                        roleDesc: src.description || src.Description || src.roleDesc || src.desc || src.Desc || '',
                        roleIsActive: (src.isActive === 'Y' || src.isActive === true || src.IsActive === 'Y') ? true : false,
                    });
                } catch (error) {
                    console.error('Error fetching role data:', error);
                    // Fallback: use passed-in row data on error
                    setRoleData({
                        roleCode: role.roleCode || role.RoleCode || role.id || role.roleId || role.RoleId || '',
                        roleName: role.roleName || role.RoleName || role.name || role.Name || '',
                        roleDesc: role.description || role.Description || role.roleDesc || role.desc || role.Desc || '',
                        roleIsActive: (role.isActive === 'Y' || role.isActive === true || role.IsActive === 'Y') ? true : false,
                    });
                }
            }

            setIsAddEditRoleModalOpen(open);
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       handleRoleSave — Save / Update Role 
       ═══════════════════════════════════════════════════════════════ */
    const handleRoleSave = async () => {
        try {
            // if (!roleData.roleName) {
            //     toast.error('Please fill in all required fields.');
            //     return;
            // }

            setIsBtnSaving(true);

            const isEdit = roleActionText === 'Edit';

            const formData = {
                roleId: isEdit ? (roleId === -1 ? 0 : roleId) : 0,
                roleName: roleData.roleName,
                description: roleData.roleDesc,
                isActive: (roleData.roleIsActive === true) ? "Y" : "N",
            };
            console.log(isEdit ? "Update Role=>" : "Insert Role=>", formData);

            // POST /api/Role/InsertRole on Add, PUT /api/Role/UpdateRole on Edit
            const response = isEdit
                ? await UpdateRoleData('UpdateRole', formData, cookies)
                : await InsertRoleData('InsertRole', formData, cookies);

            let returnCode = "F";
            let returnMsg = "Failed to save Role. Please try again.";

            if (response?.status === 200 || response?.status === 201 || response?.status === 204) {
                if (Array.isArray(response.data) && response.data.length === 0) {
                    returnCode = "Y";
                    returnMsg = "Role saved successfully.";
                } else {
                    let result;
                    if (Array.isArray(response?.data) && response.data.length > 0) {
                        result = response.data[0];
                    } else if (response?.data?.Table && Array.isArray(response.data.Table)) {
                        result = response.data.Table[0];
                    } else if (typeof response?.data === 'object' && response?.data !== null && !Array.isArray(response.data)) {
                        result = response.data;
                    }
                    returnCode = result?.ReturnCode || result?.returnCode || result?.returncode || "Y";
                    returnMsg = result?.ReturnMsg || result?.returnMsg || result?.returnmsg || "Role saved successfully.";
                }
            }

            if (returnCode === "Y") {
                toast.success(returnMsg);
                setIsAddEditRoleModalOpen(false);

                const updatedRoleData = await GetAllRoleListData('GetAllRole', {}, cookies);
                let refreshedRoles = updatedRoleData.data;
                if (refreshedRoles && refreshedRoles.Table && Array.isArray(refreshedRoles.Table)) {
                    refreshedRoles = refreshedRoles.Table;
                }
                if (!Array.isArray(refreshedRoles)) refreshedRoles = [];
                setRoleListData(refreshedRoles);
                setOriginalRoleListData(refreshedRoles);
            } else if (returnCode === "F" || returnCode === "N") {
                toast.error(returnMsg);
            } else {
                toast.error('Failed to save Role. Please try again.');
            }
            setIsBtnSaving(false);
        } catch (error) {
            toast.error('An error occurred while saving. Please try again later.');
            console.error('Role save error:', error);
            setIsBtnSaving(false);
        }
    };

    /* ═══════════════════════════════════════════════════════════════
       UI Helper Functions
       ═══════════════════════════════════════════════════════════════ */
    const toggleDivision = (divId) => {
        setSelectedDivisions(prev =>
            prev.includes(divId) ? prev.filter(d => d !== divId) : [...prev, divId]
        );
    };

    const toggleLocation = (locId) => {
        setSelectedLocations(prev =>
            prev.includes(locId) ? prev.filter(l => l !== locId) : [...prev, locId]
        );
    };

    const renderDivisionBadge = (div, idx) => {
        let colorClass = 'uar-badge-div-default';
        if (div === 'MILK') colorClass = 'uar-badge-div-milk';
        else if (div === 'ICE' || div === 'ICE CREAM') colorClass = 'uar-badge-div-ice';

        return (
            <span key={idx} className={`uar-badge-base ${colorClass}`}>
                {div}
            </span>
        );
    };

    const renderLocationBadge = (loc, idx) => (
        <span key={idx} className="uar-badge-location">
            {loc}
        </span>
    );

    const renderRoleBadge = (role) => {
        let colorClass = 'uar-badge-role-default';
        if (role === 'Super Admin') colorClass = 'uar-badge-role-admin';
        if (role === 'Manager') colorClass = 'uar-badge-role-manager';

        return (
            <span className={`uar-badge-role ${colorClass}`}>
                {role}
            </span>
        );
    };

    const renderStatusBadge = (status) => {
        if (status === 'Active') {
            return <span className="uar-badge-status-active">Active</span>;
        }
        return <span className="uar-badge-status-inactive">Inactive</span>;
    };

    /* ═══════════════════════════════════════════════════════════════
       JSX RETURN — UI (unchanged from original)
       ═══════════════════════════════════════════════════════════════ */
    return (
        <>
            <div className="uar-container">

                {/* ── Breadcrumb ── */}
                <div className="uar-breadcrumb" style={{ marginBottom: '8px' }}>
                    <span className="uar-breadcrumb-link">Home</span>
                    <span>›</span>
                    <span className="uar-breadcrumb-current">Users & Roles</span>
                </div>

                {/* ── Tabs ── */}
                <div className="uar-tab-bar" style={{ marginBottom: 0 }}>
                    {[
                        { id: 'Users', icon: Users },
                        { id: 'Roles', icon: Tag }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (tab.path) navigate(tab.path);
                                else setActiveTab(tab.id);
                            }}
                            className={activeTab === tab.id ? 'uar-tab--active' : 'uar-tab'}
                        >
                            <tab.icon className="uar-tab-icon" />
                            {tab.id}
                        </button>
                    ))}
                </div>

                {/* ── Users Tab: ListingPage with title bar (like PO Register) ── */}
                {activeTab === 'Users' && (
                    <ListingPage
                        title="App User Management"
                        subtitle="Create users - Assign multiple Divisions & Locations - Role allocation"
                        titleIcon="👤"
                        rowData={userListData}
                        columns={userListingColumns}
                        rowKey="userId"
                        searchPlaceholder="Search users…"
                        searchFields={['userName', 'emailID', 'status', 'lastLoginTime']}
                        primaryAction={canAdd ? { label: '+ Add New User', onClick: () => handleModal('Add', true) } : null}
                        onView={(record) => handleModal('View', true, record)}
                        onEdit={(record) => handleModal('Edit', true, record)}
                    />
                )}

                {/* ── Roles Tab ── */}
                {activeTab === 'Roles' && (
                    <ListingPage
                        title="Role Management"
                        subtitle="Define roles and permissions"
                        titleIcon="🏷️"
                        rowData={roleListData}
                        columns={roleListingColumns}
                        rowKey="roleId"
                        searchPlaceholder="Search roles…"
                        searchFields={['roleName', 'description', 'name', 'desc']}
                        primaryAction={canAdd ? { label: '+ New Role', onClick: () => handleRoleModal('Add', true) } : null}
                        onView={(record) => handleRoleModal('View', true, record)}
                        onEdit={(record) => handleRoleModal('Edit', true, record)}
                    />
                )}

                {/* ── Add / Edit App User Modal ── */}
                {isAddEditModalOpen && (
                    <div className="uar-modal-overlay">
                        {/* Backdrop */}
                        <div
                            className="uar-modal-backdrop"
                            onClick={() => handleModal('Add', false)}
                        />

                        {/* Modal */}
                        <div className="uar-modal">
                            {/* Header */}
                            <div className="uar-modal-header">
                                <div className="uar-modal-header-left">
                                    <UserPlus className="uar-modal-header-icon" />
                                    <h2 className="uar-modal-header-title">{actionText} App User</h2>
                                </div>
                                <button
                                    onClick={() => handleModal('Add', false)}
                                    className="uar-modal-close-btn"
                                >
                                    <X className="uar-modal-close-icon" />
                                </button>
                            </div>

                            {/* Body — scrollable */}
                            <div className="uar-modal-body">

                                {/* ── BASIC INFORMATION ── */}
                                <section>
                                    <div className="uar-section-header">
                                        <div className="uar-section-bar" />
                                        <h3 className="uar-section-title">
                                            Basic Information
                                        </h3>
                                    </div>

                                    <div className="uar-form-grid">
                                        {/* Username */}
                                        <div>
                                            <label className="uar-label">
                                                Username <span className="uar-required-star">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="userName"
                                                placeholder="e.g. john.doe"
                                                value={userData.userName}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-input"
                                            />
                                        </div>

                                        <div>
                                            <label className="uar-label">
                                                User Code <span className="uar-required-star">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="userCode"
                                                placeholder="User Code"
                                                value={userData.userCode}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-input"
                                            />
                                        </div>
                                        {/* Email */}
                                        <div>
                                            <label className="uar-label">
                                                Email <span className="uar-required-star">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                name="emailID"
                                                placeholder="user@mashakti.com"
                                                value={userData.emailID}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-input"
                                            />
                                        </div>
                                        {/* Mobile */}
                                        <div>
                                            <label className="uar-label">
                                                Mobile
                                            </label>
                                            <input
                                                type="text"
                                                name="mobileNo"
                                                placeholder="+91 XXXXX XXXXX"
                                                value={userData.mobileNo}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-input"
                                            />
                                        </div>
                                        {/* Employee ID */}
                                        <div>
                                            <label className="uar-label">
                                                Employee ID
                                            </label>
                                            <input
                                                type="text"
                                                name="employeeID"
                                                placeholder="EMP-XXXX"
                                                value={userData.employeeID}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-input"
                                            />
                                        </div>
                                        {/* Department */}
                                        <div>
                                            <label className="uar-label">
                                                Department
                                            </label>
                                            <select
                                                name="department"
                                                value={userData.department}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-select"
                                            >
                                                <option value="">Select Department</option>
                                                <option value="Production">Production</option>
                                                <option value="Finance">Finance</option>
                                                <option value="Operations">Operations</option>
                                                <option value="IT">IT</option>
                                                <option value="Admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                {/* ── DIVISION ACCESS ── */}
                                <section>
                                    <div className="uar-section-header--sm">
                                        <div className="uar-section-bar" />
                                        <h3 className="uar-section-title">
                                            Division Access
                                        </h3>
                                        <span className="uar-section-required">* Select one or more</span>
                                    </div>

                                    <div className="uar-chip-container">
                                        {availableDivisions.map(div => {
                                            const selected = selectedDivisions.includes(div.id);
                                            return (
                                                <button
                                                    key={div.id}
                                                    onClick={() => toggleDivision(div.id)}
                                                    disabled={actionText === 'View'}
                                                    className={`uar-chip ${selected
                                                        ? div.colorClass
                                                        : 'uar-chip--unselected'
                                                        }`}
                                                >
                                                    <Plus className={selected ? 'uar-chip-icon--selected' : 'uar-chip-icon--unselected'} />
                                                    <span className="uar-chip-emoji">{div.emoji}</span>
                                                    {div.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* ── LOCATION ACCESS ── */}
                                <section>
                                    <div className="uar-section-header--sm">
                                        <div className="uar-section-bar" />
                                        <h3 className="uar-section-title">
                                            Location Access
                                        </h3>
                                        <span className="uar-section-required">* Select one or more</span>
                                    </div>

                                    <div className="uar-chip-container">
                                        {availableLocations.map(loc => {
                                            const selected = selectedLocations.includes(loc.id);
                                            return (
                                                <button
                                                    key={loc.id}
                                                    onClick={() => toggleLocation(loc.id)}
                                                    disabled={actionText === 'View'}
                                                    className={`uar-chip ${selected
                                                        ? loc.colorClass
                                                        : 'uar-chip--unselected'
                                                        }`}
                                                >
                                                    <Plus className={selected ? 'uar-chip-icon--selected' : 'uar-chip-icon--unselected'} />
                                                    <span className="uar-chip-emoji">{loc.emoji}</span>
                                                    {loc.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* ── ROLE & SECURITY ── */}
                                <section>
                                    <div className="uar-section-header">
                                        <div className="uar-section-bar" />
                                        <h3 className="uar-section-title">
                                            Role & Security
                                        </h3>
                                    </div>

                                    <div className="uar-form-grid">
                                        {/* Role */}
                                        <div>
                                            <label className="uar-label">
                                                Role <span className="uar-required-star">*</span>
                                            </label>
                                            <select
                                                name="roleId"
                                                value={userData.roleId}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-select"
                                            >
                                                <option value="">— Select Role —</option>
                                                {roleListData.map(r => (
                                                    <option key={r.id || r.RoleId || r.roleId} value={r.id || r.RoleId || r.roleId}>{r.name || r.RoleName || r.roleName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* SAP User Id */}
                                        <div>
                                            <label className="uar-label">
                                                Select SAP User Id
                                            </label>
                                            <select
                                                name="SAPUserID"
                                                value={userData.SAPUserID}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-select"
                                            >
                                                <option value="">Select SAP User Id</option>
                                                {SAPUserListData.map(item => {
                                                    return <option key={item.UserID} value={item.UserID}>{item.UserName}</option>
                                                })}
                                            </select>
                                        </div>
                                        {/* SAP User Password */}
                                        <div>
                                            <label className="uar-label">
                                                Password of SAP User
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showSAPPassword ? 'text' : 'password'}
                                                    name="SAPUserPassword"
                                                    placeholder="Password of SAP User"
                                                    value={userData.SAPUserPassword}
                                                    onChange={handleChange}
                                                    disabled={actionText === 'View'}
                                                    className="uar-input"
                                                />
                                                <span
                                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                                    onClick={() => setShowSAPPassword(!showSAPPassword)}
                                                >
                                                    {showSAPPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Password */}
                                        <div>
                                            <label className="uar-label">
                                                Password <span className="uar-required-star">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                name="userPassword"
                                                placeholder="Min 8 characters"
                                                value={userData.userPassword}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-input"
                                            />
                                        </div>
                                        {/* Confirm Password */}
                                        <div>
                                            <label className="uar-label">
                                                Confirm Password
                                            </label>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                placeholder="Re-enter password"
                                                value={userData.confirmPassword}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-input"
                                            />
                                        </div>
                                    </div>

                                    {/* Checkboxes */}
                                    <div className="uar-checkbox-row">
                                        <label className="uar-checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="isActive"
                                                checked={userData.isActive}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-checkbox"
                                            />
                                            <span className="uar-checkbox-text">User is Active</span>
                                        </label>
                                        <label className="uar-checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="forcePasswordChange"
                                                checked={userData.forcePasswordChange}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-checkbox"
                                            />
                                            <span className="uar-checkbox-text">Force password change on first login</span>
                                        </label>
                                        <label className="uar-checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="enable2FA"
                                                checked={userData.enable2FA}
                                                onChange={handleChange}
                                                disabled={actionText === 'View'}
                                                className="uar-checkbox"
                                            />
                                            <span className="uar-checkbox-text">Enable 2FA</span>
                                        </label>
                                    </div>
                                </section>
                            </div>

                            {/* Footer */}
                            <div className="uar-modal-footer">
                                <button
                                    onClick={() => handleModal('Add', false)}
                                    className="uar-btn-cancel"
                                >
                                    Close
                                </button>
                                {actionText !== 'View' && (
                                    <>
                                        <button className="uar-btn-submit" onClick={handleSave} disabled={isBtnSaving}>
                                            <Check className="uar-btn-icon" />
                                            {isBtnSaving ? `${actionBtnText.slice(0, -1)}ing...` : actionBtnText}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div >
                    </div >
                )}

                {/* ── Add / Edit Role Modal ── */}
                {
                    isAddEditRoleModalOpen && (
                        <div className="uar-modal-overlay">
                            {/* Backdrop */}
                            <div
                                className="uar-modal-backdrop"
                                onClick={() => handleRoleModal('Add', false)}
                            />

                            {/* Modal */}
                            <div className="uar-modal--role">
                                {/* Header */}
                                <div className="uar-modal-header">
                                    <div className="uar-modal-header-left">
                                        <ShieldCheck className="uar-modal-header-icon" />
                                        <h2 className="uar-modal-header-title">{roleActionText} Role</h2>
                                    </div>
                                    <button
                                        onClick={() => handleRoleModal('Add', false)}
                                        className="uar-modal-close-btn"
                                    >
                                        <X className="uar-modal-close-icon" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="uar-modal-body">

                                    {/* ── ROLE DETAILS ── */}
                                    <section>
                                        <div className="uar-section-header">
                                            <div className="uar-section-bar" />
                                            <h3 className="uar-section-title">
                                                Role Details
                                            </h3>
                                        </div>

                                        <div className="uar-form-grid-1col">
                                            {/* <div>
                                                <label className="uar-label">
                                                    Role Code <span className="uar-required-star">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="roleCode"
                                                    placeholder="code"
                                                    value={roleData.roleCode}
                                                    onChange={handleRoleChange}
                                                    disabled={true}
                                                    className="uar-input"
                                                />
                                            </div> */}

                                            <div>
                                                <label className="uar-label">
                                                    Role Code <span className="uar-required-star">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="roleCode"
                                                    placeholder="code"
                                                    value={roleData.roleCode}
                                                    onChange={handleRoleChange}
                                                    disabled={false}
                                                    className="uar-input"
                                                />
                                            </div>
                                            {/* Description */}
                                            <div></div>
                                            {/* Role Name */}
                                            <div>
                                                <label className="uar-label">
                                                    Role Name <span className="uar-required-star">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="roleName"
                                                    placeholder="e.g. Super Admin"
                                                    value={roleData.roleName}
                                                    onChange={handleRoleChange}
                                                    disabled={roleActionText === 'View'}
                                                    className="uar-input"
                                                />
                                            </div>
                                            {/* Description */}
                                            <div>
                                                <label className="uar-label">
                                                    Description <span className="uar-required-star">*</span>
                                                </label>
                                                <textarea
                                                    name="roleDesc"
                                                    placeholder="Describe the role permissions and responsibilities"
                                                    value={roleData.roleDesc}
                                                    onChange={handleRoleChange}
                                                    disabled={roleActionText === 'View'}
                                                    rows={3}
                                                    className="uar-textarea"
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    {/* ── ACCESS SCOPE ── */}
                                    {false && (
                                        <section>
                                            <div className="uar-section-header">
                                                <div className="uar-section-bar" />
                                                <h3 className="uar-section-title">
                                                    Access Scope
                                                </h3>
                                            </div>

                                            <div className="uar-form-grid">
                                                {/* Division Scope */}
                                                <div>
                                                    <label className="uar-label">
                                                        Division Scope <span className="uar-required-star">*</span>
                                                    </label>
                                                    <select
                                                        name="roleDivScope"
                                                        value={roleData.roleDivScope}
                                                        onChange={handleRoleChange}
                                                        disabled={roleActionText === 'View'}
                                                        className="uar-select"
                                                    >
                                                        <option value="">— Select Scope —</option>
                                                        <option value="All Divisions">All Divisions</option>
                                                        <option value="Assigned Div.">Assigned Divisions Only</option>
                                                    </select>
                                                </div>
                                                {/* Location Scope */}
                                                <div>
                                                    <label className="uar-label">
                                                        Location Scope <span className="uar-required-star">*</span>
                                                    </label>
                                                    <select
                                                        name="roleLocScope"
                                                        value={roleData.roleLocScope}
                                                        onChange={handleRoleChange}
                                                        disabled={roleActionText === 'View'}
                                                        className="uar-select"
                                                    >
                                                        <option value="">— Select Scope —</option>
                                                        <option value="All Locations">All Locations</option>
                                                        <option value="Assigned Loc.">Assigned Locations Only</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </section>
                                    )}

                                    {/* ── STATUS ── */}
                                    <section>
                                        <div className="uar-section-header">
                                            <div className="uar-section-bar" />
                                            <h3 className="uar-section-title">
                                                Status
                                            </h3>
                                        </div>

                                        <div className="uar-status-card">
                                            <div>
                                                <p className="uar-status-title">Active Status</p>
                                                <p className="uar-status-desc">{roleData.roleIsActive ? 'This role is currently active' : 'This role is currently inactive'}</p>
                                            </div>
                                            <label className="uar-toggle-label" style={{ opacity: roleActionText === 'View' ? 0.5 : 1 }}>
                                                <input
                                                    type="checkbox"
                                                    name="roleIsActive"
                                                    checked={roleData.roleIsActive}
                                                    onChange={handleRoleChange}
                                                    disabled={roleActionText === 'View'}
                                                    className="uar-toggle-input"
                                                />
                                                <div className={`uar-toggle-track ${roleData.roleIsActive ? 'uar-toggle-track--on' : 'uar-toggle-track--off'}`}>
                                                    <div className={`uar-toggle-thumb ${roleData.roleIsActive ? 'uar-toggle-thumb--on' : 'uar-toggle-thumb--off'}`} />
                                                </div>
                                            </label>
                                        </div>
                                    </section>
                                </div>

                                {/* Footer */}
                                <div className="uar-modal-footer">
                                    <button
                                        onClick={() => handleRoleModal('Add', false)}
                                        className="uar-btn-cancel"
                                    >
                                        Close
                                    </button>
                                    {roleActionText !== 'View' && (
                                        <>
                                            <button className="uar-btn-submit" onClick={handleRoleSave} disabled={isBtnSaving}>
                                                <Check className="uar-btn-icon" />
                                                {isBtnSaving ? `${roleActionBtnText.slice(0, -1)}ing...` : roleActionBtnText}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

            </div >

            <Toaster position="top-right" />
        </>
    );
};

export default UsersAndRoles;

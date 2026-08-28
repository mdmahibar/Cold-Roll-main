import React, { useState, useEffect } from 'react';
import _ReactPaginate from 'react-paginate';
const ReactPaginate = _ReactPaginate.default || _ReactPaginate;
import {
    Eye,
    Pencil,
    Trash2,
    CheckCircle,
    Ban,
    Clock,
    Printer,
    Copy,
    ExternalLink,
    Barcode,
    StickyNote,
} from 'lucide-react';
import './DataTable.css';

/**
 * DataTable — Common reusable table component (ROSE-style)
 *
 * @param {string}   exportTitle          — Title used for PDF/Excel export filenames
 * @param {Array}    columns              — Column definitions array
 * @param {Array}    data                 — Data rows array
 * @param {Function} onConfirm            — Confirm action callback
 * @param {Function} onApproveReject      — Approve/Reject action callback
 * @param {Function} onPrint              — Print action callback
 * @param {Function} onBarCode            — BarCode action callback
 * @param {Function} onBatchSerial        — Batch/Serial action callback
 * @param {Function} onDelete             — Delete action callback
 * @param {Function} onView               — View action callback
 * @param {Function} onEdit               — Edit action callback
 * @param {Function} onDuplicate          — Duplicate action callback
 * @param {boolean}  isLoading            — Whether data is loading
 * @param {Function} onCheckboxClick      — Single checkbox/radio click callback
 * @param {Array}    selectedCheckboxes   — Array of selected checkbox values
 * @param {Function} onUpdateData         — Inline-edit data update callback
 * @param {Function} onAllCheckboxClick   — Select-all checkbox callback
 * @param {string}   action               — Current action mode ('View' disables inputs)
 * @param {string}   colorColumn          — Column name used for row highlighting
 * @param {number}   currentPage          — Current page index (0-based)
 * @param {Function} setCurrentPage       — Page change setter
 */
const DataTable = ({
    exportTitle,
    columns,
    data,
    onConfirm,
    onApproveReject,
    onPrint,
    onBarCode,
    onBatchSerial,
    onDelete,
    onView,
    onEdit,
    onDuplicate,
    isLoading,
    onCheckboxClick,
    selectedCheckboxes = [],
    onUpdateData,
    onAllCheckboxClick,
    action,
    colorColumn,
    currentPage = 0,
    setCurrentPage = () => {},
    footerRender,
}) => {
    const itemsPerPage = 15;
    const [filterValues, setFilterValues] = useState({});
    const shouldHandleSelectAllCheckbox = typeof onAllCheckboxClick === 'function';

    /* ═══════════ LOADING STATE ═══════════ */
    if (isLoading) {
        return (
            <div className="dt-loading">
                <div className="dt-loading-shimmer">
                    <div className="dt-loading-bar" style={{ width: '100%' }} />
                    <div className="dt-loading-bar" style={{ width: '85%' }} />
                    <div className="dt-loading-bar" style={{ width: '92%' }} />
                    <div className="dt-loading-bar" style={{ width: '78%' }} />
                    <div className="dt-loading-bar" style={{ width: '88%' }} />
                </div>
            </div>
        );
    }

    if (!Array.isArray(data)) {
        return null;
    }

    /* ═══════════ PAGINATION ═══════════ */
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const displayedData = data.slice(startIndex, endIndex);

    const handlePageClick = (selectedPage) => {
        setCurrentPage(selectedPage.selected);
    };

    /* ═══════════ ACTION CALLBACKS ═══════════ */
    const onClickApproveRejectModal = (item) => {
        if (onApproveReject) onApproveReject('ApproveReject', true, item);
    };

    const onClickPrintModal = (item) => {
        if (onPrint) onPrint('Print', true, item);
    };

    const onClickBarCodeModal = (item) => {
        if (onBarCode) onBarCode('BarCode', true, item);
    };

    const onClickBatchSerialModal = (item) => {
        if (onBatchSerial) onBatchSerial('BatchSerial', true, item);
    };

    const onClickDeleteModal = (item) => {
        if (onDelete) onDelete('Delete', true, item);
    };

    const onClickEditModal = (item) => {
        if (onEdit) onEdit('Edit', true, item);
    };

    const onClickDuplicateModal = (item) => {
        if (onDuplicate) onDuplicate('Duplicate', true, item);
    };

    const onClickViewModal = (item) => {
        if (onView) onView('View', true, item);
    };

    /* ═══════════ INLINE EDITING ═══════════ */
    const handleInputChange = (column, value, rowIndex) => {
        const globalIndex = startIndex + rowIndex;

        if (column.type === 'checkbox' || column.type === 'radio') {
            // handled separately
        } else {
            setFilterValues((prevValues) => ({
                ...prevValues,
                [column.name]: value,
            }));

            if (onUpdateData) {
                const updatedDataClone = [...data];
                updatedDataClone[globalIndex][column.name] = value;
                onUpdateData(updatedDataClone);
            }
        }
    };

    /* ═══════════ CHECKBOX / RADIO ═══════════ */
    const handleCheckboxChange = (Code) => {
        if (onCheckboxClick) onCheckboxClick(Code);
    };

    const handleAllCheckboxChange = (e, columnName) => {
        const isChecked = e.target.checked;
        let updatedCheckboxes = [];
        if (isChecked) {
            updatedCheckboxes = data.map(item => item[columnName]);
        }
        if (onAllCheckboxClick) onAllCheckboxClick(updatedCheckboxes);
    };

    const handleRadioChange = (Code) => {
        if (onCheckboxClick) onCheckboxClick(Code);
    };

    /* ═══════════ ROW HIGHLIGHT CHECK ═══════════ */
    const isRowHighlighted = (item) => {
        if (!colorColumn || !item[colorColumn] || !Array.isArray(selectedCheckboxes)) return false;
        return selectedCheckboxes.includes(item[colorColumn]);
    };

    /* ═══════════ RENDER STATUS ICON ═══════════ */
    const renderStatusIcon = (value) => {
        if (value === 'Y' || value === 'Done') {
            return (
                <span className="dt-status-active" title="Active / Done">
                    <CheckCircle size={12} />
                </span>
            );
        } else if (value === 'N') {
            return (
                <span className="dt-status-blocked" title="Blocked">
                    <Ban size={12} />
                </span>
            );
        } else if (value === 'P' || value === 'Pending') {
            return (
                <span className="dt-status-pending" title="Pending">
                    <Clock size={12} />
                </span>
            );
        }
        return null;
    };

    /* ═══════════ RENDER APPROVE/REJECT ICON ═══════════ */
    const renderApproveRejectIcon = (item, column) => {
        const val = item[column.colName];
        if (val === 'Y' || val === 'Done') {
            return (
                <button className="dt-action-btn dt-action-btn--approve" title="Approve / Active / Done" onClick={() => onClickApproveRejectModal(item)}>
                    <CheckCircle size={14} />
                </button>
            );
        } else if (val === 'N') {
            return (
                <button className="dt-action-btn dt-action-btn--reject" title="Block / Reject" onClick={() => onClickApproveRejectModal(item)}>
                    <Ban size={14} />
                </button>
            );
        } else {
            return (
                <button className="dt-action-btn dt-action-btn--pending" title="Pending" onClick={() => onClickApproveRejectModal(item)}>
                    <Clock size={14} />
                </button>
            );
        }
    };

    /* ═══════════ RENDER ═══════════ */
    return (
        <>
            <div className="dt-container">
                <table className="dt-table">
                    <thead className="dt-thead">
                        <tr>
                            {columns.filter((column) => column.isTableDisplay === 1).map((column, index) => {
                                if (column.type === 'action_icon') {
                                    // Hide action header if no actions
                                    if (column.isApproveReject === 0 && column.isDelete === 0 && column.isView === 0 && column.isEdit === 0) {
                                        return null;
                                    }
                                    return <th className="dt-th" key={index}>{column.label}</th>;
                                } else if (column.label === 'checkbox_all') {
                                    return (
                                        <th className="dt-th" key={index}>
                                            <input
                                                type={column.type}
                                                disabled={action === 'View' ? true : column.disabled}
                                                className="dt-checkbox"
                                                onChange={(e) => handleAllCheckboxChange(e, column.name)}
                                            />
                                        </th>
                                    );
                                } else {
                                    return <th className="dt-th" key={index}>{column.label}</th>;
                                }
                            })}
                        </tr>
                    </thead>
                    <tbody className="dt-tbody">
                        {displayedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.filter(c => c.isTableDisplay === 1).length} className="dt-empty">
                                    No Data Found
                                </td>
                            </tr>
                        ) : null}

                        {displayedData.map((item, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={`dt-row ${isRowHighlighted(item) ? 'dt-row--highlighted' : ''}`}
                            >
                                {columns.filter((column) => column.isTableDisplay === 1).map((column, colIndex) => {
                                    const bgStyle = isRowHighlighted(item) ? { backgroundColor: '#e0ffe0' } : {};

                                    /* ── Serial Number ── */
                                    if (column.type === 'sl_no') {
                                        const overallIndex = rowIndex + currentPage * itemsPerPage + 1;
                                        return <td key={colIndex} className="dt-td" style={bgStyle}>{overallIndex}</td>;
                                    }

                                    /* ── Status Icon ── */
                                    if (column.type === 'status_icon') {
                                        return <td key={colIndex} className="dt-td" style={bgStyle}>{renderStatusIcon(item[column.name])}</td>;
                                    }

                                    /* ── Action Icons ── */
                                    if (column.type === 'action_icon') {
                                        return (
                                            <td key={colIndex} className="dt-td" style={bgStyle}>
                                                <div className="dt-action-cell">
                                                    {column.isApproveReject === 1 && renderApproveRejectIcon(item, column)}

                                                    {column.isDelete === 1 && (
                                                        <button className="dt-action-btn dt-action-btn--delete" title="Delete" onClick={() => onClickDeleteModal(item)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}

                                                    {column.isView === 1 && (
                                                        <button className="dt-action-btn dt-action-btn--view" title="View" onClick={() => onClickViewModal(item)}>
                                                            <Eye size={14} />
                                                        </button>
                                                    )}

                                                    {column.isEdit === 1 && (
                                                        <button className="dt-action-btn dt-action-btn--edit" title="Edit" onClick={() => onClickEditModal(item)}>
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}

                                                    {column.isDuplicate === 1 && (
                                                        <button className="dt-action-btn dt-action-btn--duplicate" title="Duplicate" onClick={() => onClickDuplicateModal(item)}>
                                                            <Copy size={14} />
                                                        </button>
                                                    )}

                                                    {column.isPrint === 1 && (
                                                        <button className="dt-action-btn dt-action-btn--print" title="Print" onClick={() => onClickPrintModal(item)}>
                                                            <Printer size={14} />
                                                        </button>
                                                    )}

                                                    {column.isBarCode === 1 && (
                                                        <button className="dt-action-btn dt-action-btn--edit" title="BarCode" onClick={() => onClickBarCodeModal(item)}>
                                                            <Barcode size={14} />
                                                        </button>
                                                    )}

                                                    {column.isBatch === 1 && (
                                                        <button className="dt-action-btn dt-action-btn--edit" title="Batch / Serial" onClick={() => onClickBatchSerialModal(item)}>
                                                            <StickyNote size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    }

                                    /* ── Select (dropdown) ── */
                                    if (column.type === 'select') {
                                        const options = column.name === 'Code' ? column.optionsCode : column.optionsName;
                                        return (
                                            <td key={colIndex} className="dt-td" style={bgStyle}>
                                                <select
                                                    className="dt-select"
                                                    value={item[column.name]}
                                                    onChange={(e) => handleInputChange(column, e.target.value, rowIndex)}
                                                    disabled={action === 'View' ? true : column.disabled}
                                                >
                                                    <option value="">Select {column.placeholder}</option>
                                                    {options && Array.isArray(options)
                                                        ? options.map((option, optionIndex) => (
                                                            <option key={optionIndex} value={option.value}>{option.text}</option>
                                                        ))
                                                        : null}
                                                </select>
                                            </td>
                                        );
                                    }

                                    /* ── Text Input ── */
                                    if (column.type === 'text') {
                                        return (
                                            <td key={colIndex} className="dt-td" style={bgStyle}>
                                                <input
                                                    type="text"
                                                    value={item[column.name] || ''}
                                                    className="dt-input"
                                                    placeholder={column.placeholder}
                                                    disabled={action === 'View' ? true : column.disabled}
                                                    onChange={(e) => handleInputChange(column, e.target.value, rowIndex)}
                                                />
                                            </td>
                                        );
                                    }

                                    /* ── Number Text (formatted) ── */
                                    if (column.type === 'number_text') {
                                        return (
                                            <td key={colIndex} className="dt-td" style={bgStyle}>
                                                <input
                                                    type="text"
                                                    value={
                                                        item[column.name] !== undefined && item[column.name] !== null && !isNaN(parseFloat(item[column.name]))
                                                            ? parseFloat(item[column.name]).toFixed(3)
                                                            : '0.000'
                                                    }
                                                    className="dt-input"
                                                    placeholder={column.placeholder}
                                                    disabled={action === 'View' ? true : column.disabled}
                                                    onChange={(e) => {
                                                        let inputValue = e.target.value;
                                                        const regex = /^\d*\.?\d{0,3}$/;
                                                        if (regex.test(inputValue) || inputValue === '') {
                                                            handleInputChange(column, inputValue, rowIndex);
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const floatVal = parseFloat(e.target.value);
                                                        const formattedValue = isNaN(floatVal) || e.target.value === '' ? '0.000' : floatVal.toFixed(3);
                                                        handleInputChange(column, formattedValue, rowIndex);
                                                    }}
                                                />
                                            </td>
                                        );
                                    }

                                    /* ── Date Input ── */
                                    if (column.type === 'date') {
                                        return (
                                            <td key={colIndex} className="dt-td" style={bgStyle}>
                                                <input
                                                    type="date"
                                                    value={item[column.name] || ''}
                                                    className="dt-input"
                                                    placeholder={column.placeholder}
                                                    disabled={action === 'View' ? true : column.disabled}
                                                    onChange={(e) => handleInputChange(column, e.target.value, rowIndex)}
                                                />
                                            </td>
                                        );
                                    }

                                    /* ── Number Input ── */
                                    if (column.type === 'number') {
                                        return (
                                            <td key={colIndex} className="dt-td" style={bgStyle}>
                                                <input
                                                    type="number"
                                                    value={item[column.name] || ''}
                                                    className="dt-input"
                                                    placeholder={column.placeholder}
                                                    disabled={action === 'View' ? true : column.disabled}
                                                    onChange={(e) => handleInputChange(column, e.target.value, rowIndex)}
                                                />
                                            </td>
                                        );
                                    }

                                    /* ── Checkbox ── */
                                    if (column.type === 'checkbox') {
                                        return (
                                            <td key={colIndex} className="dt-td" style={bgStyle}>
                                                <input
                                                    type="checkbox"
                                                    value={item[column.name]}
                                                    disabled={action === 'View' ? true : column.disabled}
                                                    className="dt-checkbox"
                                                    onChange={(e) => {
                                                        handleInputChange(column, e.target.checked, rowIndex);
                                                        handleCheckboxChange(e.target.value);
                                                    }}
                                                    checked={Array.isArray(selectedCheckboxes) && selectedCheckboxes.includes(String(item[column.name]))}
                                                />
                                            </td>
                                        );
                                    }

                                    /* ── Radio ── */
                                    if (column.type === 'radio') {
                                        return (
                                            <td key={colIndex} className="dt-td" style={bgStyle}>
                                                <input
                                                    type="radio"
                                                    name={column.name}
                                                    value={item[column.name]}
                                                    disabled={action === 'View' ? true : column.disabled}
                                                    className="dt-checkbox"
                                                    onChange={(e) => {
                                                        handleInputChange(column, e.target.checked, rowIndex);
                                                        handleRadioChange(e.target.value);
                                                    }}
                                                    checked={Array.isArray(selectedCheckboxes) && selectedCheckboxes.includes(String(item[column.name]))}
                                                />
                                            </td>
                                        );
                                    }

                                    /* ── Link Icon ── */
                                    if (column.type === 'link_icon') {
                                        return (
                                            <td key={colIndex} className="dt-td" style={bgStyle}>
                                                <button className="dt-action-btn dt-action-btn--edit" title="Open">
                                                    <ExternalLink size={14} />
                                                </button>
                                            </td>
                                        );
                                    }

                                    /* ── Custom Render ── */
                                    if (typeof column.render === 'function') {
                                        return <td key={colIndex} className="dt-td" style={bgStyle}>{column.render(item, rowIndex)}</td>;
                                    }

                                    /* ── Default (plain text) ── */
                                    return <td key={colIndex} className="dt-td" style={bgStyle}>{item[column.name]}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                    {footerRender && (
                        <tfoot className="dt-tfoot">
                            {footerRender()}
                        </tfoot>
                    )}
                </table>
            </div>

            {/* ── Footer: Pagination ── */}
            <div className="dt-footer">
                <div />
                <ReactPaginate
                    nextLabel=">"
                    previousLabel="<"
                    pageCount={totalPages || 1}
                    pageRangeDisplayed={5}
                    marginPagesDisplayed={2}
                    onPageChange={handlePageClick}
                    containerClassName="dt-pagination"
                    activeClassName="active"
                    forcePage={currentPage}
                />
            </div>
        </>
    );
};

export default DataTable;

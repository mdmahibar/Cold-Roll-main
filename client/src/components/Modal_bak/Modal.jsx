import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import Select from "react-select";
import "./Modal.css";

/* ─────────────────────────────────────────────
   CONTEXT — theme & portal root
───────────────────────────────────────────── */
const ModalContext = createContext(null);

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const ACTION_LABELS = {
  add: "Add New",
  edit: "Edit",
  view: "View",
  delete: "Delete",
  create: "Create",
  update: "Update",
  manage: "Manage",
  configure: "Configure",
  import: "Import",
  export: "Export",
};

function buildTitle(mode = "add", entity = "") {
  const label = ACTION_LABELS[mode] ?? mode;
  return entity ? `${label} ${entity}` : label;
}

function getFooterSaveLabel(mode = "add") {
  if (mode === "edit" || mode === "update") return "Update";
  if (mode === "delete") return "Confirm Delete";
  if (mode === "view") return "Close";
  return "Save";
}

/* ─────────────────────────────────────────────
   RESIZE HOOK
───────────────────────────────────────────── */
function useResize(contentRef, initialSize, minSize, maxSize) {
  const [size, setSize] = useState(initialSize);
  const resizing = useRef(null);

  const onMouseDown = useCallback(
    (e, direction) => {
      e.preventDefault();
      resizing.current = {
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startW: size.width,
        startH: size.height,
      };

      const onMove = (ev) => {
        if (!resizing.current) return;
        const { direction, startX, startY, startW, startH } = resizing.current;
        let newW = startW;
        let newH = startH;
        if (direction.includes("e")) newW = startW + (ev.clientX - startX);
        if (direction.includes("w")) newW = startW - (ev.clientX - startX);
        if (direction.includes("s")) newH = startH + (ev.clientY - startY);
        if (direction.includes("n")) newH = startH - (ev.clientY - startY);

        setSize({
          width: Math.min(maxSize.width, Math.max(minSize.width, newW)),
          height: Math.min(maxSize.height, Math.max(minSize.height, newH)),
        });
      };

      const onUp = () => {
        resizing.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [size, minSize, maxSize]
  );

  return { size, setSize, onMouseDown };
}

/* ─────────────────────────────────────────────
   FIELD COMPONENTS
───────────────────────────────────────────── */
function FieldError({ message }) {
  if (!message) return null;
  return <span className="modal-field-error">{message}</span>;
}

function TextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  type = "text",
  error,
  hint,
  prefix,
  suffix,
  autoFocus,
}) {
  return (
    <div className={`modal-field${error ? " modal-field--error" : ""}`}>
      {label && (
        <label className="modal-label" htmlFor={name}>
          {label}
          {required && <span className="modal-required">*</span>}
        </label>
      )}
      <div className="modal-input-wrap">
        {prefix && <span className="modal-input-addon modal-input-prefix">{prefix}</span>}
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          className={`modal-input${prefix ? " has-prefix" : ""}${suffix ? " has-suffix" : ""}`}
        />
        {suffix && <span className="modal-input-addon modal-input-suffix">{suffix}</span>}
      </div>
      {hint && !error && <span className="modal-hint">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}

function TextareaField({ label, name, value, onChange, placeholder, required, disabled, rows = 3, error, hint }) {
  return (
    <div className={`modal-field${error ? " modal-field--error" : ""}`}>
      {label && (
        <label className="modal-label" htmlFor={name}>
          {label}
          {required && <span className="modal-required">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        className="modal-textarea"
      />
      {hint && !error && <span className="modal-hint">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options = [], required, disabled, error, hint, placeholder }) {
  return (
    <div className={`modal-field${error ? " modal-field--error" : ""}`}>
      {label && (
        <label className="modal-label" htmlFor={name}>
          {label}
          {required && <span className="modal-required">*</span>}
        </label>
      )}
      <div className="modal-select-wrap">
        <select
          id={name}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className="modal-select"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) =>
            typeof opt === "string" ? (
              <option key={opt} value={opt}>{opt}</option>
            ) : (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            )
          )}
        </select>
        <span className="modal-select-arrow">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {hint && !error && <span className="modal-hint">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}

/* Same props as SelectField, but type-to-search — drop-in swap for long lists.
   onChange receives a native-looking event, so page handlers need no change. */
function SearchableSelectField({ label, name, value, onChange, options = [], required, disabled, error, hint, placeholder }) {
  const items = options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt));

  return (
    <div className={`modal-field${error ? " modal-field--error" : ""}`}>
      {label && (
        <label className="modal-label" htmlFor={name}>
          {label}
          {required && <span className="modal-required">*</span>}
        </label>
      )}
      <Select
        inputId={name}
        name={name}
        value={items.find((item) => item.value === value) ?? null}
        onChange={(item) => onChange({ target: { name, value: item ? item.value : "" } })}
        options={items}
        placeholder={placeholder ?? "Select…"}
        isDisabled={disabled}
        isClearable
        classNamePrefix="modal-rs"
        // The modal clips overflow — portal the menu to body so it stays visible.
        menuPortalTarget={document.body}
        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
      />
      {hint && !error && <span className="modal-hint">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}

function CheckboxField({ label, name, checked, onChange, disabled, hint }) {
  return (
    <div className="modal-field modal-field--inline">
      <label className="modal-checkbox-label">
        <input
          type="checkbox"
          name={name}
          checked={!!checked}
          onChange={onChange}
          disabled={disabled}
          className="modal-checkbox"
        />
        <span className="modal-checkbox-custom" />
        <span className="modal-label-text">{label}</span>
      </label>
      {hint && <span className="modal-hint">{hint}</span>}
    </div>
  );
}

function SwitchField({ label, name, checked, onChange, disabled, hint }) {
  return (
    <div className="modal-field modal-field--inline">
      <label className="modal-switch-label">
        <input
          type="checkbox"
          name={name}
          checked={!!checked}
          onChange={onChange}
          disabled={disabled}
          className="modal-switch-input"
        />
        <span className="modal-switch-track">
          <span className="modal-switch-thumb" />
        </span>
        <span className="modal-label-text">{label}</span>
      </label>
      {hint && <span className="modal-hint">{hint}</span>}
    </div>
  );
}

function RadioGroupField({ label, name, value, onChange, options = [], disabled, required, error, hint }) {
  return (
    <div className={`modal-field${error ? " modal-field--error" : ""}`}>
      {label && (
        <label className="modal-label">
          {label}
          {required && <span className="modal-required">*</span>}
        </label>
      )}
      <div className="modal-radio-group">
        {options.map((opt) => {
          const optVal = typeof opt === "string" ? opt : opt.value;
          const optLabel = typeof opt === "string" ? opt : opt.label;
          return (
            <label key={optVal} className="modal-radio-label">
              <input
                type="radio"
                name={name}
                value={optVal}
                checked={value === optVal}
                onChange={onChange}
                disabled={disabled}
                className="modal-radio"
              />
              <span className="modal-radio-custom" />
              <span className="modal-label-text">{optLabel}</span>
            </label>
          );
        })}
      </div>
      {hint && !error && <span className="modal-hint">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}

function ColorField({ label, name, value, onChange, disabled, hint, error }) {
  return (
    <div className={`modal-field${error ? " modal-field--error" : ""}`}>
      {label && <label className="modal-label" htmlFor={name}>{label}</label>}
      <div className="modal-color-wrap">
        <input
          type="color"
          id={name}
          name={name}
          value={value ?? "#000000"}
          onChange={onChange}
          disabled={disabled}
          className="modal-color-input"
        />
        <span className="modal-color-value">{value ?? "#000000"}</span>
      </div>
      {hint && !error && <span className="modal-hint">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}

function DateField({ label, name, value, onChange, disabled, required, hint, error, min, max }) {
  return (
    <div className={`modal-field${error ? " modal-field--error" : ""}`}>
      {label && (
        <label className="modal-label" htmlFor={name}>
          {label}
          {required && <span className="modal-required">*</span>}
        </label>
      )}
      <input
        type="date"
        id={name}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        className="modal-input modal-date"
      />
      {hint && !error && <span className="modal-hint">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}

function FileField({ label, name, onChange, disabled, required, hint, error, accept, multiple }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const handleChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFileName(multiple ? `${files.length} file(s) selected` : files[0].name);
    } else {
      setFileName("");
    }
    onChange && onChange(e);
  };

  return (
    <div className={`modal-field${error ? " modal-field--error" : ""}`}>
      {label && (
        <label className="modal-label">
          {label}
          {required && <span className="modal-required">*</span>}
        </label>
      )}
      <div className="modal-file-wrap" onClick={() => fileRef.current?.click()}>
        <input
          ref={fileRef}
          type="file"
          name={name}
          onChange={handleChange}
          disabled={disabled}
          accept={accept}
          multiple={multiple}
          className="modal-file-input-hidden"
        />
        <span className="modal-file-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v10M4 5l4-4 4 4M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="modal-file-label">{fileName || "Choose file…"}</span>
      </div>
      {hint && !error && <span className="modal-hint">{hint}</span>}
      <FieldError message={error} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   DIVIDER / SECTION GROUP
───────────────────────────────────────────── */
function FieldGroup({ title, children, columns = 1 }) {
  return (
    <div className="modal-field-group">
      {title && <div className="modal-field-group-title">{title}</div>}
      <div className={`modal-field-grid modal-field-grid--${columns}`}>{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconReset() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7a5 5 0 1 0 1-3M2 2v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   BADGE — mode indicator
───────────────────────────────────────────── */
function ModeBadge({ mode }) {
  const labels = {
    add: { text: "New", cls: "add" },
    create: { text: "New", cls: "add" },
    edit: { text: "Edit", cls: "edit" },
    update: { text: "Edit", cls: "edit" },
    view: { text: "View", cls: "view" },
    delete: { text: "Delete", cls: "delete" },
  };
  const badge = labels[mode];
  if (!badge) return null;
  return <span className={`modal-mode-badge modal-mode-badge--${badge.cls}`}>{badge.text}</span>;
}

/* ─────────────────────────────────────────────
   MAIN MODAL
───────────────────────────────────────────── */
export function Modal({
  open,
  onClose,
  onSave,
  onReset,

  /* identity */
  mode = "add",          // add | edit | view | delete | create | update | configure
  entity = "",           // e.g. "Stock", "Store", "Customer"
  title,                 // override auto-title
  subtitle,

  /* layout */
  size = "full",         // sm | md | lg | xl | full — full-screen unless overridden
  resizable = true,
  position = "center",   // center | top | right (side drawer)

  /* behaviour */
  closeOnOverlay = true,
  closeOnEsc = true,
  showReset = true,
  showCancel = true,
  saveLabel,             // override save button label
  cancelLabel = "Cancel",
  resetLabel = "Reset",
  saveDisabled = false,
  saveLoading = false,
  deleteMode = false,    // turns save button red

  /* theme */
  theme,                 // "light" | "dark" | "glass" — overrides auto

  /* content */
  children,
  footer,                // custom footer (replaces default 3-btn footer)

  /* tabs */
  tabs,                  // [{ id, label, content }]
  defaultTab,
}) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs?.[0]?.id);
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  /* ── size map ── */
  const isFull = size === "full";
  const sizeMap = {
    sm: { width: 480, height: 340 },
    md: { width: 600, height: 480 },
    lg: { width: 800, height: 580 },
    xl: { width: 980, height: 680 },
    full: { width: 0, height: 0 }, // handled via CSS class
  };
  const minSize = { width: 340, height: 240 };
  const maxSize = {
    width: typeof window !== "undefined" ? window.innerWidth - 40 : 1400,
    height: typeof window !== "undefined" ? window.innerHeight - 40 : 900,
  };
  const initial = isFull ? { width: 0, height: 0 } : (sizeMap[size] ?? sizeMap.md);

  const { size: dialogSize, setSize, onMouseDown } = useResize(dialogRef, initial, minSize, maxSize);

  /* reset size when size prop changes */
  useEffect(() => {
    if (size === "full") return;
    const map = { sm:{width:480,height:340}, md:{width:600,height:480}, lg:{width:800,height:580}, xl:{width:980,height:680} };
    setSize(map[size] ?? map.md);
  }, [size]);

  /* focus trap */
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    const el = dialogRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trap = (e) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    };
    el.addEventListener("keydown", trap);
    setTimeout(() => first?.focus(), 50);
    return () => {
      el.removeEventListener("keydown", trap);
      previousFocus.current?.focus();
    };
  }, [open]);

  /* ESC key */
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEsc, onClose]);

  /* body scroll lock */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const computedTitle = title ?? buildTitle(mode, entity);
  const computedSaveLabel = saveLabel ?? getFooterSaveLabel(mode);

  const positionClass =
    position === "right" ? "modal-dialog--right" :
    position === "top"   ? "modal-dialog--top"   :
    isFull               ? "modal-dialog--full"  : "";

  const themeAttr = theme ?? "white";

  /* overlay click */
  const handleOverlay = (e) => {
    if (closeOnOverlay && e.target === overlayRef.current) onClose?.();
  };

  /* handle save — waits for onSave, then closes unless it returned false.
     Returning false lets a caller keep the modal (and the user's input) open
     when validation fails or the API call errors. */
  const handleSave = async () => {
    const result = await onSave?.();
    if (result !== false) onClose?.();
  };

  /* handle cancel — closes modal */
  const handleCancel = () => {
    onClose?.();
  };

  const defaultFooter = (
    <div className="modal-footer-actions">
      {showReset && mode !== "view" && (
        <button
          type="button"
          className="modal-btn modal-btn--ghost"
          onClick={onReset}
          aria-label="Reset form"
        >
          <IconReset />
          {resetLabel}
        </button>
      )}
      <div className="modal-footer-right">
        {showCancel && mode !== "view" && (
          <button
            type="button"
            className="modal-btn modal-btn--secondary"
            onClick={handleCancel}
          >
            {cancelLabel}
          </button>
        )}
        {mode !== "view" && (
          <button
            type="button"
            className={`modal-btn modal-btn--primary${deleteMode ? " modal-btn--danger" : ""}${saveLoading ? " modal-btn--loading" : ""}`}
            onClick={handleSave}
            disabled={saveDisabled || saveLoading}
          >
            {saveLoading ? (
              <span className="modal-btn-spinner" aria-hidden="true" />
            ) : null}
            {computedSaveLabel}
          </button>
        )}
        {mode === "view" && (
          <button
            type="button"
            className="modal-btn modal-btn--secondary"
            onClick={handleCancel}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={overlayRef}
      className={`modal-overlay${isFull ? " modal-overlay--full" : ""}`}
      role="presentation"
      onClick={handleOverlay}
      data-theme={themeAttr}
    >
      <div
        ref={dialogRef}
        className={`modal-dialog ${positionClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={
          isFull ? {} :
          position === "right" ? { width: dialogSize.width } :
          { width: dialogSize.width, height: dialogSize.height }
        }
      >
        {/* ── HEADER ── */}
        <div className="modal-header">
          <div className="modal-header-left">
            <ModeBadge mode={mode} />
            <div className="modal-title-block">
              <h2 id="modal-title" className="modal-title">{computedTitle}</h2>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <IconClose />
          </button>
        </div>

        {/* ── TABS ── */}
        {tabs && tabs.length > 1 && (
          <div className="modal-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`modal-tab${activeTab === tab.id ? " modal-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── BODY ── */}
        <div className="modal-body" role={tabs ? "tabpanel" : undefined}>
          {tabs
            ? tabs.find((t) => t.id === activeTab)?.content
            : children}
        </div>

        {/* ── FOOTER ── */}
        <div className="modal-footer">
          {footer ?? defaultFooter}
        </div>

        {/* ── RESIZE HANDLES ── */}
        {/* A full-screen dialog is sized by CSS (!important), so drag handles
            would move nothing — don't render them. */}
        {resizable && !isFull && position !== "right" && (
          <>
            <div className="modal-resize modal-resize--e"  onMouseDown={(e) => onMouseDown(e, "e")} />
            <div className="modal-resize modal-resize--s"  onMouseDown={(e) => onMouseDown(e, "s")} />
            <div className="modal-resize modal-resize--se" onMouseDown={(e) => onMouseDown(e, "se")} />
            <div className="modal-resize modal-resize--w"  onMouseDown={(e) => onMouseDown(e, "w")} />
            <div className="modal-resize modal-resize--sw" onMouseDown={(e) => onMouseDown(e, "sw")} />
            <div className="modal-resize modal-resize--n"  onMouseDown={(e) => onMouseDown(e, "n")} />
            <div className="modal-resize modal-resize--ne" onMouseDown={(e) => onMouseDown(e, "ne")} />
            <div className="modal-resize modal-resize--nw" onMouseDown={(e) => onMouseDown(e, "nw")} />
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NAMED EXPORTS — field primitives
───────────────────────────────────────────── */
export {
  TextField,
  TextareaField,
  SelectField,
  SearchableSelectField,
  CheckboxField,
  SwitchField,
  RadioGroupField,
  ColorField,
  DateField,
  FileField,
  FieldGroup,
};

export default Modal;

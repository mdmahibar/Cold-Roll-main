# Modal Component — ModalV2

Pure white, flat, professional enterprise modal.  
Drop-in replacement for ModalV1 — same API, zero other file changes.

---

## What changed in V2

| Area | V1 | V2 |
|------|----|----|
| Default theme | `glass` (blur) | `white` (solid, clean) |
| `size="full"` | broken (used window at load time) | fixed — fills viewport with 24px margin |
| Input style | glass-tinted | crisp white with grey border |
| Tabs | pill style | underline style (like Image 1) |
| Close button | circle | square border-radius-6 |
| Footer bg | semi-transparent | solid `#f9fafb` |
| Hover states | fade | border darken + precise focus ring |
| Dark theme | deep purple | neutral dark navy |

---

## Quick Start (same as V1)

```jsx
import Modal, { TextField, SelectField, FieldGroup, SwitchField } from './Modal';

<Modal
  open={open}
  onClose={() => setOpen(false)}
  onSave={save}
  onReset={reset}
  mode="add"
  entity="Stock"
>
  <FieldGroup title="Stock Details" columns={3}>
    <TextField label="SKU Code" name="sku" value={form.sku} onChange={ch} required />
    <TextField label="Description" name="desc" value={form.desc} onChange={ch} required />
    <TextField label="Group" name="group" value={form.group} onChange={ch} required />
    <TextField label="Brand" name="brand" value={form.brand} onChange={ch} required />
    <TextField label="Design No." name="design" value={form.design} onChange={ch} required />
    <TextField label="Size" name="size" value={form.size} onChange={ch} required />
    <TextField label="Colour" name="colour" value={form.colour} onChange={ch} required />
    <TextField label="MRP (₹)" name="mrp" type="number" value={form.mrp} onChange={ch} prefix="₹" required />
    <TextField label="HO-SIS Qty" name="qty" type="number" value={form.qty} onChange={ch} required />
    <TextField label="Counter Qty" name="counter" type="number" value={form.counter} onChange={ch} required />
    <TextField label="In-Transit Qty" name="transit" type="number" value={form.transit} onChange={ch} required />
    <SelectField label="Status" name="status" value={form.status} onChange={ch}
      options={['OK','Hold','Discontinued']} />
  </FieldGroup>
</Modal>
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Show/hide modal |
| `onClose` | `() => void` | — | Triggered by X, Cancel, ESC, overlay click |
| `onSave` | `() => void` | — | Triggered by Save button (modal auto-closes) |
| `onReset` | `() => void` | — | Triggered by Reset button |
| `mode` | `add\|edit\|view\|delete\|create\|update` | `"add"` | Sets title, badge, save label |
| `entity` | `string` | `""` | e.g. `"Stock"` → title becomes **Add New Stock** |
| `title` | `string` | auto | Override the auto-generated title |
| `subtitle` | `string` | — | Small grey line below title |
| `size` | `sm\|md\|lg\|xl\|full` | `"full"` | Dialog size. `full` fills viewport. |
| `resizable` | `boolean` | `true` | Drag edges/corners to resize (ignored when `size="full"`) |
| `position` | `center\|right\|top` | `"center"` | Dialog position |
| `closeOnOverlay` | `boolean` | `true` | Click outside to close |
| `closeOnEsc` | `boolean` | `true` | ESC to close |
| `showReset` | `boolean` | `true` | Show Reset button |
| `showCancel` | `boolean` | `true` | Show Cancel button |
| `saveLabel` | `string` | auto | Override Save button text |
| `cancelLabel` | `string` | `"Cancel"` | Cancel button text |
| `resetLabel` | `string` | `"Reset"` | Reset button text |
| `saveDisabled` | `boolean` | `false` | Disable save button |
| `saveLoading` | `boolean` | `false` | Spinner inside save |
| `deleteMode` | `boolean` | `false` | Red save button |
| `theme` | `white\|dark\|glass` | `"white"` | Visual theme |
| `tabs` | `Array<{id,label,content}>` | — | Tab bar |
| `defaultTab` | `string` | first | Default active tab id |
| `footer` | `ReactNode` | — | Fully custom footer |

---

## Themes

```jsx
<Modal theme="white" ...>   {/* default — pure white, crisp */}
<Modal theme="dark"  ...>   {/* dark navy */}
<Modal theme="glass" ...>   {/* frosted blur */}
```

Or set on a parent:
```html
<div data-theme="dark"> ... </div>
```

---

## size="full" — the default

Modals fill the entire viewport edge to edge. Resize handles are not rendered in
this mode, since CSS owns the dimensions.

```jsx
<Modal entity="Stock" mode="add" ...>
  ...large form with many fields...
</Modal>
```

Opt a single modal back out with an explicit size — handy for short confirm
dialogs, where a full screen for two buttons is overkill:

```jsx
<Modal size="sm" mode="delete" entity="Stock" ...>
  Delete this record?
</Modal>
```

---

## Field exports (unchanged from V1)

```jsx
import Modal, {
  TextField, TextareaField, SelectField,
  CheckboxField, SwitchField, RadioGroupField,
  ColorField, DateField, FileField, FieldGroup
} from './Modal';
```

---

## POS Add Stock (matches your screenshot)

```jsx
<Modal
  open={open}
  onClose={() => setOpen(false)}
  onSave={handleSave}
  onReset={() => setForm(defaultForm)}
  mode="add"
  entity="Stock"
  size="lg"
>
  <FieldGroup title="Stock Details" columns={3}>
    <TextField label="SKU Code"       name="sku"     value={f.sku}     onChange={ch} required />
    <TextareaField label="Description" name="desc"   value={f.desc}    onChange={ch} required rows={3} />
    <TextField label="Group"          name="group"   value={f.group}   onChange={ch} required />
    <TextField label="Brand"          name="brand"   value={f.brand}   onChange={ch} required />
    <TextField label="Design No."     name="design"  value={f.design}  onChange={ch} required />
    <TextField label="Size"           name="size"    value={f.size}    onChange={ch} required />
    <TextField label="Colour"         name="colour"  value={f.colour}  onChange={ch} required />
    <TextField label="MRP (₹)"        name="mrp"     type="number"     value={f.mrp}    onChange={ch} prefix="₹" required />
    <TextField label="HO-SIS Qty"     name="hoQty"   type="number"     value={f.hoQty}  onChange={ch} required />
    <TextField label="Counter Qty"    name="counter" type="number"     value={f.counter} onChange={ch} required />
    <TextField label="In-Transit Qty" name="transit" type="number"     value={f.transit} onChange={ch} required />
    <SelectField label="Status"       name="status"  value={f.status}  onChange={ch}
      options={[{value:'OK',label:'OK'},{value:'hold',label:'Hold'},{value:'disc',label:'Discontinued'}]} />
  </FieldGroup>
</Modal>
```

---

## Upgrade from V1

1. Delete `Modal.jsx` and `Modal.css` from your project
2. Paste the V2 `Modal.jsx` and `Modal.css`
3. Done — no other changes needed

If you used `theme="glass"` explicitly, it still works. Default changes from `glass` → `white`.

---

## Browser Support

Chrome 90+, Firefox 92+, Safari 15+, Edge 90+

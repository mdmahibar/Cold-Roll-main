# Loader

A minimal, premium loading spinner. Use it whenever an API call is pending so
the user knows something is happening.

- Brand colour matches the app theme (`#0070f2`).
- Self-contained CSS — no Tailwind needed.
- Accessible (`role="status"` + screen-reader text).
- Layers above the Modal (`z-index: 9500` vs modal `9000`) in fullscreen mode.

---

## Import

```jsx
import Loader from '../components/Loader/Loader';
```

---

## Props

| Prop         | Type                      | Default | What it does                                                        |
| ------------ | ------------------------- | ------- | ------------------------------------------------------------------- |
| `show`       | boolean                   | `true`  | For `overlay`/`fullscreen` only — renders nothing when `false`.     |
| `overlay`    | boolean                   | `false` | Covers the **nearest positioned parent** (parent needs `relative`). |
| `fullscreen` | boolean                   | `false` | Covers the **whole screen**, above modals.                          |
| `label`      | string                    | `''`    | Optional text shown under the spinner.                              |
| `size`       | `'sm'` \| `'md'` \| `'lg'` | `'md'`  | Spinner size.                                                       |

> Inline mode (no `overlay`/`fullscreen`) always renders — drop it wherever you
> want a spinner. `show` is ignored inline.

---

## The 4 ways to use it

```jsx
// 1. Inline — a small spinner in the flow of the page
<Loader />
<Loader label="Loading…" size="sm" />

// 2. Overlay — dims one section (the parent must be position: relative)
<div className="relative">
  <MyTable />
  <Loader overlay show={busy} />
</div>

// 3. Fullscreen — dims the whole app, sits above modals
<Loader fullscreen show={busy} label="Please wait…" />
```

---

## Recommended pattern: one `busy` flag for every API call

Use a **counter** (not a plain boolean) so overlapping calls stay correct —
e.g. "save" followed by "refresh list". `busy` is true while any request is in
flight.

```jsx
import { useState } from 'react';
import Loader from '../components/Loader/Loader';

function MyPage() {
  const [pending, setPending] = useState(0);
  const busy = pending > 0;

  // Every API function follows this shape:
  const loadData = async () => {
    setPending((p) => p + 1);         // ── request starts
    try {
      const data = await myService.getAll();
      // ...use data
    } catch (err) {
      // ...show error toast
    } finally {
      setPending((p) => p - 1);       // ── request done (always runs)
    }
  };

  return (
    <>
      {/* ...your page... */}

      {/* Renders on every API call, hides automatically when done */}
      <Loader fullscreen show={busy} label="Please wait…" />
    </>
  );
}
```

**Rules of thumb**

1. `setPending((p) => p + 1)` right before the `await`.
2. `setPending((p) => p - 1)` inside `finally` so it runs on success **and** error.
3. Render one `<Loader fullscreen show={busy} />` at the bottom of the page.

---

## Live example

See [`src/pages/Farmers.jsx`](../../pages/Farmers.jsx) — it uses this exact
pattern across all four calls (load list, open edit/view, save, delete). The
Modal's Save button also gets its own spinner via `saveLoading={busy}`.

import './Loader.css';

/**
 * Loader — minimal, premium loading spinner.
 *
 * Usage:
 *   <Loader />                                  inline spinner
 *   <Loader label="Loading…" />                 inline spinner + text
 *   <Loader overlay show={busy} />              covers the nearest positioned parent
 *   <Loader fullscreen show={busy} />           covers the whole screen (above modals)
 *   <Loader size="sm" | "md" | "lg" />          spinner size
 *
 * `show` only matters for overlay/fullscreen — when false, nothing renders.
 * Inline mode always renders (place it wherever you want the spinner).
 */
export default function Loader({
  show = true,
  overlay = false,
  fullscreen = false,
  label = '',
  size = 'md',
}) {
  const isOverlay = overlay || fullscreen;

  // Overlay/fullscreen loaders only render while pending.
  if (isOverlay && !show) return null;

  const spinner = (
    <div className="ldr" role="status" aria-live="polite">
      <span className={`ldr-spinner ldr-spinner--${size}`} aria-hidden="true" />
      {label && <span className="ldr-label">{label}</span>}
      <span className="ldr-sr">{label || 'Loading'}</span>
    </div>
  );

  if (!isOverlay) return spinner;

  return (
    <div className={`ldr-backdrop${fullscreen ? ' ldr-backdrop--fullscreen' : ''}`}>
      {spinner}
    </div>
  );
}

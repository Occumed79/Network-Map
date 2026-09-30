/**
 * InspiraNeonBorder — React/TSX adaptation of Inspira UI's NeonBorder.vue.
 *
 * Renders a wrapper <span> with overflow:hidden and padding:1px.
 * A spinning conic-gradient layer fills the wrapper; since overflow:hidden
 * clips it, only the 1px ring is visible — the animated light travels around
 * the perimeter only.
 * The children are rendered inside a content layer that covers the interior
 * with the dark glass background, keeping the button center dark.
 *
 * Palette defaults: #F0F8FF · #D1DCE5 · #A3C5D9
 *
 * Usage (wraps a button — the button keeps its own styles):
 *   <InspiraNeonBorder animationType="half">
 *     <button className="occumed-sidebar-workspace-tab" ...>Label</button>
 *   </InspiraNeonBorder>
 *
 * The wrapper uses display:flex so it adopts the dimensions of its child.
 * Pass borderRadius to match the child button's rounded corners.
 */

import React from 'react';

export type NeonAnimationType = 'none' | 'half' | 'full';

export interface InspiraNeonBorderProps {
  color1?: string;
  color2?: string;
  color3?: string;
  animationType?: NeonAnimationType;
  /** Seconds for one full rotation. Default 6. */
  duration?: number;
  /** Must match the child element's border-radius. Default '10px'. */
  borderRadius?: number | string;
  /** Extra class on the outer wrapper span. */
  className?: string;
  children: React.ReactNode;
}

// Static counter so each mounted instance gets a unique animation name.
let _counter = 0;

export default function InspiraNeonBorder({
  color1 = '#F0F8FF',
  color2 = '#D1DCE5',
  color3 = '#A3C5D9',
  animationType = 'half',
  duration = 6,
  borderRadius = '10px',
  className,
  children,
}: InspiraNeonBorderProps) {
  // Stable per-instance animation name (never changes after first render).
  const animName = React.useRef(`_neon${++_counter}`).current;

  // ── Conic-gradient stops ──────────────────────────────────────────────────
  // The gradient spins inside the 1px ring, giving the illusion of light
  // travelling around the perimeter.
  // 'half'  → ~half the circle is lit, rest transparent → travelling arc.
  // 'full'  → full circle lit continuously.
  // 'none'  → no animation, very faint static ring.
  let conicStops: string;
  if (animationType === 'full') {
    conicStops = [
      `${color1}   0deg`,
      `${color2} 120deg`,
      `${color3} 240deg`,
      `${color1} 360deg`,
    ].join(', ');
  } else if (animationType === 'half') {
    conicStops = [
      `transparent   0deg`,
      `transparent  30deg`,
      `${color3}    90deg`,
      `${color2}   150deg`,
      `${color1}   180deg`,
      `${color2}   210deg`,
      `${color3}   270deg`,
      `transparent 330deg`,
      `transparent 360deg`,
    ].join(', ');
  } else {
    // none — very faint static ring, no animation
    conicStops = [
      `${color3}   0deg`,
      `${color2}  90deg`,
      `${color3} 180deg`,
      `${color2} 270deg`,
      `${color3} 360deg`,
    ].join(', ');
  }

  const isAnimated = animationType !== 'none';

  // ── Inline <style> for the keyframe ──────────────────────────────────────
  // Written as an inline style tag so we don't need a CSS module or global sheet.
  const keyframeBlock = isAnimated
    ? `@keyframes ${animName}{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`
    : '';

  // ── Outer wrapper ─────────────────────────────────────────────────────────
  // padding:1px + overflow:hidden = only the 1px ring of the gradient is visible.
  const br = typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius;

  // ── Spinning gradient layer ───────────────────────────────────────────────
  // 200%×200% square centred; the excess is clipped by the parent overflow:hidden.
  // The conic-gradient origin is in the center of this oversized square.
  const trackStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: `conic-gradient(${conicStops})`,
    // Tiny blur gives soft glow at the border edge without blooming outward.
    filter: `blur(0.8px)`,
    opacity: animationType === 'none' ? 0.20 : 0,
    pointerEvents: 'none',
    animation: isAnimated
      ? `${animName} ${duration}s linear infinite paused`
      : 'none',
    transition: 'opacity 220ms ease',
    willChange: isAnimated ? 'transform' : 'auto',
  };

  // ── Inner content cover ───────────────────────────────────────────────────
  // Covers the interior with the same dark background so the conic-gradient
  // is only visible in the 1px ring.
  const innerBr = `calc(${br} - 1px)`;
  const contentStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    borderRadius: innerBr,
    // Dark navy glass — same as the sidebar background.
    // This must match whatever the child element's own background is;
    // since children set their own bg, we make this transparent so the child's
    // background shows through. The overflow:hidden on the wrapper already clips.
    background: 'transparent',
    display: 'flex',
    flex: '1 1 auto',
    minWidth: 0,
  };

  return (
    <>
      {isAnimated && <style>{keyframeBlock}</style>}
      {/*
        data-inspira-neon-anim attr is used by CSS in sidebar-workspace.css
        to enable the animation on hover/active states.
      */}
      <span
        data-inspira-neon={animationType}
        className={className ? `inspira-neon-border ${className}` : 'inspira-neon-border'}
        style={{
          position: 'relative',
          display: 'inline-flex',
          overflow: 'hidden',
          isolation: 'isolate',
          padding: '1px',
          borderRadius: br,
          // Don't add any other visual properties — let the child button define its look.
          background: 'transparent',
          boxSizing: 'border-box',
        }}
      >
        {/* Spinning gradient — clipped to 1px ring by parent overflow:hidden */}
        <span
          aria-hidden="true"
          className="inspira-neon-track"
          style={trackStyle}
        />
        {/* Content cover — renders children above the track */}
        <span className="inspira-neon-content" style={contentStyle}>
          {children}
        </span>
      </span>
    </>
  );
}

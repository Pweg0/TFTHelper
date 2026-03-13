import type { OCRStatus } from '../../../main/ocr/types';

/** Color map for each OCR status state */
const STATUS_COLOR: Record<OCRStatus, string> = {
  active: '#00ff00',
  stale: '#ff8c00',
  offline: '#ff0000',
};

/** CSS keyframe animation injected once for the pulsing active indicator */
const PULSE_STYLE = `
@keyframes ocr-pulse {
  0%   { opacity: 0.7; }
  50%  { opacity: 1.0; }
  100% { opacity: 0.7; }
}
.ocr-dot-active {
  animation: ocr-pulse 1.8s ease-in-out infinite;
}
`;

// Inject keyframes into document head once
if (typeof document !== 'undefined') {
  const existing = document.getElementById('ocr-dot-style');
  if (!existing) {
    const style = document.createElement('style');
    style.id = 'ocr-dot-style';
    style.textContent = PULSE_STYLE;
    document.head.appendChild(style);
  }
}

interface OCRStatusDotProps {
  status: OCRStatus;
}

/**
 * Small 10px status indicator dot for the OCR pipeline state.
 *
 * Colors:
 *   green  (#00ff00) — 'active': OCR is running and producing valid data
 *   orange (#ff8c00) — 'stale': last valid data kept within 10s window
 *   red    (#ff0000) — 'offline': no valid OCR data
 *
 * A subtle pulsing animation is applied only when 'active'.
 */
export default function OCRStatusDot({ status }: OCRStatusDotProps): JSX.Element {
  const color = STATUS_COLOR[status];

  return (
    <div
      className={status === 'active' ? 'ocr-dot-active' : undefined}
      title={`OCR: ${status}`}
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 5px ${color}`,
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

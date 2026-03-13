import type { ShopSlot } from '../../../main/ocr/types';

/**
 * SHOP_SLOT_CENTERS at 1920x1080 reference resolution.
 *
 * Imported from OCRCoordinates but re-declared here as a renderer-side constant
 * to avoid pulling main-process code into the renderer bundle.
 */
const SHOP_SLOT_CENTERS = [
  { x: 575, y: 992 },
  { x: 775, y: 992 },
  { x: 975, y: 992 },
  { x: 1175, y: 992 },
  { x: 1375, y: 992 },
] as const;

/** Size of each golden border highlight box (px) */
const HIGHLIGHT_SIZE = 120;

interface ShopHighlightProps {
  shop: ShopSlot[];
  shopVisible: boolean;
}

/**
 * Renders golden semi-transparent border overlays on shop slots where the
 * player already owns that champion (owned === true).
 *
 * Only renders when shopVisible is true (hidden during combat phase).
 * All elements have pointerEvents: none — no game input interference.
 *
 * Coordinates map 1:1 to screen pixels because electron-overlay-window
 * sizes the overlay window to match the TFT game window bounds.
 */
export default function ShopHighlight({ shop, shopVisible }: ShopHighlightProps): JSX.Element {
  if (!shopVisible) return <></>;

  return (
    <>
      {shop.slice(0, 5).map((slot, idx) => {
        if (!slot.owned) return null;
        const center = SHOP_SLOT_CENTERS[idx];
        if (!center) return null;

        return (
          <div
            key={idx}
            style={{
              position: 'fixed',
              left: center.x - HIGHLIGHT_SIZE / 2,
              top: center.y - HIGHLIGHT_SIZE / 2,
              width: HIGHLIGHT_SIZE,
              height: HIGHLIGHT_SIZE,
              border: '3px solid rgba(255, 215, 0, 0.7)',
              borderRadius: 6,
              boxShadow: '0 0 8px rgba(255, 215, 0, 0.4), inset 0 0 8px rgba(255, 215, 0, 0.1)',
              pointerEvents: 'none',
              zIndex: 100,
            }}
          />
        );
      })}
    </>
  );
}

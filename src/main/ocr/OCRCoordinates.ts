/**
 * All fixed 1920x1080 pixel coordinates for TFT screen regions.
 *
 * Derived from TFT-OCR-BOT (github.com/jfd02/TFT-OCR-BOT screen_coords.py).
 * Valid for 1920x1080 reference resolution. At runtime, apply scaleCoordinate()
 * to handle DPI scaling (e.g. 125% Windows scale yields a 2400x1350 capture).
 */

/** Center pixel of each of the 5 shop slots at 1920x1080 */
export const SHOP_SLOT_CENTERS = [
  { x: 575, y: 992 },
  { x: 775, y: 992 },
  { x: 975, y: 992 },
  { x: 1175, y: 992 },
  { x: 1375, y: 992 },
] as const;

/**
 * Dimensions of the name text band for each shop slot (relative to slot center).
 * The text region is: [center.x - HALF_W, center.y + Y_OFFSET - HALF_H, HALF_W*2, HALF_H*2]
 */
export const SHOP_NAME_BAND_HALF_W = 60;
export const SHOP_NAME_BAND_HALF_H = 12;
export const SHOP_NAME_BAND_Y_OFFSET = -35;

/** Full shop panel region for shop visibility detection */
export const SHOP_REGION = { x: 481, y: 1039, w: 995, h: 31 } as const;

/**
 * Center pixel of each board slot (28 slots total, 4 rows x 7 cols).
 * Row 1 = front row (y=651), Row 4 = back row (y=423).
 */
export const BOARD_SLOTS = [
  // Row 1 (front, y=651)
  { x: 581, y: 651 }, { x: 707, y: 651 }, { x: 839, y: 651 },
  { x: 966, y: 651 }, { x: 1091, y: 651 }, { x: 1222, y: 651 }, { x: 1349, y: 651 },
  // Row 2 (y=571)
  { x: 532, y: 571 }, { x: 660, y: 571 }, { x: 776, y: 571 },
  { x: 903, y: 571 }, { x: 1022, y: 571 }, { x: 1147, y: 571 }, { x: 1275, y: 571 },
  // Row 3 (y=494)
  { x: 609, y: 494 }, { x: 723, y: 494 }, { x: 841, y: 494 },
  { x: 962, y: 494 }, { x: 1082, y: 494 }, { x: 1198, y: 494 }, { x: 1318, y: 494 },
  // Row 4 (back, y=423)
  { x: 557, y: 423 }, { x: 673, y: 423 }, { x: 791, y: 423 },
  { x: 907, y: 423 }, { x: 1019, y: 423 }, { x: 1138, y: 423 }, { x: 1251, y: 423 },
] as const;

/** Center pixel of each of the 9 bench slots at 1920x1080 */
export const BENCH_SLOTS = [
  { x: 425, y: 777 }, { x: 542, y: 777 }, { x: 658, y: 777 },
  { x: 778, y: 777 }, { x: 892, y: 777 }, { x: 1010, y: 777 },
  { x: 1128, y: 777 }, { x: 1244, y: 777 }, { x: 1359, y: 777 },
] as const;

/**
 * Scales a 1920x1080 reference coordinate to the actual captured image dimensions.
 *
 * Usage:
 *   const { png, width, height } = await capturer.capture(title);
 *   const scaled = scaleCoordinate({ x: 575, y: 992 }, width / 1920, height / 1080);
 *
 * @param coord - Reference coordinate at 1920x1080
 * @param scaleX - Ratio of captured width to 1920
 * @param scaleY - Ratio of captured height to 1080
 */
export function scaleCoordinate(
  coord: { x: number; y: number },
  scaleX: number,
  scaleY: number
): { x: number; y: number } {
  return {
    x: Math.round(coord.x * scaleX),
    y: Math.round(coord.y * scaleY),
  };
}

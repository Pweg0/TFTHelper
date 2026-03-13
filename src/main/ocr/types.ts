import { z } from 'zod';

/**
 * Represents a champion on the board or bench recognized via OCR/template matching.
 */
export const OCRChampionSchema = z.object({
  apiName: z.string().nullable(),
  starLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  itemApiNames: z.array(z.string()),
});
export type OCRChampion = z.infer<typeof OCRChampionSchema>;

/**
 * Represents a single slot in the TFT shop.
 */
export const ShopSlotSchema = z.object({
  apiName: z.string().nullable(),
  cost: z.number().nullable(),
  owned: z.boolean(),
});
export type ShopSlot = z.infer<typeof ShopSlotSchema>;

/**
 * OCR pipeline status.
 * - active: OCR is running and producing valid data
 * - stale: Last valid data is being kept (within 10s window)
 * - offline: No valid OCR data, state cleared
 */
export const OCRStatusSchema = z.enum(['active', 'stale', 'offline']);
export type OCRStatus = z.infer<typeof OCRStatusSchema>;

/**
 * Full OCR result from one scan cycle.
 */
export const OCRResultSchema = z.object({
  board: z.array(OCRChampionSchema),
  bench: z.array(OCRChampionSchema),
  shop: z.array(ShopSlotSchema),
  shopVisible: z.boolean(),
  ocrStatus: OCRStatusSchema,
});
export type OCRResult = z.infer<typeof OCRResultSchema>;

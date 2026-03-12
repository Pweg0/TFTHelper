import { z } from 'zod';

// Champion schema and type
export const ChampionSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  cost: z.number(),
  traits: z.array(z.string()),
  icon: z.string(),
  ability: z.object({
    name: z.string(),
    desc: z.string(),
    icon: z.string(),
  }).optional(),
});

export type Champion = z.infer<typeof ChampionSchema>;

// Trait schema and type
export const TraitSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  desc: z.string(),
  icon: z.string(),
  effects: z.array(z.object({
    minUnits: z.number(),
    style: z.number(),
  })),
});

export type Trait = z.infer<typeof TraitSchema>;

// Item schema and type
export const ItemSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  desc: z.string(),
  icon: z.string(),
  composition: z.array(z.string()).optional(),
});

export type Item = z.infer<typeof ItemSchema>;

// Augment schema and type
export const AugmentSchema = z.object({
  apiName: z.string(),
  name: z.string(),
  desc: z.string(),
  icon: z.string(),
});

export type Augment = z.infer<typeof AugmentSchema>;

// MetaComp schema and type
export const MetaCompSchema = z.object({
  name: z.string(),
  units: z.array(z.object({
    apiName: z.string(),
    items: z.array(z.string()),
    star: z.number().optional(),
  })),
  traits: z.array(z.string()),
  avgPlace: z.number(),
  top4Rate: z.number(),
  winRate: z.number(),
  playRate: z.number(),
  tier: z.string().optional(),
  itemPriorities: z.array(z.string()).optional(),
  positioning: z.record(z.string(), z.object({
    row: z.number(),
    col: z.number(),
  })).optional(),
});

export type MetaComp = z.infer<typeof MetaCompSchema>;

// AppConfig schema and type
export const AppConfigSchema = z.object({
  patchVersion: z.string(),
  userLocale: z.string().default('en_us'),
  userRegion: z.string().default('NA1'),
  metaScrapedAt: z.number().default(0),
  metaScrapedPatch: z.string().default(''),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

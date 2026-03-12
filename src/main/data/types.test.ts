import { describe, it, expect } from 'vitest';
import {
  ChampionSchema,
  TraitSchema,
  ItemSchema,
  AugmentSchema,
  MetaCompSchema,
  AppConfigSchema,
} from './types';

describe('ChampionSchema', () => {
  const validChampion = {
    apiName: 'TFT_Ahri',
    name: 'Ahri',
    cost: 4,
    traits: ['Fated', 'Arcanist'],
    icon: 'ASSETS/Characters/Ahri/HUD/Ahri_Square.png',
  };

  it('parses a valid champion object', () => {
    const result = ChampionSchema.safeParse(validChampion);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiName).toBe('TFT_Ahri');
      expect(result.data.cost).toBe(4);
      expect(result.data.traits).toEqual(['Fated', 'Arcanist']);
    }
  });

  it('rejects champion missing required name field', () => {
    const invalidChampion = { ...validChampion };
    delete (invalidChampion as { name?: string }).name;
    const result = ChampionSchema.safeParse(invalidChampion);
    expect(result.success).toBe(false);
  });

  it('rejects champion missing apiName', () => {
    const invalid = { ...validChampion };
    delete (invalid as { apiName?: string }).apiName;
    const result = ChampionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('accepts champion with optional ability', () => {
    const withAbility = {
      ...validChampion,
      ability: { name: 'Orb of Deception', desc: 'Fires an orb', icon: 'ability.png' },
    };
    const result = ChampionSchema.safeParse(withAbility);
    expect(result.success).toBe(true);
  });
});

describe('TraitSchema', () => {
  const validTrait = {
    apiName: 'TFT_Arcanist',
    name: 'Arcanist',
    desc: 'Arcanists gain bonus Ability Power.',
    icon: 'ASSETS/Traits/Arcanist.png',
    effects: [
      { minUnits: 2, style: 1 },
      { minUnits: 4, style: 2 },
    ],
  };

  it('parses a valid trait with effects array', () => {
    const result = TraitSchema.safeParse(validTrait);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.effects).toHaveLength(2);
      expect(result.data.effects[0].minUnits).toBe(2);
    }
  });

  it('rejects trait missing effects', () => {
    const { effects: _effects, ...invalid } = validTrait;
    const result = TraitSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('ItemSchema', () => {
  const validItem = {
    apiName: 'TFT_Item_BFSword',
    name: "B.F. Sword",
    desc: '+10 Attack Damage',
    icon: 'ASSETS/Items/BFSword.png',
  };

  it('parses a valid item', () => {
    const result = ItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it('parses item with optional composition array of strings', () => {
    const withComposition = { ...validItem, composition: ['TFT_Item_BFSword', 'TFT_Item_NeedlesslyLargeRod'] };
    const result = ItemSchema.safeParse(withComposition);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.composition).toEqual(['TFT_Item_BFSword', 'TFT_Item_NeedlesslyLargeRod']);
    }
  });

  it('rejects item missing name', () => {
    const { name: _name, ...invalid } = validItem;
    const result = ItemSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('AugmentSchema', () => {
  const validAugment = {
    apiName: 'TFT_Augment_ArcanistHeart',
    name: 'Arcanist Heart',
    desc: 'Gain an Arcanist Emblem.',
    icon: 'ASSETS/Augments/ArcanistHeart.png',
  };

  it('parses a valid augment', () => {
    const result = AugmentSchema.safeParse(validAugment);
    expect(result.success).toBe(true);
  });

  it('rejects augment missing apiName', () => {
    const { apiName: _apiName, ...invalid } = validAugment;
    const result = AugmentSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('MetaCompSchema', () => {
  const validComp = {
    name: 'Arcanist Fated',
    units: [
      { apiName: 'TFT_Ahri', items: ['Rabadon', 'Shojin'], star: 2 },
      { apiName: 'TFT_Syndra', items: [], star: 1 },
    ],
    traits: ['Arcanist', 'Fated'],
    avgPlace: 3.2,
    top4Rate: 0.65,
    winRate: 0.18,
    playRate: 0.05,
  };

  it('parses a valid meta comp', () => {
    const result = MetaCompSchema.safeParse(validComp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Arcanist Fated');
      expect(result.data.units).toHaveLength(2);
      expect(result.data.avgPlace).toBe(3.2);
    }
  });

  it('accepts optional itemPriorities as string array', () => {
    const withPriorities = { ...validComp, itemPriorities: ['Rabadon', 'Shojin', 'Shadowflame'] };
    const result = MetaCompSchema.safeParse(withPriorities);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.itemPriorities).toEqual(['Rabadon', 'Shojin', 'Shadowflame']);
    }
  });

  it('accepts optional positioning as record of row/col objects', () => {
    const withPositioning = {
      ...validComp,
      positioning: {
        'TFT_Ahri': { row: 3, col: 4 },
        'TFT_Syndra': { row: 1, col: 2 },
      },
    };
    const result = MetaCompSchema.safeParse(withPositioning);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.positioning?.['TFT_Ahri']).toEqual({ row: 3, col: 4 });
    }
  });

  it('accepts optional tier field', () => {
    const withTier = { ...validComp, tier: 'S' };
    const result = MetaCompSchema.safeParse(withTier);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tier).toBe('S');
    }
  });

  it('rejects comp missing winRate', () => {
    const { winRate: _winRate, ...invalid } = validComp;
    const result = MetaCompSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects comp missing units', () => {
    const { units: _units, ...invalid } = validComp;
    const result = MetaCompSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('AppConfigSchema', () => {
  it('parses a valid app config with defaults', () => {
    const result = AppConfigSchema.safeParse({ patchVersion: '14.1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patchVersion).toBe('14.1');
      expect(result.data.userLocale).toBe('en_us');
      expect(result.data.userRegion).toBe('NA1');
      expect(result.data.metaScrapedAt).toBe(0);
      expect(result.data.metaScrapedPatch).toBe('');
    }
  });

  it('rejects config missing patchVersion', () => {
    const result = AppConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

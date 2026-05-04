// Character Factory - Creates different character types
import { CHARACTER_TYPES } from './types/index.js';

export class CharacterFactory {
  static createCharacter(type, options = {}) {
    const characterDef = CHARACTER_TYPES[type];
    if (!characterDef) {
      throw new Error(`Unknown character type: ${type}`);
    }

    // Base player structure
    const basePlayer = {
      x: options.x ?? 160,
      y: options.y ?? 270,
      targetX: options.x ?? 160,
      targetY: options.y ?? 270,
      level: options.level ?? 1,
      hp: characterDef.baseStats.maxHp,
      maxHp: characterDef.baseStats.maxHp,
      gold: options.gold ?? 1000,
      characterType: type,
      characterName: characterDef.name,
      
      // Equipment
      equipment: {
        weapon: null,
        armor: null,
        accessory: null,
      },
      
      inventory: [],
      consumableSlots: [null, null, null, null],
      
      // Character-specific skills
      skills: characterDef.skills,
      
      // Stats
      movementSpeed: characterDef.baseStats.movementSpeed,
      attackSpeed: characterDef.baseStats.attackSpeed,
      
      // Gauge system (character-specific)
      gauge: characterDef.createGauge(),
      
      // Visual
      size: characterDef.size,
      color: characterDef.color,
    };

    return basePlayer;
  }

  static getAvailableTypes() {
    return Object.keys(CHARACTER_TYPES);
  }

  static getCharacterInfo(type) {
    const def = CHARACTER_TYPES[type];
    if (!def) return null;
    
    return {
      id: type,
      name: def.name,
      description: def.description,
      difficulty: def.difficulty,
      role: def.role,
      color: def.color,
    };
  }
}

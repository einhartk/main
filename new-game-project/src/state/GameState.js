import { CharacterFactory } from '../characters/CharacterFactory.js';

export class GameState {
  constructor(characterType = 'sura') {
    // Use CharacterFactory to create player based on character type
    this.player = CharacterFactory.createCharacter(characterType, {
      x: 160,
      y: 270,
      level: 1,
      gold: 1000,
    });
    
    // Store selected character type
    this.selectedCharacter = characterType;

    this.currentZone = 'town';

    this.monsters = [];

    this.boss = null;

    this.map = {
      width: 960,
      height: 540,
      colliders: [
        { id: 'wall-1', x: 320, y: 160, w: 120, h: 220 },
        { id: 'wall-2', x: 560, y: 320, w: 160, h: 80 },
      ],
    };

    this.raidMap = {
      width: 1200,
      height: 800,
      colliders: [
        { id: 'pillar-1', x: 300, y: 200, w: 80, h: 80 },
        { id: 'pillar-2', x: 900, y: 200, w: 80, h: 80 },
        { id: 'pillar-3', x: 300, y: 600, w: 80, h: 80 },
        { id: 'pillar-4', x: 900, y: 600, w: 80, h: 80 },
        { id: 'platform-1', x: 500, y: 150, w: 200, h: 40 },
        { id: 'platform-2', x: 500, y: 650, w: 200, h: 40 },
      ],
    };

    this.town = {
      id: 'town-1',
      name: 'Starting Village',
      npcs: [
        { id: 'npc-merchant', x: 200, y: 180, name: 'Merchant', role: 'shop' },
        { id: 'npc-blacksmith', x: 760, y: 180, name: 'Blacksmith', role: 'upgrade' },
        { id: 'npc-guide', x: 480, y: 420, name: 'Guide', role: 'info' },
      ],
    };

    this.raid = {
      id: 'raid-1',
      name: 'Dragon\'s Lair',
      boss: {
        id: 'boss-dragon',
        name: 'Ancient Dragon',
        x: 480,
        y: 270,
        targetX: 480,
        targetY: 270,
        maxHp: 5000,
        hp: 5000,
        speed: 80,
        skills: {
          fireBreath: { cooldown: 4.0, remaining: 0, radius: 120, damage: 40, warningTime: 1.5 },
          tailSwipe: { cooldown: 6.0, remaining: 0, radius: 80, damage: 30, warningTime: 1.0 },
          roar: { cooldown: 8.0, remaining: 0, radius: 150, damage: 20, warningTime: 2.0 },
          charge: { cooldown: 10.0, remaining: 0, radius: 200, damage: 60, warningTime: 2.0 },
          groundSlam: { cooldown: 7.0, remaining: 0, radius: 100, damage: 45, warningTime: 1.2 },
          summonAdds: { cooldown: 15.0, remaining: 0, radius: 0, damage: 0, warningTime: 2.5 },
        },
        phase: 1,
        maxPhases: 4,
        patternTimer: 0,
        currentPattern: 0,
        activeSkill: null,
        skillPhase: 'idle',
        skillTimer: 0,
      },
    };

    this.interactions = {
      targetNpcId: null,
      dialog: null,
      upgradePanelOpen: false,
    };

    this.actions = {
      castSkills: [],
      basicAttack: null,
      interact: false,
      toggleUpgradePanel: false,
      upgradeSlot: null,
      useConsumable: null,
      enterRaid: false,
      returnToTown: false,
    };

    this.effects = [];

    this.time = 0;
    this.frame = 0;
  }
}

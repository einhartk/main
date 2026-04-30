export class GameState {
  constructor() {
    this.player = {
      x: 160,
      y: 270,
      targetX: 160,
      targetY: 270,
      level: 1,
      hp: 100,
      gold: 1000,
      equipment: {
        weapon: null,
        armor: null,
        accessory: null,
      },
      inventory: [],
      consumableSlots: [null, null, null, null],
      skills: {
        q: { key: 'q', name: 'Nova', cooldown: 1.25, remaining: 0, radius: 90, damage: 20, effectType: 'aoe' },
        w: { key: 'w', name: 'Fireball', cooldown: 2.0, remaining: 0, radius: 70, damage: 35, effectType: 'projectile' },
        e: { key: 'e', name: 'Ice Spike', cooldown: 1.5, remaining: 0, radius: 60, damage: 28, effectType: 'chain' },
        r: { key: 'r', name: 'Lightning', cooldown: 3.0, remaining: 0, radius: 100, damage: 50, effectType: 'aoe' },
        t: { key: 't', name: 'Meteor', cooldown: 5.0, remaining: 0, radius: 120, damage: 80, effectType: 'falling' },
        a: { key: 'a', name: 'Slash', cooldown: 0.8, remaining: 0, radius: 50, damage: 15, effectType: 'melee' },
        s: { key: 's', name: 'Whirlwind', cooldown: 2.5, remaining: 0, radius: 80, damage: 30, effectType: 'aoe' },
        d: { key: 'd', name: 'Smash', cooldown: 1.8, remaining: 0, radius: 65, damage: 25, effectType: 'melee' },
        f: { key: 'f', name: 'Bash', cooldown: 1.2, remaining: 0, radius: 55, damage: 18, effectType: 'melee' },
        v: { key: 'v', name: 'Ultimate', cooldown: 10.0, remaining: 0, radius: 150, damage: 100, effectType: 'aoe' },
      },
    };

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
          fireBreath: { cooldown: 4.0, remaining: 0, radius: 200, damage: 40 },
          tailSwipe: { cooldown: 6.0, remaining: 0, radius: 150, damage: 30 },
          roar: { cooldown: 8.0, remaining: 0, radius: 300, damage: 20 },
        },
        patternTimer: 0,
        currentPattern: 0,
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

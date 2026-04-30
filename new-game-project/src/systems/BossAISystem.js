export class BossAISystem {
  constructor() {}

  update(state, dt) {
    if (state.currentZone !== 'raid' || !state.boss) return;

    const boss = state.boss;
    const p = state.player;

    boss.patternTimer += dt;

    const patterns = ['fireBreath', 'tailSwipe', 'roar'];
    const patternInterval = 3.0;

    if (boss.patternTimer >= patternInterval) {
      boss.patternTimer = 0;
      boss.currentPattern = (boss.currentPattern + 1) % patterns.length;
      this.tryCastBossSkill(state, patterns[boss.currentPattern]);
    }

    const dx = p.x - boss.x;
    const dy = p.y - boss.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 100) {
      boss.targetX = p.x;
      boss.targetY = p.y;
    } else {
      boss.targetX = boss.x;
      boss.targetY = boss.y;
    }

    for (const skillKey of Object.keys(boss.skills)) {
      const skill = boss.skills[skillKey];
      skill.remaining = Math.max(0, skill.remaining - dt);
    }
  }

  tryCastBossSkill(state, skillKey) {
    const boss = state.boss;
    const skill = boss.skills[skillKey];
    if (!skill || skill.remaining > 0) return;

    const cx = boss.x;
    const cy = boss.y;
    const r = skill.radius;
    const r2 = r * r;

    const dx = state.player.x - cx;
    const dy = state.player.y - cy;
    const d2 = dx * dx + dy * dy;

    if (d2 <= r2) {
      state.player.hp = Math.max(0, state.player.hp - skill.damage);
    }

    state.effects.push({
      type: 'bossSkill',
      skillKey,
      x: cx,
      y: cy,
      radius: r,
      ttl: 0.4,
    });

    skill.remaining = skill.cooldown;
  }
}

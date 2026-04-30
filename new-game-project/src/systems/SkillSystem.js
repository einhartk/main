export class SkillSystem {
  constructor() {
    this.basicAttackDamage = 10;
    this.basicAttackRange = 40;
  }

  update(state, dt) {
    tickCooldowns(state, dt);
    tickEffects(state, dt);

    if (state.actions.castSkills && state.actions.castSkills.length > 0) {
      const keys = state.actions.castSkills;
      state.actions.castSkills = [];

      for (const key of keys) {
        tryCastSkill(state, key);
      }
    }

    if (state.actions.basicAttack) {
      const target = state.actions.basicAttack;
      state.actions.basicAttack = null;
      tryBasicAttack(state, target, this.basicAttackDamage, this.basicAttackRange);
    }
  }
}

function tickCooldowns(state, dt) {
  for (const key of Object.keys(state.player.skills)) {
    const skill = state.player.skills[key];
    skill.remaining = Math.max(0, skill.remaining - dt);
  }
}

function tryCastSkill(state, key) {
  const skill = state.player.skills[key];
  if (!skill || skill.remaining > 0) return;

  const cx = state.player.x;
  const cy = state.player.y;
  const r = skill.radius;
  const r2 = r * r;

  const targets = [];
  for (const m of state.monsters) {
    const dx = m.x - cx;
    const dy = m.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2) {
      m.hp = Math.max(0, m.hp - skill.damage);
      targets.push({ x: m.x, y: m.y });
    }
  }

  state.monsters = state.monsters.filter((m) => m.hp > 0);

  if (state.boss) {
    const dx = state.boss.x - cx;
    const dy = state.boss.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2) {
      state.boss.hp = Math.max(0, state.boss.hp - skill.damage);
      targets.push({ x: state.boss.x, y: state.boss.y });
    }
  }

  const effectType = skill.effectType || 'aoe';
  const effectData = {
    type: effectType,
    skillKey: key,
    x: cx,
    y: cy,
    radius: r,
    ttl: 0.3,
    targets: targets,
  };

  if (effectType === 'projectile') {
    effectData.ttl = 0.5;
    effectData.startX = cx;
    effectData.startY = cy;
    effectData.targetX = cx + (Math.random() - 0.5) * 100;
    effectData.targetY = cy + (Math.random() - 0.5) * 100;
  } else if (effectType === 'chain') {
    effectData.ttl = 0.4;
    effectData.chainTargets = targets.slice(0, 3);
  } else if (effectType === 'falling') {
    effectData.ttl = 0.6;
    effectData.startY = cy - 200;
    effectData.targetY = cy;
  } else if (effectType === 'melee') {
    effectData.ttl = 0.2;
    effectData.angle = Math.random() * Math.PI * 2;
  }

  state.effects.push(effectData);
  skill.remaining = skill.cooldown;
}

function tickEffects(state, dt) {
  for (const e of state.effects) {
    e.ttl -= dt;
  }
  state.effects = state.effects.filter((e) => e.ttl > 0);
}

function tryBasicAttack(state, target, damage, range) {
  const r = range;
  const r2 = r * r;

  for (const m of state.monsters) {
    const dx = m.x - target.x;
    const dy = m.y - target.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2) {
      m.hp = Math.max(0, m.hp - damage);
    }
  }

  state.monsters = state.monsters.filter((m) => m.hp > 0);

  if (state.boss) {
    const dx = state.boss.x - target.x;
    const dy = state.boss.y - target.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2) {
      state.boss.hp = Math.max(0, state.boss.hp - damage);
    }
  }

  state.effects.push({
    type: 'basicAttack',
    x: target.x,
    y: target.y,
    radius: r,
    ttl: 0.15,
  });
}

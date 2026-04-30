import { getPlayerAABB, PLAYER_SIZE } from '../entities/player.js';
import { getMonsterAABB, MONSTER_SIZE } from '../entities/monster.js';
import { resolveAABBAgainstStaticRect } from '../physics/aabb.js';

export class MovementSystem {
  constructor({ playerSpeed = 240, monsterSpeed = 140 } = {}) {
    this.playerSpeed = playerSpeed;
    this.monsterSpeed = monsterSpeed;
    this.arrivalEpsilon = 2;
  }

  update(state, dt) {
    moveAgentToTargetWithCollisions(
      state,
      state.player,
      this.playerSpeed,
      getPlayerAABB,
      PLAYER_SIZE,
      dt,
      this.arrivalEpsilon,
    );

    for (const m of state.monsters) {
      moveAgentToTargetWithCollisions(
        state,
        m,
        this.monsterSpeed,
        getMonsterAABB,
        MONSTER_SIZE,
        dt,
        this.arrivalEpsilon,
      );
    }

    if (state.boss) {
      moveAgentToTargetWithCollisions(
        state,
        state.boss,
        state.boss.speed,
        getMonsterAABB,
        MONSTER_SIZE,
        dt,
        this.arrivalEpsilon,
      );
    }
  }
}

function moveAgentToTargetWithCollisions(state, agent, speed, getAABB, size, dt, eps) {
  const dx = agent.targetX - agent.x;
  const dy = agent.targetY - agent.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= eps) return;

  const nx = dx / (dist || 1);
  const ny = dy / (dist || 1);

  const maxStep = speed * dt;
  const step = Math.min(maxStep, dist);

  let moveX = nx * step;
  let moveY = ny * step;

  let box = getAABB(agent);
  for (const solid of state.map.colliders) {
    const res = resolveAABBAgainstStaticRect(box, solid, moveX, moveY);
    moveX = res.x - box.x;
    moveY = res.y - box.y;
    box = { x: res.x, y: res.y, w: box.w, h: box.h };
  }

  agent.x = clamp(agent.x + moveX, size.w / 2, state.map.width - size.w / 2);
  agent.y = clamp(agent.y + moveY, size.h / 2, state.map.height - size.h / 2);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

import { getPlayerAABB, PLAYER_SIZE } from '../entities/player.js';
import { getMonsterAABB, MONSTER_SIZE } from '../entities/monster.js';
import { resolveAABBAgainstStaticRect, aabbIntersects } from '../physics/aabb.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class MovementSystem {
  constructor({ playerSpeed = 240, monsterSpeed = 140 } = {}) {
    this.playerSpeed = playerSpeed;
    this.monsterSpeed = monsterSpeed;
    this.arrivalEpsilon = 2;
  }

  update(state, dt) {
    // Move all players (local + remote)
    for (const player of Object.values(state.players)) {
      if (player.isDead) continue;
      const speedMultiplier = (player.movementSpeed || 100) / 100;
      const adjustedPlayerSpeed = this.playerSpeed * speedMultiplier;

      moveAgentToTargetWithCollisions(
        state,
        player,
        adjustedPlayerSpeed,
        getPlayerAABB,
        PLAYER_SIZE,
        dt,
        this.arrivalEpsilon,
      );
    }

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

// Export collision resolver for dash and other instant movement skills
export function resolveCollisionsForMovement(state, agent, moveX, moveY, getAABB) {
  const box = getAABB(agent);
  let finalX = agent.x + moveX;
  let finalY = agent.y + moveY;

  // Check each collider and resolve
  for (const solid of state.map.colliders) {
    // Check if the intended position collides
    const nextBox = { x: finalX - box.w / 2, y: finalY - box.h / 2, w: box.w, h: box.h };

    if (!aabbIntersects(nextBox, solid)) {
      continue; // No collision, skip
    }

    // Collision detected - resolve by trying X and Y separately
    // Try X movement only
    const tryXBox = { x: finalX - box.w / 2, y: box.y, w: box.w, h: box.h };
    const xCollides = aabbIntersects(tryXBox, solid);

    // Try Y movement only
    const tryYBox = { x: box.x, y: finalY - box.h / 2, w: box.w, h: box.h };
    const yCollides = aabbIntersects(tryYBox, solid);

    if (!xCollides && yCollides) {
      // Only Y collides, keep X movement
      finalY = agent.y;
    } else if (xCollides && !yCollides) {
      // Only X collides, keep Y movement
      finalX = agent.x;
    } else if (xCollides && yCollides) {
      // Both collide - slide along the wall based on movement direction
      const xDist = Math.abs(moveX);
      const yDist = Math.abs(moveY);

      if (xDist > yDist) {
        // Moving more horizontally, prefer sliding along Y
        finalX = agent.x;
      } else {
        // Moving more vertically, prefer sliding along X
        finalY = agent.y;
      }
    }
    // If neither collides, we can move to finalX, finalY
  }

  // Then clamp to map boundaries to prevent going outside
  const halfW = box.w / 2;
  const halfH = box.h / 2;
  finalX = clamp(finalX, halfW, state.map.width - halfW);
  finalY = clamp(finalY, halfH, state.map.height - halfH);

  return { x: finalX, y: finalY };
}

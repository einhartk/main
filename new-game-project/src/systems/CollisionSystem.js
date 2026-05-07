import { getPlayerAABB } from '../entities/player.js';
import { getMonsterAABB } from '../entities/monster.js';
import { aabbIntersects } from '../physics/aabb.js';

export class CollisionSystem {
  update(state, dt) {
    const pBox = getPlayerAABB(state.player);

    // Remove collision damage - attacks are handled by attack systems
    // for (const m of state.monsters) {
    //   const mBox = getMonsterAABB(m);
    //   if (aabbIntersects(pBox, mBox)) {
    //     state.player.hp = Math.max(0, state.player.hp - 20 * dt);
    //   }
    // }
  }
}

export const MONSTER_SIZE = { w: 26, h: 26 };

export function getMonsterAABB(monster) {
  return {
    x: monster.x - MONSTER_SIZE.w / 2,
    y: monster.y - MONSTER_SIZE.h / 2,
    w: MONSTER_SIZE.w,
    h: MONSTER_SIZE.h,
  };
}

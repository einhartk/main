export const PLAYER_SIZE = { w: 28, h: 28 };

export function getPlayerAABB(player) {
  return {
    x: player.x - PLAYER_SIZE.w / 2,
    y: player.y - PLAYER_SIZE.h / 2,
    w: PLAYER_SIZE.w,
    h: PLAYER_SIZE.h,
  };
}

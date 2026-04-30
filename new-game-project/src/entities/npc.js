export const NPC_SIZE = { w: 24, h: 24 };

export function getNPCAABB(npc) {
  return {
    x: npc.x - NPC_SIZE.w / 2,
    y: npc.y - NPC_SIZE.h / 2,
    w: NPC_SIZE.w,
    h: NPC_SIZE.h,
  };
}

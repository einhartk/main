export function aabbIntersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function resolveAABBAgainstStaticRect(moving, solid, dx, dy) {
  const next = {
    x: moving.x + dx,
    y: moving.y + dy,
    w: moving.w,
    h: moving.h,
  };

  if (!aabbIntersects(next, solid)) {
    return { x: next.x, y: next.y, hitX: false, hitY: false };
  }

  let outX = moving.x;
  let outY = moving.y;
  let hitX = false;
  let hitY = false;

  const tryX = { x: moving.x + dx, y: moving.y, w: moving.w, h: moving.h };
  if (!aabbIntersects(tryX, solid)) {
    outX = tryX.x;
  } else {
    hitX = dx !== 0;
  }

  const tryY = { x: outX, y: moving.y + dy, w: moving.w, h: moving.h };
  if (!aabbIntersects(tryY, solid)) {
    outY = tryY.y;
  } else {
    hitY = dy !== 0;
  }

  return { x: outX, y: outY, hitX, hitY };
}

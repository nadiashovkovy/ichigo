// ============================================================================
// sea.js — the height of the sea at any point and time. Each level sets how big its waves get.
// ============================================================================
import { SEA } from './config.js';
import { S } from './state.js';

// Waves grow from `base` to `base + grow` over the first `growOver` units of the level.
export function seaY(x, t) {
  const sea = (S.level && S.level.sea) || { base: 5, grow: 12, growOver: 5200 };
  const k = Math.min(1, Math.max(0, x / sea.growOver)), A = sea.base + k * sea.grow;
  return SEA + Math.sin(x * 0.012 - t * 1.7) * A + Math.sin(x * 0.031 + t * 1.15) * A * 0.4;
}

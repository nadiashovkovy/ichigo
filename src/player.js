// ============================================================================
// player.js — Ichigo: walking, running, jumping, and keeping their balance on rocking wreckage.
// On wreckage, Ichigo's position is measured ALONG the deck (u, from the centre), so they ride
// the rocking. On a tilted deck Ichigo slides toward the low end — stand still too long and you slip off.
// ============================================================================
import { W, MOVE, DECK, P } from './config.js';
import { S, parts } from './state.js';
import { input, inLeft, inRight, inRun, inJump, inUse } from './input.js';
import { seaY } from './sea.js';
import { floating, deckY } from './wreckage.js';
import { playFall } from './audio.js';

export const PL = { x: 0, y: 0, vx: 0, vy: 0, ground: null, u: 0, vu: 0, face: 1, coyote: 0, anim: 0, hw: 10, jumpHeld: false, grace: 0,
                    idle: 0, sitting: false, boredAt: 0, sulk: 0 };   // idle: seconds without input; sitting: on the boat, or bored; sulk: just made to get up, lip out

export function spawn() {   // stand Ichigo in the middle of the last checkpoint
  const p = S.checkpoint;
  for (const q of S.plats) { q.sink = 0; q.av = 0; q.dv = 0; q.dy = 0; }
  PL.ground = p; PL.u = 0; PL.vu = 0; PL.vx = PL.vy = 0; PL.face = 1; PL.grace = DECK.graceAfterRespawn; PL.idle = 0; PL.sitting = false; PL.sulk = 0;
  PL.x = p.cx; PL.y = p.cy;
}

export function die() {     // fell in the sea: a new tomorrow
  if (S.scene !== 'play') return;
  S.deaths++; S.tomorrows++; S.scene = 'dawn'; S.sceneT = 0;
  playFall();   // splash, bloop, bubbles
  for (let i = 0; i < 18; i++) parts.push({ x: PL.x, y: seaY(PL.x, S.T), vx: (Math.random() - .5) * 220, vy: -150 - Math.random() * 200, life: .8, c: P.foam });
}

export function puff(x, y, n) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * 140, vy: -Math.random() * 120, life: .5, c: P.foam }); }
// Spray thrown up from both ends of a piece of wreckage when Ichigo lands on it: more for a harder
// landing, and more from the end that's pushed down.
function splash(p, hit) {
  for (const end of [-1, 1]) {
    const ex = p.cx + end * p.w / 2 * Math.cos(p.ang), ey = seaY(ex, S.T), push = .6 + .4 * Math.sign(PL.u) * end;
    for (let i = 0; i < Math.round((2 + hit * 7) * push); i++)
      parts.push({ x: ex + end * Math.random() * 10, y: ey, vx: end * (30 + Math.random() * 90), vy: -120 - Math.random() * 260 * hit,
                   life: .45 + Math.random() * .3, c: Math.random() < .6 ? P.white : P.pale, s: Math.random() < .35 ? 2 : 1 });
  }
}
export function updateParts(dt) {
  for (const q of parts) { q.vy += 500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
}

export function updatePlayer(dt) {
  const dir = (inRight() ? 1 : 0) - (inLeft() ? 1 : 0);
  // Sitting down. On the boat, a moment without input and Ichigo sits with the bucket in their lap
  // (after 5 s they look back: see drawPlay). Anywhere else, left alone a while, they sit down bored,
  // and a tilted deck still slides them off (only the boat is safe). Any key gets them up
  // at once, so sitting never costs the player control; only the lip stays out a moment (PL.sulk).
  const wants = dir || inJump() || inRun() || inUse() || input.jumpBuffer > 0;
  PL.sulk = Math.max(0, PL.sulk - dt);
  if (PL.sitting && wants) { PL.sitting = false; PL.idle = 0; PL.sulk = MOVE.sulk; }
  else {
    PL.idle = wants ? 0 : PL.idle + dt;
    if (!PL.boredAt) PL.boredAt = MOVE.bored[0] + Math.random() * MOVE.bored[1];
    const sit = !!PL.ground && ((PL.ground.type === 'boat' && PL.idle > 1) || PL.idle > PL.boredAt);
    if (sit && !PL.sitting) PL.boredAt = 0;   // (next time, a new length of patience)
    PL.sitting = sit || (PL.sitting && !!PL.ground);
  }
  const target = dir * (inRun() ? MOVE.run : MOVE.walk);
  if (dir) PL.face = dir;
  input.jumpBuffer -= dt; PL.coyote -= dt; PL.grace -= dt;

  if (PL.ground) {
    const p = PL.ground, half = p.w / 2;
    // walk along the deck
    if (dir) PL.vu += Math.sign(target - PL.vu) * Math.min(Math.abs(target - PL.vu), MOVE.groundAccel * dt);
    else PL.vu -= Math.sign(PL.vu) * Math.min(Math.abs(PL.vu), (floating(p) ? DECK.wetFriction : MOVE.groundAccel) * dt);
    // slide downhill on a tilted deck
    const pull = DECK.slide * Math.sin(p.ang);
    if (floating(p) && !(PL.sitting && p.type === 'boat') && PL.grace <= 0 && (Math.abs(pull) > DECK.grip || Math.abs(PL.vu) > 5)) PL.vu += pull * dt;
    PL.u += PL.vu * dt;
    const pvx = (p.cx - p.pcx) / dt, pvy = (p.cy - p.pcy) / dt;   // how the deck itself is moving
    if (input.jumpBuffer > 0) {                  // jump: keep the deck's momentum
      PL.vx = PL.vu * Math.cos(p.ang) + pvx; PL.vy = -MOVE.jump + Math.min(0, pvy) * .5;
      PL.ground = null; input.jumpBuffer = 0; PL.jumpHeld = true; puff(PL.x, PL.y, 6);
    } else if (Math.abs(PL.u) > half + 3) {      // slipped or walked off the end
      PL.vx = PL.vu * Math.cos(p.ang) + pvx; PL.vy = PL.vu * Math.sin(p.ang);
      PL.ground = null; PL.coyote = 0.1;
    } else {
      PL.x = p.cx + PL.u * Math.cos(p.ang); PL.y = floating(p) ? p.cy + PL.u * Math.sin(p.ang) : deckY(p, PL.x); PL.vx = PL.vu;
      if (p.sinkRate && p.sink + p.dy - p.fb > 12) die();     // a straw mat sank right under Ichigo
    }
  } else if (input.jumpBuffer > 0 && PL.coyote > 0) { // "coyote time": a jump just after leaving an edge still works
    PL.vy = -MOVE.jump; PL.coyote = 0; input.jumpBuffer = 0; PL.jumpHeld = true;
  }

  if (!PL.ground) {
    PL.vx += Math.sign(target - PL.vx) * Math.min(Math.abs(target - PL.vx), MOVE.airControl * dt);
    if (PL.jumpHeld && !inJump()) { PL.jumpHeld = false; if (PL.vy < -MOVE.shortHop) PL.vy = -MOVE.shortHop; }
    const prevX = PL.x, prevY = PL.y;
    PL.vy = Math.min(PL.vy + MOVE.gravity * dt, 1100);
    PL.x = Math.max(10, Math.min(S.level.length - 10, PL.x + PL.vx * dt)); PL.y += PL.vy * dt;
    if (PL.vy >= 0) for (const p of S.plats) {   // land on a (tilted) deck from above
      const half = p.w / 2 * Math.cos(p.ang);
      if (Math.abs(PL.x - p.cx) > half + PL.hw * .8) continue;   // (a little grace at the edges)
      const before = floating(p) ? p.pcy + (prevX - p.pcx) * Math.tan(p.pang) : deckY(p, prevX), now = deckY(p, PL.x);
      if (prevY <= before + 8 && PL.y >= now) {
        PL.ground = p;
        PL.u = Math.max(-p.w / 2 + 2, Math.min(p.w / 2 - 2, (PL.x - p.cx) / Math.cos(p.ang)));   // clipping the edge still counts
        PL.vu = PL.vx / Math.cos(p.ang) - (floating(p) ? (p.cx - p.pcx) / dt : 0);           // keep your speed from the air
        PL.y = now; PL.coyote = 0;
        if (floating(p)) {   // landing rocks the wreckage and pushes it down
          const hit = Math.min(1, PL.vy / 700);
          p.av += (PL.u / (p.w / 2)) * p.tip * 7 * hit; p.dv += PL.vy * .06 * (1 - p.tip);
          splash(p, hit);
        }
        PL.vy = 0; puff(PL.x, PL.y, 4);
        if (p.cp && S.checkpoint !== p) S.checkpoint = p;
        break;
      }
    }
    const ashore = S.plats.some(p => !floating(p) && Math.abs(PL.x - p.cx) < p.w / 2);      // (over the island's sand, a wave is only wet feet)
    if (!PL.ground && !ashore && PL.y > seaY(PL.x, S.T) + 14) die();
  }
  // running looks like water: foam kicked up behind
  if (PL.ground && Math.abs(PL.vu) > 220 && Math.random() < 0.6)
    parts.push({ x: PL.x - PL.face * 8, y: PL.y - 2, vx: -PL.face * 40 + Math.random() * 20, vy: -60 - Math.random() * 60, life: .5, c: P.foam });
  PL.anim += dt * (Math.abs(PL.ground ? PL.vu : PL.vx) / 14);
  if (PL.ground && PL.ground.goal && PL.x > PL.ground.x0 + S.level.goalOffset) { S.scene = 'end'; S.sceneT = 0; }
}

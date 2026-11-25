"""
Automated play-test for Ichigo.

What it does:
  1. Serves the game from this folder on a local web server.
  2. Opens it in a headless Chrome. Opens the settings (P) on the title, its controls page, and the list of all levels from it; then
     begins: Level 0's cards, then Level 1.
  3. Plays the beach before the wave: walks right to the water (tripping over the shovel on the way,
     and sitting through the plaster), fills the bucket, walks back, digs, pours, and again, until
     the third pour. Then waits through the wave and the white. (Story cards are clicked through.)
  4. Lets a simple "bot" play Level 1: it walks, runs before wide gaps, jumps near the end of each
     piece of wreckage, keeps its balance while waiting for drifting planks, and rests on the boat
     long enough for Ichigo to sit down and look back.
  5. Takes screenshots of each moment worth looking at (tests/screens/),
     and reports page errors, where the bot fell in, whether it reached the lantern, and the save.
  6. Plays Level 2 on a sped-up clock: once doing nothing (the lantern must go out in the first set),
     once walking the sandbar (the sea must take Ichigo), and once properly: sea-fireflies to the
     lantern till morning, the things from home, the sandbar, the shell. Looks at Ichigo's things (Tab). Reports how it went.
  7. Plays Level 3 the same way: once doing nothing (too hungry: a new tomorrow), once running under the
     trees (bumped on the head, nothing eaten), once eating every plum (asleep: a new tomorrow), and once
     properly, to the raft.
  8. Plays Level 4 the same way: once never hiding (caught: a new tomorrow), ringing a bell (the keeper must
     come to it), and once properly, hiding from the light, to the open sea.

Run it from the project folder:
    pip install playwright && playwright install chromium
    python tests/play_level.py               # the whole thing
    python tests/play_level.py --skip-beach  # straight to the sea (sets the save's seenWave): faster
    python tests/play_level.py --only 2      # just one level
"""
import asyncio, functools, http.server, json, os, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'screens')
PORT = 8765
CHROME = os.environ.get('CHROME_PATH')   # optional: use a specific Chrome
SKIP_BEACH = '--skip-beach' in sys.argv
ONLY = int(sys.argv[sys.argv.index('--only') + 1]) if '--only' in sys.argv else None

# The beach: water, fill, back to the castle, dig (hold use), pour (press use), until the third pour.
BEACH_BOT = r'''
(() => { const { S, beach: b, keys, input } = window.ichigo;
  const go = x => { keys.ArrowRight = b.x < x - 4; keys.ArrowLeft = b.x > x + 4; return Math.abs(b.x - x) <= 4; };
  window._beachBot = setInterval(() => {
    if (S.scene !== 'beach' || b.phase !== 'play') { keys.ArrowRight = keys.ArrowLeft = keys.KeyE = false; return; }
    if (!b.full) { keys.KeyE = false; if (go(552)) input.usePressed = true; return; }
    if (go(436)) { if (!b.hole) keys.KeyE = true; else { keys.KeyE = false; input.usePressed = true; } }
  }, 16);
})();
'''

BOT = r'''
(() => { const { S, PL, input, keys } = window.ichigo; let hold = 0, from = null, boatRest = false;
  window._fallen = []; window._boatDone = false; let lastDeaths = 0;
  window._bot = setInterval(() => {
    if (S.deaths > lastDeaths) { window._fallen.push(Math.round(PL.x)); lastDeaths = S.deaths; }
    if (S.scene !== 'play') { keys.Space = false; from = null; return; }
    const g = PL.ground;
    if (hold > 0 && !--hold) keys.Space = false;
    if (!g) { keys.ArrowRight = true; keys.ArrowLeft = false; return; }
    if (g.type === 'boat' && !window._boatDone) {   // rest on the boat: Ichigo sits, then looks back
      if (!boatRest && Math.abs(PL.u) > 10) { keys.ArrowRight = PL.u < 0; keys.ArrowLeft = PL.u > 0; keys.ShiftLeft = false; return; }
      boatRest = true; keys.ArrowRight = keys.ArrowLeft = keys.ShiftLeft = keys.Space = false;
      if (PL.idle > 6.5) window._boatDone = true;
      return;
    }
    const i = S.plats.indexOf(g), nx = S.plats[i + 1];
    const gap = nx ? (nx.cx - nx.w / 2) - (g.cx + g.w / 2) : 0;
    keys.ShiftLeft = gap > 125;
    if (gap >= 190 && g.type !== 'rock') {     // too far: wait for it, staying balanced near the middle
      keys.ArrowRight = PL.u < -12; keys.ArrowLeft = PL.u > 12; keys.ShiftLeft = false; return;
    }
    keys.ArrowLeft = false; keys.ArrowRight = true;
    if (g !== from && g.type !== 'rock' && PL.u > g.w / 2 - (keys.ShiftLeft ? 24 : 16)) { input.jumpBuffer = 0.14; keys.Space = true; hold = 14; from = g; }
  }, 16);
})();
'''

# Level 2 runs on a made-up clock: every frame counts as a sixtieth of a second, however fast it's drawn.
FAST_CLOCK = r'''
(() => { let now = 0, queue = []; performance.now = () => now;
  window.requestAnimationFrame = f => { queue.push(f); return 1; };
  const ch = new MessageChannel();
  ch.port1.onmessage = () => {
    if (window._hold) { setTimeout(() => ch.port2.postMessage(0), 20); return; }   // (held still for a screenshot)
    now += 1000 / 60; const due = queue; queue = [];
    if (window._tick) window._tick();
    for (const f of due) f(now);
    if (window._want && window._want()) { window._want = null; window._hold = window._got = true; }   // (what the test is waiting for, looked for every frame: a moment can be shorter than the test's own checks)
    ch.port2.postMessage(0);
  };
  ch.port2.postMessage(0);
})();
'''

# Level 2's bot. window._mode: 'idle' (does nothing), 'walk' (walks the sandbar), 'near' (only takes the
# sea-fireflies closest to the lantern) or 'play': follows each wave out, and runs back before the next.
TIDE_BOT = r'''
(() => { const { S, tide: N, keys, input, cards } = window.ichigo, C = 427, LEAD = 3.6;
  let wait = 0, fleeing = false; window._knocked = 0; let was = 0;
  window._tick = () => {
    if (cards.active()) { if (++wait > 20) { cards.next(); wait = 0; } return; }
    for (const k of ['ArrowLeft', 'ArrowRight', 'KeyS', 'ShiftLeft']) keys[k] = false;
    if (S.scene !== 'tide' || window._mode === 'idle') return;
    if (N.stumble > .9 && was <= .9 && N.phase === 'waves') window._knocked++; was = N.stumble;
    const go = (x, run = true) => { keys[N.x < x ? 'ArrowRight' : 'ArrowLeft'] = true; keys.ShiftLeft = run; };
    if (N.phase === 'calm' || N.phase === 'waves') {
      const side = x => (x > C ? 'right' : 'left');
      // a wave's on its way to that side, or has not yet drained
      const danger = s => N.swells.some(v => v.side === s && v.t > LEAD - .35 && v.t < LEAD + 3.2);
      const out = Math.abs(N.x - C);
      if (danger(side(N.x)) && out > 100) return go(C);
      if (N.held) return go(C);
      if (N.load >= 5 || (N.load && (N.fuel < .25 || (fleeing && out < 100)))) { if (out > 40) return go(C); input.usePressed = true; fleeing = false; return; }
      if (N.thing && N.thing.state === 'lying' && window._mode === 'play' && !danger(N.thing.side)) { if (Math.abs(N.x - N.thing.x) < 15) input.usePressed = true; else go(N.thing.x); return; }
      let best = null, score = 1e9;
      for (const g of N.glows) {
        if (danger(side(g.x)) || (window._mode === 'near' && Math.abs(g.x - C) > 190)) continue;
        const sc = Math.abs(g.x - N.x) - g.n * 30; if (sc < score) { score = sc; best = g; }
      }
      if (best) { if (Math.abs(best.x - N.x) < 16) keys.KeyS = true; else go(best.x); }
      else if (N.load) { fleeing = true; if (out > 40) go(C); else input.usePressed = true; }
      else if (out > 60) go(C);
    }
    if (N.phase === 'bar') {
      keys.ArrowRight = true; keys.ShiftLeft = window._mode !== 'walk';
      for (const c of N.barCrabs) if (!c.hide && c.x - N.x > 0 && c.x - N.x < 34) input.jumpBuffer = .1;
      if (N.shell === 'lying' && Math.abs(N.x - S.level.bar.shell) < 18) { keys.ArrowRight = false; input.usePressed = true; }
    }
  };
})();
'''

async def moment(page, name, js, notes, shot, timeout):
    """Wait for something on the sped-up clock (held still as soon as it's true, until the next of these), and take a picture of it."""
    await page.evaluate(f"window._got = false; window._want = () => {{ const N = ichigo.tide, M = ichigo.plum, H = ichigo.light, S = ichigo.S; try {{ return {js}; }} catch (e) {{ return false; }} }}; window._hold = false")   # (it has been held still since the last one, so nothing is missed in between)
    ok = await wait_for(page, 'window._got', timeout, 30)
    if ok and shot: await page.wait_for_timeout(100); await page.screenshot(path=f'{SHOTS}/{shot}.png')
    if not ok: notes.append(f'{name}: never saw {js}')
    await page.evaluate('window._want = null')
    return ok

async def play_tide(browser):
    """Level 2. Returns (problems, page errors, what to report)."""
    errors, notes, report = [], [], {}
    async def open_level(mode):
        ctx = await browser.new_context(viewport={'width': 960, 'height': 540})
        await ctx.add_init_script(FAST_CLOCK)
        await ctx.add_init_script("localStorage.setItem('ichigo.save', JSON.stringify({ marks: ['chin'], tomorrows: 0, done: [1], seenWave: true }))")
        page = await ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(f'http://127.0.0.1:{PORT}/index.html'); await page.wait_for_timeout(2000)
        await page.evaluate(f"window._mode = '{mode}'"); await page.add_script_tag(content=TIDE_BOT)
        await page.evaluate('ichigo.begin(2)')
        return ctx, page
    async def until(page, js, shot=None, timeout=240): return await moment(page, 'Level 2', js, notes, shot, timeout)
    NOW = "N.phase === 'calm' && (N.phase = 'ebb', N.t = 0, N.tideFrom = N.tide, true)"   # (skip the night)

    ctx, page = await open_level('idle')   # nothing done: the lantern goes out, and it's a new tomorrow in the same set
    await until(page, "N.phase === 'out' && N.t > .3", 'tide_lantern_out')
    if await page.evaluate('ichigo.tide.set') != 0: notes.append('Level 2: left alone, the lantern lasted past the first set')
    if not await until(page, "S.scene === 'tide' && S.deaths === 1 && N.phase === 'calm' && N.set === 0"): notes.append('Level 2: no retry after the lantern went out')
    await ctx.close()

    ctx, page = await open_level('idle')   # caught far out by a wave: it takes Ichigo, and the night starts again from the first set
    await until(page, "N.set === 0 && N.phase === 'waves'")
    await page.evaluate("Object.assign(ichigo.tide, { fuel: 1, set: 1, wave: 0, x: 427 + 340 })")
    if not await until(page, "N.phase === 'under'", 'tide_under', 40): notes.append('Level 2: a wave far out did not take Ichigo')
    await until(page, "S.scene === 'tide' && S.deaths === 1 && N.set === 0")
    await page.evaluate("(N => { N.crabs = [{ side: 'right', x: N.x, dir: 1, t: 0, hide: 0 }]; })(ichigo.tide)")   # a crab pinches: Ichigo cries, and learns what they are
    if not await until(page, "N.cry > .5 && S.learned.includes('crab')", 'tide_pinch', 10): notes.append('Level 2: a crab did not pinch Ichigo')
    await ctx.close()

    ctx, page = await open_level('walk')   # walking the sandbar is too slow
    await until(page, NOW); await until(page, "S.deaths > 0 || S.scene === 'end'")
    if await page.evaluate('ichigo.S.scene') == 'end': notes.append('Level 2: walking was fast enough for the sandbar')
    await until(page, "N.phase === 'bar' && S.scene === 'tide' && S.deaths === 1"); await ctx.close()

    ctx, page = await open_level('play')
    for js, shot in [("N.phase === 'wake' && N.t > 2.2", 'tide_sleep'), ("N.set === 0 && N.phase === 'waves'", 'tide_umi'), ("N.phase === 'waves' && N.set === 0 && N.load >= 3", 'tide_scoop'), ("N.flare > .6", 'tide_feed'),
                     ("N.held", 'tide_thing'), ("N.phase === 'waves' && N.set === 1 && N.swells.some(v => v.t > 4.9 && v.t < 5.2)", 'tide_wave'), ("N.set === 2 && N.glows.length > 2", 'tide_glow'), ("N.set === 3 && N.phase === 'waves'", 'tide_last'),
                     ("N.phase === 'ebb' && N.t > 3.6", 'tide_dawn'), ("N.phase === 'bar' && N.x > 1180", 'tide_sandbar'), ("N.shellT > .2", 'tide_shell')]:
        if not await until(page, js, shot): break
    await page.keyboard.press('Tab'); await until(page, "S.thingsOpen", 'tide_things'); await page.keyboard.press('Tab'); await until(page, "!S.thingsOpen")
    await until(page, "S.scene === 'end' && S.sceneT > 3", 'tide_end')
    report = await page.evaluate("({ scene: ichigo.S.scene, deaths: ichigo.S.deaths, seconds: Math.round(ichigo.S.levelT), knocked: window._knocked, saved: ichigo.tide.saved })")
    report['save'] = json.loads(await page.evaluate("localStorage.getItem('ichigo.save')"))
    if report['scene'] != 'end': notes.append('Level 2: the bot did not finish')
    s = report['save']
    if 'crab' not in s['learned'] or 2 not in s['done'] or 'shell' not in s['things']: notes.append('Level 2: the save is missing the crab, the shell or the level')
    await ctx.close()
    return notes, errors, report

# Level 3's bot. window._mode: 'idle' (does nothing), 'run' (runs up and down under the trees), 'glut' (that, and eats every plum) or 'play'.
PLUM_BOT = r"""
(() => { const { S, plum: M, keys, input, cards } = window.ichigo; let wait = 0, back = 1; window._log = [];
  window._tick = () => {
    if (cards.active()) { if (++wait > 20) { cards.next(); wait = 0; } return; }
    for (const k of ['ArrowLeft', 'ArrowRight', 'KeyS', 'ShiftLeft']) keys[k] = false;
    if (S.scene !== 'plum' || M.phase !== 'play' || window._mode === 'idle') return;
    const L = S.level, under = x => L.trees.some(([t, s]) => Math.abs(x - t) < 74 * s);
    const go = x => {
      const d = Math.sign(x - M.x);
      if (M.plums.some(p => !p.lying && (p.x - M.x) * d > 4 && (p.x - M.x) * d < 46)) return;                        // wait for one to land
      if (M.rustle.some(r => Math.abs(r.x - M.x) < 70 && (r.x - M.x) * d > 14)) return;
      keys[d > 0 ? 'ArrowRight' : 'ArrowLeft'] = true; keys.ShiftLeft = !under(M.x) && !under(M.x + d * 60);
    };
    const at = (x, r = 10) => Math.abs(M.x - x) < r, use = () => { input.usePressed = true; };
    if (window._mode === 'glut') { M.belly = .4; const p = M.plums.find(p => p.lying && !p.eaten); if (p) { if (at(p.x, 8)) use(); else keys[p.x > M.x ? 'ArrowRight' : 'ArrowLeft'] = true; return; } }
    if (window._mode === 'run' || window._mode === 'glut') { if (M.x > 1300) back = -1; if (M.x < 500) back = 1; keys[back > 0 ? 'ArrowRight' : 'ArrowLeft'] = keys.ShiftLeft = true; return; }
    if (M.digT > 0) { keys.KeyS = true; return; }
    if (M.belly < .45) {   // something to eat, that isn't a plum
      const o = M.oranges.find(o => o.lying); if (o) { if (at(o.x, 12)) use(); else go(o.x); return; }
      const c = M.clams.filter(c => c.t > 0 && c.t < 3.5).sort((a, b) => Math.abs(a.x - M.x) - Math.abs(b.x - M.x))[0];
      if (c && Math.abs(c.x - M.x) < 420) { if (at(c.x, 9)) { use(); keys.KeyS = true; } else go(c.x); return; }
      if (M.ripe > 0) { if (at(L.orange, 12)) { if (M.shakeT <= 0) use(); } else go(L.orange); return; }
      go(230); return;
    }
    if (M.rope !== 'kept') {
      if (M.rope === 'lying') { if (at(L.fisherman)) use(); else go(L.fisherman); return; }
      if (M.fisher !== 'asleep') return;   // (he's deciding)
      if (M.bucket === 'crab') { if (at(L.fisherman, 14)) use(); else go(L.fisherman); return; }
      const k = M.crabs.filter(c => !c.hide).sort((a, b) => Math.abs(a.x - M.x) - Math.abs(b.x - M.x))[0];
      if (k) { if (at(k.x, 14)) use(); else go(k.x); } return;
    }
    if (!M.blanket) {   // bounce on the empty hammock, up onto the treetops, and along to the blanket
      if (M.on === 'ground') { if (at(L.hammocks[0], 8)) { input.jumpBuffer = .1; keys.Space = true; } else go(L.hammocks[0]); window._hi = false; return; }
      keys.Space = true;
      if (M.on === 'leaves') { const w = M.wasps[1]; if (M.x < 880 || M.x > 985) keys.ArrowRight = true; else if (w.py < 250 || M.t % 7 > 5) { keys.ArrowRight = keys.ShiftLeft = true; if (M.x > 900) input.jumpBuffer = .1; } return; }
      if (M.vy > 0 && M.y > 300 && Math.abs(M.x - L.hammocks[0]) < 46) input.jumpBuffer = .1;   // time the next bounce
      if (M.row >= 2 || M.x > 835) window._hi = true;
      if (window._hi) keys.ArrowRight = keys.ShiftLeft = true; else if (Math.abs(M.x - L.hammocks[0]) > 6) keys[M.x < L.hammocks[0] ? 'ArrowRight' : 'ArrowLeft'] = true;
      return;
    }
    if (!M.paddle) {
      if (M.sailor === 'up') return;
      if (M.bucket === 'water') { if (at(L.sailor, 12)) use(); else go(L.sailor); return; }
      if (M.x > L.water[1] - 12) use(); else go(L.water[1]); return;
    }
    if (at(L.raft, 30)) use(); else go(L.raft);
  };
})();
"""

async def play_plum(browser):
    """Level 3. Returns (problems, page errors, what to report)."""
    errors, notes, report = [], [], {}
    async def open_level(mode):
        ctx = await browser.new_context(viewport={'width': 960, 'height': 540})
        await ctx.add_init_script(FAST_CLOCK)
        await ctx.add_init_script("localStorage.setItem('ichigo.save', JSON.stringify({ marks: ['chin'], things: ['shell'], tomorrows: 0, done: [1, 2], seenWave: true }))")
        page = await ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(f'http://127.0.0.1:{PORT}/index.html'); await page.wait_for_timeout(2000)
        await page.evaluate(f"window._mode = '{mode}'"); await page.add_script_tag(content=PLUM_BOT)
        await page.evaluate('ichigo.begin(3)')
        return ctx, page
    async def until(page, js, shot=None, timeout=90): return await moment(page, 'Level 3', js, notes, shot, timeout)

    ctx, page = await open_level('idle')   # nothing done: Ichigo gets too hungry, and it's a new tomorrow
    await until(page, 'M.empty > 3', 'plum_hungry'); await until(page, "S.scene === 'plum' && S.deaths === 1 && M.belly > .5"); await ctx.close()

    ctx, page = await open_level('run')    # running under the trees: plums come down on Ichigo's head, but none is eaten
    await until(page, 'M.bonk > .2', 'plum_bonk')
    if await page.evaluate('ichigo.plum.sleep') != 0: notes.append('Level 3: a plum was eaten by touching it')
    await page.evaluate('Object.assign(ichigo.plum, { sleep: 1, wear: 1 })')   # one plum's sleepiness wears off
    await until(page, 'M.sleep === 0'); await ctx.close()

    ctx, page = await open_level('glut')   # eating every plum: three put Ichigo to sleep
    await until(page, 'M.sleep === 2', 'plum_sleepy'); await until(page, "M.phase === 'asleep' && M.t > 1.2", 'plum_asleep')
    await page.evaluate("ichigo.plum.rope = 'kept'")
    await until(page, "S.scene === 'plum' && S.deaths === 1 && M.sleep === 0 && M.rope === 'kept'"); await ctx.close()

    ctx, page = await open_level('play')
    for js, shot in [("M.woman === 'offers' && M.womanT > 1", 'plum_woman'), ("M.woman === 'refused'", None), ("M.bucket === 'crab'", 'plum_crab'), ("M.fisher === 'up' && M.fisherT > 1", 'plum_shown'), ("M.fisher === 'sat' && M.fisherT > 2.5", 'plum_fisherman'), ("M.rope === 'kept'", None), ("M.row >= 2 && M.vy < 0", 'plum_bounce'), ("M.on === 'leaves'", 'plum_treetop'), ("M.blanket", None),
                     ("M.eating > .3", 'plum_eat'), ("M.splashes === 1", 'plum_splash'), ("M.sailor === 'up' && M.sailorT > 1", 'plum_sailor'), ("M.paddle", None), ("M.phase === 'leave' && M.t > 3.4", 'plum_leave')]:
        if not await until(page, js, shot): break
    await until(page, "S.scene === 'end' && S.sceneT > 3", 'plum_end')
    if not await page.evaluate('ichigo.plum.raftX - ichigo.S.camX > 853 + 45'): notes.append('Level 3: Ichigo was still on screen at the end')
    report = await page.evaluate("({ scene: ichigo.S.scene, deaths: ichigo.S.deaths, seconds: Math.round(ichigo.S.levelT), plums: ichigo.plum.sleep, splashes: ichigo.plum.splashes })")
    report['save'] = json.loads(await page.evaluate("localStorage.getItem('ichigo.save')"))
    if report['scene'] != 'end': notes.append('Level 3: the bot did not finish')
    s = report['save']
    if 'home' not in s['learned'] or 3 not in s['done'] or 'rope' not in s['things'] or 'paddle' not in s['things'] or 'blanket' not in s['things']: notes.append('Level 3: the save is missing home, the rope, the paddle, the blanket or the level')
    await ctx.close()
    return notes, errors, report

# Level 4's bot. window._mode: 'idle' (does nothing), 'bold' (walks on and never hides), 'noisy' (runs), or 'play'.
LIGHT_BOT = r"""
(() => { const { S, light: H, keys, input, cards } = window.ichigo; let wait = 0, held = 0;
  window._tick = () => {
    if (cards.active()) { if (++wait > 20) { cards.next(); wait = 0; } return; }
    for (const k of ['ArrowLeft', 'ArrowRight', 'KeyS', 'ShiftLeft', 'Space']) keys[k] = false;
    if (S.scene !== 'light' || window._mode === 'idle') return;
    const L = S.level, V = window._lh, play = window._mode === 'play', b = V.beam(), e = H.eye, hide = () => { keys.KeyS = true; }, right = () => { keys.ArrowRight = true; };
    const step = e.mode === 'sweep' ? e.dir * 130 : e.mode === 'turn' ? Math.sign(e.goal - e.x) * 420 : 0;
    const soon = (x, y) => { if (!b.on && !H.ear) return false; for (let i = 0; i <= 8; i++) if (V.litAt(x, y, { ...b, on: true, x: b.x + step * i / 8 })) return b.on; return false; };
    if (window._mode === 'tall') { H.seen = 0; right(); return; }
    if (H.phase === 'paddle') { const dark = L.stacks.some(([p, q]) => H.raftX > p && H.raftX < q); if (play && !dark && b.on && Math.abs(b.x - H.raftX) < 250) hide(); else right(); return; }
    if (H.phase !== 'play') return;
    if (V.tunnelAt(H.x) && H.x < L.room + 14) { hide(); right(); return; }
    if (held > 0) { held--; keys.Space = true; }
    const r = V.roomAt(H.x), danger = play && H.on && (H.danger || soon(H.x, H.y - 14) || soon(H.x + 40, H.y - 14));
    if (r && H.x > r.wall[0] - 30) { hide(); right(); return; }
    const sh = L.shelters.find(([p, q]) => H.x > p + 6 && H.x < q - 6);
    if (danger) { if (!sh) hide(); return; }
    const stone = [...L.stones, [5900, 5975]], gap = H.x > 4700 && H.x < 5980 && H.on;
    if (gap) {   // the stones: only jump just after the eye shuts, or as the light has gone by
      const end = V.surfaceY(H.x + 10) > 440 || V.surfaceY(H.x + 18) > 440;
      if (end) { if (play && !(e.mode === 'dark' && e.t < 1.1)) return; input.jumpBuffer = .1; held = 40; right(); return; }
    }
    if (H.on && V.groundY(H.x + 14) < H.y - 12) { input.jumpBuffer = .1; held = 14; }
    if (window._mode === 'noisy') { right(); keys.ShiftLeft = true; return; }
    const c = H.cords.find(q => Math.abs(q.x - H.x) < 14 && q.swing <= 0 && !q.done); if (play && c && !H.danger) { c.done = true; input.usePressed = true; return; }
    const q = L.shutters.find(z => Math.abs(z.x - H.x) < 12 && !H.shut.has(z.window)); if (play && q && H.on && H.y > 400) { input.usePressed = true; return; }
    if (H.x > L.rope - 14) { if (e.mode === 'dark' && e.t < .6 && !H.ear && H.digging <= 0) input.usePressed = true; return; }
    const pool = L.pools.find(([p, z]) => H.x > p - 16 && H.x < z); if (pool && H.on) { input.jumpBuffer = .1; held = 16; } right();
  };
})();
"""

async def play_light(browser):
    """Level 4. Returns (problems, page errors, what to report)."""
    errors, notes, report = [], [], {}
    async def open_level(mode):
        ctx = await browser.new_context(viewport={'width': 960, 'height': 540})
        await ctx.add_init_script(FAST_CLOCK)
        await ctx.add_init_script("localStorage.setItem('ichigo.save', JSON.stringify({ marks: ['chin'], things: ['rope', 'paddle', 'blanket'], tomorrows: 0, done: [1, 2, 3], seenWave: true }))")
        page = await ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(f'http://127.0.0.1:{PORT}/index.html'); await page.wait_for_timeout(2000)
        await page.evaluate("import('/src/lighthouse.js').then(m => { window._lh = m; })")
        await page.evaluate(f"window._mode = '{mode}'"); await page.add_script_tag(content=LIGHT_BOT)
        await page.evaluate('ichigo.begin(4)')
        return ctx, page
    async def until(page, js, shot=None, timeout=90): return await moment(page, 'Level 4', js, notes, shot, timeout)

    ctx, page = await open_level('idle')   # without the bucket, the wall is a wall
    await until(page, "H.t > .5"); await page.evaluate("window._mode = 'tall'; Object.assign(ichigo.light, { x: 700, y: 430 })")
    await until(page, "S.levelT > 3"); x = await page.evaluate('ichigo.light.x')
    if not 720 < x < 735: notes.append(f'Level 4: standing up, Ichigo got to {x} (the wall is at 740)')
    await ctx.close()
    ctx, page = await open_level('bold')   # never hiding: the light finds Ichigo
    await until(page, "H.phase === 'caught' && H.t > .4", 'light_caught'); await until(page, "S.scene === 'light' && S.deaths === 1 && H.phase === 'play'")
    await page.evaluate("window._mode = 'idle'; Object.assign(ichigo.light, { x: 7345, y: 426, check: 8, seen: 0, danger: false, fade: 0 }); Object.assign(ichigo.light.eye, { mode: 'dark', t: 0, lid: 1 })")   # a cord, pulled, sends the eye to its bell
    await page.evaluate("ichigo.input.usePressed = true"); await until(page, "H.eye.mode === 'hold' && Math.abs(H.eye.x - 6990) < 200", 'light_bell')
    await page.evaluate("Object.assign(ichigo.light, { x: 8290, y: 412, seen: 0, hide: false }); Object.assign(ichigo.light.eye, { mode: 'dark', t: 0, lid: 1 }); ichigo.keys.ShiftLeft = true; window._mode = 'noisy'")   # running past a gull wakes it, and the eye looks
    await until(page, "H.sleepers.some(g => g.kind === 'gull' && g.away > 0)", 'light_gull', 10)
    await page.evaluate("window._mode = 'idle'; Object.assign(ichigo.light, { x: 4868, y: 440, vy: 0, on: null, phase: 'play' })"); await until(page, "H.phase === 'fell'", 'light_fell', 10); await ctx.close()

    ctx, page = await open_level('play')
    for js, shot in [("S.scene === 'story' && ichigo.story.i === 2", 'light_story'), ("H.check === -1 && H.x > 400 && H.eye.mode === 'sweep' && Math.abs(H.eye.x - H.x) < 200", 'light_room'), ("H.check < 2 && H.x > 775 && H.x < 820 && H.hide", 'light_tunnel'), ("H.check >= 0 && H.x > 1000", 'light_workshop'), ("H.check >= 1 && H.x > 1800", 'light_kitchen'), ("H.shut.size === 2", 'light_loft'),
                     ("H.check >= 3 && H.danger", 'light_beam'), ("H.check >= 5 && H.x > 5060 && !H.on", 'light_stones'), ("H.x > 6400 && window._lh.beam().on", 'light_hull'), ("H.x > 7400 && H.eye.mode === 'hold'", 'light_flats'), ("H.x > 8900 && H.danger", 'light_headland'),
                     ("H.cuts >= 1 && H.danger", 'light_cut'), ("H.phase === 'away' && H.t > 2.5", 'light_away'), ("H.phase === 'paddle' && H.hide && H.danger", 'light_paddle'), ("H.phase === 'paddle' && H.sheltered", 'light_stack'), ("H.phase === 'gone' && H.t > 1.2", 'light_learned')]:
        if not await until(page, js, shot, 200): break
    await until(page, "S.scene === 'end' && S.sceneT > 3", 'light_end', 150)
    report = await page.evaluate("({ scene: ichigo.S.scene, deaths: ichigo.S.deaths, seconds: Math.round(ichigo.S.levelT), check: ichigo.light.check, x: Math.round(ichigo.light.x), phase: ichigo.light.phase })")
    report['save'] = json.loads(await page.evaluate("localStorage.getItem('ichigo.save')"))
    if report['scene'] != 'end': notes.append('Level 4: the bot did not finish')
    s = report['save']
    if 4 not in s['done']: notes.append('Level 4: the save is missing the level')
    if 'lighthouse' not in s['learned']: notes.append('Level 4: the lighthouse was not learned')
    await ctx.close()
    return notes, errors, report

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

async def wait_for(page, js, timeout=60, step=100):
    """Wait until the expression js is true in the page (checked every step ms). False if it never is."""
    for _ in range(int(timeout * 1000 / step)):
        if await page.evaluate(js): return True
        await page.wait_for_timeout(step)
    return False

async def play(browser):
    """One full run. Returns a dict of what happened."""
    shot = lambda name: page.screenshot(path=f'{SHOTS}/{name}.png')
    ctx = await browser.new_context(viewport={'width': 960, 'height': 540})   # (a fresh context: an empty save)
    if SKIP_BEACH:
        await ctx.add_init_script("localStorage.setItem('ichigo.save', JSON.stringify({ marks: [], tomorrows: 0, seenWave: true }))")
    page = await ctx.new_page()
    errors, notes = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # Only real code errors count. (Failed downloads, e.g. the Google font when offline, don't.)
    await page.goto(f'http://127.0.0.1:{PORT}/index.html')
    await page.wait_for_timeout(2500)
    await shot('1-title')
    # Read the story cards like a quick reader: a press shows the whole card, the next moves on.
    # (A screenshot of the first of each set is taken on the way.)
    # (It stops once at the first card on the beach, for a screenshot.)
    await page.add_script_tag(content="""window._cards = setInterval(() => { const c = ichigo.cards;
      if (ichigo.S.scene === 'beach' && !window._sawIntro) { window._sawIntro = window._holdCards = true; }
      if (c.active() && !window._holdCards) c.next(); }, 400)""")
    # the settings (P), its controls page, and the list of all levels from it; then back to the title
    async def keys_(*ks):
        for k in ks: await page.keyboard.press(k); await page.wait_for_timeout(120)
    await keys_('KeyP'); await page.wait_for_timeout(400); await shot('settings')
    if not await page.evaluate('ichigo.S.settingsOpen'): notes.append("P didn't open the settings")
    await keys_('ArrowDown', 'Enter'); await page.wait_for_timeout(400); await shot('controls')
    await keys_('Enter', 'ArrowDown', 'Enter'); await page.wait_for_timeout(800)   # (back from the controls, still on CONTROLS: one down is ALL LEVELS)
    await shot('levels')
    if await page.evaluate("ichigo.S.scene") != 'levels': notes.append("the settings didn't open the level list")
    await page.keyboard.press('Escape'); await page.wait_for_timeout(500)

    if SKIP_BEACH:
        await page.evaluate('window._sawIntro = true; ichigo.startLevel()')
    else:
        await page.evaluate('window._holdCards = true')
        await page.keyboard.press('Enter'); await page.wait_for_timeout(3500)
        await shot('prologue')   # Level 0
        await page.evaluate('window._holdCards = false')
        if await wait_for(page, "ichigo.S.scene === 'beach' && window._holdCards", 30):
            await page.wait_for_timeout(2500); await shot('cards_intro')
        else: notes.append('Level 0 never led to the beach')
        await page.evaluate('window._holdCards = false')
        await wait_for(page, '!ichigo.cards.active()', 15)
        await page.wait_for_timeout(1000)
        await shot('beach_start')
        await page.add_script_tag(content=BEACH_BOT)
        b = 'ichigo.beach'
        if await wait_for(page, f"{b}.phase === 'trip' && {b}.t > 3.0", 30): await shot('trip_plaster')
        else: notes.append('the trip never happened')
        if await wait_for(page, f"{b}.phase === 'recede' && {b}.t > 2.0", 90): await shot('sea_pulls_back')
        else: notes.append('the third pour never happened')
        if await wait_for(page, f"{b}.phase === 'recede' && {b}.waveT > 3.9", 15): await shot('wave_over_beach')
        if await wait_for(page, "ichigo.S.scene === 'white'", 15):
            await page.evaluate('window._holdCards = true')
            if await wait_for(page, 'ichigo.cards.active()', 5): await page.wait_for_timeout(2500); await shot('cards_white')
            await page.evaluate('window._holdCards = false')
        else: notes.append('no white after the wave')
        await page.evaluate('clearInterval(window._beachBot)')
    if await wait_for(page, "ichigo.S.scene === 'play' && ichigo.S.levelT > 1.9", 15): await shot('kaa_chan_question')
    else: notes.append('play never started')

    await page.add_script_tag(content=BOT)
    result = None; boat_shot = False
    for tick in range(1800):   # (3 minutes, in tenths of a second)
        await page.wait_for_timeout(100)
        st = await page.evaluate('({x: Math.round(ichigo.PL.x), scene: ichigo.S.scene, deaths: ichigo.S.deaths, sitBack: ichigo.PL.sitting && ichigo.PL.idle > 5.5})')
        if tick == 200: await shot('4-midlevel')
        if st['sitBack'] and not boat_shot: await shot('boat_sit'); boat_shot = True
        if st['scene'] == 'end':
            result = st; break
    if not boat_shot: notes.append('Ichigo never sat on the boat')
    await page.wait_for_timeout(3000)
    await shot('5-end')
    fallen = await page.evaluate('window._fallen')
    saved = await page.evaluate("localStorage.getItem('ichigo.save')")
    if result:   # a key goes on to the journey to Level 2 (story.js), and finishing Level 1 unlocks it in the list
        await page.keyboard.press('Enter'); await page.wait_for_timeout(800)
        if await page.evaluate("ichigo.S.scene + ichigo.S.level.number") != 'story2': notes.append('Level 1 did not lead on to the journey to Level 2')
        await page.keyboard.press('KeyP'); await page.wait_for_timeout(300)
        for k in ['ArrowDown', 'ArrowDown', 'Enter']: await page.keyboard.press(k); await page.wait_for_timeout(120)
        await page.wait_for_timeout(800); await shot('levels_after')
    await ctx.close()
    return dict(errors=errors, notes=notes, fallen=fallen, result=result, save=json.loads(saved) if saved else None)

async def main():
    os.makedirs(SHOTS, exist_ok=True)
    httpd = serve()
    ok = True
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox']) if CHROME else await p.chromium.launch()
        runs = [('Level 1', await play(browser))] if ONLY in (None, 1) else []
        tide = await play_tide(browser) if ONLY in (None, 2) else None
        plum = await play_plum(browser) if ONLY in (None, 3) else None
        light = await play_light(browser) if ONLY in (None, 4) else None
        await browser.close()
    httpd.shutdown()

    for name, r in runs:
        print(f'--- {name} ---')
        print('Page errors:', r['errors'] or 'none')
        for n in r['notes']: print('Problem:', n)
        print('Bot fell in at x =', r['fallen'] or 'never')
        if r['result']: print(f"Bot reached the lantern, falling in {r['result']['deaths']} times.")
        else: print('Bot did NOT reach the lantern within 3 minutes.'); ok = False
        print('Save:', r['save'])
        if not SKIP_BEACH:
            s = r['save'] or {}
            if s.get('learned') != ['kaachan', 'sea'] or s.get('marks') != ['chin']: print("Problem: expected learned ['kaachan', 'sea'] and marks ['chin']"); ok = False
        if r['errors'] or r['notes']: ok = False
    for name, got in (('Level 2', tide), ('Level 3', plum), ('Level 4', light)):
        if not got: continue
        notes, errors, report = got
        print(f'--- {name} ---')
        print('Page errors:', errors or 'none')
        for n in notes: print('Problem:', n)
        print(f"Bot: {report['scene']}, {report['deaths']} new tomorrows, {report['seconds']} s.  Save: {report['save']}")
        if errors or notes: ok = False
    print('Screenshots saved in tests/screens/')
    sys.exit(0 if ok else 1)

asyncio.run(main())

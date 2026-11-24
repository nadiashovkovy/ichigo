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

async def play_tide(browser):
    """Level 2. Returns (problems, page errors, what to report)."""
    errors, notes, report = [], [], {}
    async def open_level(mode):
        ctx = await browser.new_context(viewport={'width': 960, 'height': 540})
        await ctx.add_init_script(FAST_CLOCK)
        await ctx.add_init_script("localStorage.setItem('ichigo.save', JSON.stringify({ words: ['kaa-chan', 'umi'], marks: ['chin'], tomorrows: 0, done: [1], seenWave: true }))")
        page = await ctx.new_page(); page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(f'http://127.0.0.1:{PORT}/index.html'); await page.wait_for_timeout(2000)
        await page.evaluate(f"window._mode = '{mode}'"); await page.add_script_tag(content=TIDE_BOT)
        await page.evaluate('ichigo.begin(2)')
        return ctx, page
    async def until(page, js, shot=None, timeout=240):
        if not await wait_for(page, f'(() => {{ const N = ichigo.tide, S = ichigo.S; return {js}; }})()', timeout, 30): notes.append(f'Level 2: never saw {js}'); return False
        if shot:
            await page.evaluate('window._hold = true'); await page.wait_for_timeout(100)
            await page.screenshot(path=f'{SHOTS}/{shot}.png'); await page.evaluate('window._hold = false')
        return True
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
    await page.evaluate("(N => { N.crabs = [{ side: 'right', x: N.x, dir: 1, t: 0, hide: 0 }]; })(ichigo.tide)")   # a crab pinches: Ichigo cries, and learns its name
    if not await until(page, "N.cry > .5 && S.words.includes('kani')", 'tide_pinch', 10): notes.append('Level 2: a crab did not pinch Ichigo')
    await ctx.close()

    ctx, page = await open_level('walk')   # walking the sandbar is too slow
    await until(page, NOW); await until(page, "S.deaths > 0 || S.scene === 'end'")
    if await page.evaluate('ichigo.S.scene') == 'end': notes.append('Level 2: walking was fast enough for the sandbar')
    await until(page, "N.phase === 'bar' && S.scene === 'tide' && S.deaths === 1"); await ctx.close()

    ctx, page = await open_level('play')
    for js, shot in [("N.phase === 'wake' && N.t > 2.2", 'tide_sleep'), ("N.set === 0 && N.phase === 'waves'", 'tide_umi'), ("N.phase === 'waves' && N.set === 0 && N.load >= 3", 'tide_scoop'), ("N.flare > .6", 'tide_feed'),
                     ("N.held", 'tide_thing'), ("N.phase === 'waves' && N.set === 1 && N.swells.some(v => v.t > 4.9 && v.t < 5.2)", 'tide_wave'), ("N.set === 2 && N.glows.length > 5", 'tide_glow'), ("N.set === 3 && N.phase === 'waves'", 'tide_last'),
                     ("N.phase === 'ebb' && N.t > 3.6", 'tide_dawn'), ("N.phase === 'bar' && N.x > 1180", 'tide_sandbar'), ("N.shellT > .2", 'tide_shell')]:
        if not await until(page, js, shot): break
    await page.keyboard.press('Tab'); await until(page, "S.thingsOpen", 'tide_things'); await page.keyboard.press('Tab'); await until(page, "!S.thingsOpen")
    await until(page, "S.scene === 'end' && S.sceneT > 3", 'tide_end')
    report = await page.evaluate("({ scene: ichigo.S.scene, deaths: ichigo.S.deaths, seconds: Math.round(ichigo.S.levelT), knocked: window._knocked, saved: ichigo.tide.saved })")
    report['save'] = json.loads(await page.evaluate("localStorage.getItem('ichigo.save')"))
    if report['scene'] != 'end': notes.append('Level 2: the bot did not finish')
    s = report['save']
    if 'kani' not in s['words'] or 2 not in s['done'] or 'shell' not in s['things']: notes.append('Level 2: the save is missing kani, the shell or the level')
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
        await ctx.add_init_script("localStorage.setItem('ichigo.save', JSON.stringify({ words: [], marks: [], tomorrows: 0, seenWave: true }))")
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
    if result:   # a key goes on to Level 2, and finishing Level 1 unlocks it in the list
        await page.keyboard.press('Enter'); await page.wait_for_timeout(800)
        if await page.evaluate("ichigo.S.scene + ichigo.S.level.number") != 'tide2': notes.append('Level 1 did not lead on to Level 2')
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
            if s.get('words') != ['kaa-chan', 'umi'] or s.get('marks') != ['chin']: print("Problem: expected words ['kaa-chan', 'umi'] and marks ['chin']"); ok = False
        if r['errors'] or r['notes']: ok = False
    if tide:
        notes, errors, report = tide
        print('--- Level 2 ---')
        print('Page errors:', errors or 'none')
        for n in notes: print('Problem:', n)
        print(f"Bot: {report['scene']}, {report['deaths']} new tomorrows, {report['seconds']} s.  Save: {report['save']}")
        if errors or notes: ok = False
    print('Screenshots saved in tests/screens/')
    sys.exit(0 if ok else 1)

asyncio.run(main())

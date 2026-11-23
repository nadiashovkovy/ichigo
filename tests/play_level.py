"""
Automated play-test for Ichigo.

What it does:
  1. Serves the game from this folder on a local web server.
  2. Opens it in a headless Chrome, twice: at the PC's 4:3 size, then in full screen (16:9).
  3. Plays the beach before the wave: walks right to the water (tripping over the shovel on the way,
     and sitting through the plaster), fills the bucket, walks back, digs, pours, and again, until
     the third pour. Then waits through the wave and the white.
  4. Lets a simple "bot" play Level 1: it walks, runs before wide gaps, jumps near the end of each
     piece of wreckage, keeps its balance while waiting for drifting planks, and rests on the boat
     long enough for Ichigo to sit down and look back.
  5. Takes screenshots of each moment worth looking at (tests/screens/; full screen ones end in _wide),
     and reports page errors, where the bot fell in, whether it reached the lantern, and the save.

Run it from the project folder:
    pip install playwright && playwright install chromium
    python tests/play_level.py               # the whole thing
    python tests/play_level.py --skip-beach  # straight to the sea (sets the save's seenWave): faster
"""
import asyncio, functools, http.server, json, os, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'screens')
PORT = 8765
CHROME = os.environ.get('CHROME_PATH')   # optional: use a specific Chrome
SKIP_BEACH = '--skip-beach' in sys.argv

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

async def play(browser, wide):
    """One full run. Returns a dict of what happened."""
    tag = '_wide' if wide else ''
    shot = lambda name: page.screenshot(path=f'{SHOTS}/{name}{tag}.png')
    ctx = await browser.new_context(viewport={'width': 960, 'height': 540})   # (a fresh context: an empty save)
    if SKIP_BEACH:
        await ctx.add_init_script("localStorage.setItem('ichigo.save', JSON.stringify({ words: [], marks: [], tomorrows: 0, seenWave: true }))")
    page = await ctx.new_page()
    errors, notes = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # Only real code errors count. (Failed downloads, e.g. the Google font when offline, don't.)
    await page.goto(f'http://127.0.0.1:{PORT}/index.html')
    if wide:   # full screen, as the F key gives it (headless Chrome can't really go full screen)
        await page.evaluate("document.documentElement.classList.add('full'); dispatchEvent(new Event('resize'))")
    await page.wait_for_timeout(2500)
    await shot('1-title')

    if SKIP_BEACH:
        await page.evaluate('ichigo.startLevel()')
    else:
        await page.keyboard.press('Enter'); await page.wait_for_timeout(1500)
        await shot('beach_start')
        await page.add_script_tag(content=BEACH_BOT)
        b = 'ichigo.beach'
        if await wait_for(page, f"{b}.phase === 'trip' && {b}.t > 3.0", 30): await shot('trip_plaster')
        else: notes.append('the trip never happened')
        if await wait_for(page, f"{b}.phase === 'recede' && {b}.t > 2.0", 90): await shot('sea_pulls_back')
        else: notes.append('the third pour never happened')
        if await wait_for(page, f"{b}.phase === 'recede' && {b}.waveT > 3.9", 15): await shot('wave_over_beach')
        if await wait_for(page, "ichigo.S.scene === 'white'", 15): await shot('white')
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
    await ctx.close()
    return dict(errors=errors, notes=notes, fallen=fallen, result=result, save=json.loads(saved) if saved else None)

async def main():
    os.makedirs(SHOTS, exist_ok=True)
    httpd = serve()
    ok = True
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox']) if CHROME else await p.chromium.launch()
        runs = [('4:3 PC', await play(browser, False)), ('full screen', await play(browser, True))]
        await browser.close()
    httpd.shutdown()

    for name, r in runs:
        print(f'--- {name} ---')
        print('Page errors:', r['errors'] or 'none')
        for n in r['notes']: print('Problem:', n)
        print('Bot fell in at x =', r['fallen'] or 'never')
        if r['result']: print(f"Bot reached the lantern with {r['result']['deaths']} tomorrows.")
        else: print('Bot did NOT reach the lantern within 3 minutes.'); ok = False
        print('Save:', r['save'])
        if not SKIP_BEACH:
            s = r['save'] or {}
            if s.get('words') != ['kaa-chan'] or s.get('marks') != ['chin']: print("Problem: expected words ['kaa-chan'] and marks ['chin']"); ok = False
        if r['errors'] or r['notes']: ok = False
    print('Screenshots saved in tests/screens/')
    sys.exit(0 if ok else 1)

asyncio.run(main())

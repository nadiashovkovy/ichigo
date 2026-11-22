"""
Makes the title card's pixel art from Hokusai's print (public domain).

    curl -L -o wave.jpg "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/1280px-Tsunami_by_hokusai_19th_century.jpg"
    python tools/make_title.py wave.jpg

The result looks like a cross-stitch chart of the print: a grid of cells, each one clean colour from the
palette below, with a flat paper sky and an ink outline where the waves meet it. Writes
assets/title.png (160×106 cells, for the PC's 4:3 screen), assets/title_wide.png (214×120, for full
screen), and a *_cloud.png for each (the big cream cloud on its own, so the game can drift it).
Also writes assets/great_wave.png (the big wave cut out of the chart, for the intro) and
assets/cloud.png (its cloud, for the game's sky), and a layer per boat, the size of the chart, so the game can rock
them: assets/title_boat_{bottom,fuji,left}.png and assets/title_wide_boat_{fuji,left}.png (the wide
chart crops the bottom boat off the screen, so it's left out there).
The game draws every cell as 2×2 pixels.
Needs Pillow, numpy and scipy.
"""
import os, sys
import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The palette, matched to a pixelated version of the print: paper sky, cream foam, three blues
# and an ink-dark outline, the greys of the far sea, and the ochre of the boats.
PAL = ['#f4ecd8', '#fdfbf3', '#a8c4cc', '#7fa3bf', '#3f669c', '#1f3270', '#0e1430',
       '#d4d0c4', '#aeaba0', '#8a8a84', '#64666a', '#c9a464', '#dbc8a2']
SKY, CLOUD = '#e6cea5', '#f4ecd8'
rgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]

def main(src):
    im = Image.open(src).convert('RGB')
    im = im.crop((16, 16, im.width - 16, im.height - 16))   # lose the print's border
    a = np.asarray(im, float)
    h, w = a.shape[:2]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = (r + g + b) / 3

    # The sky: warm paper, joined to the top edge of the print. The title cartouche and the
    # signature (top left) are painted over with sky first.
    a[int(h * .02):int(h * .30), int(w * .0):int(w * .10)] = np.median(a[int(h * .05):int(h * .12), int(w * .6):int(w * .9)].reshape(-1, 3), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; lum = (r + g + b) / 3
    paper = (r - b > 18) & (lum > 140) & (r >= g)
    paper = ndimage.binary_opening(paper, iterations=2)
    lab, _ = ndimage.label(paper)
    sky = np.isin(lab, np.unique(lab[:3, :])[1:])
    sky = ndimage.binary_fill_holes(ndimage.binary_closing(sky, iterations=3))
    # the cloud: the paler paper in the sky, smoothed into one soft shape
    soft = ndimage.gaussian_filter(lum, 10)
    cloud = sky & (soft > np.percentile(soft[sky], 84)) & (np.arange(h)[:, None] < h * .36) & (np.arange(w)[None, :] > w * .35)
    cloud = ndimage.binary_opening(cloud, iterations=6)

    pal = np.array([rgb(p) for p in PAL + [SKY]], float)
    SKY_I, INK_I, GREYS = len(PAL), PAL.index('#0e1430'), [PAL.index(c) for c in ('#d4d0c4', '#aeaba0', '#8a8a84', '#64666a')]
    # One chart for the PC's 4:3 screen (160 cells wide), one for full screen (214 wide). Each cell is
    # drawn 2×2 pixels in the game. The wide one is taller than the screen's 120 cells, so it loses
    # some sea off the bottom.
    for name, width in (('title', 160), ('title_wide', 214)):
        H = round(width * h / w)
        small = lambda m: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((width, H), Image.Resampling.BOX)) > 127
        sky_s, cloud_s = small(sky), small(cloud)
        sm = Image.fromarray(a.astype(np.uint8)).resize((width, H), Image.Resampling.BOX)
        sm = ImageEnhance.Contrast(sm).enhance(1.3); sm = ImageEnhance.Color(sm).enhance(1.4)
        s = np.asarray(sm, float)
        idx = (((s[:, :, None, :] - pal[None, None, :-1]) ** 2) * [1.0, 1.3, .9]).sum(-1).argmin(-1)
        # greys belong only to the far sea behind Fuji; anywhere else they're foam mixed with blue
        yy, xx = np.mgrid[0:H, 0:width] / [[[H]], [[width]]]
        far = (xx > .42) & (xx < .9) & (yy > .56) & (yy < .8)
        for grey, blue in zip(GREYS, ('#a8c4cc', '#a8c4cc', '#7fa3bf', '#7fa3bf')):
            idx[(idx == grey) & ~far] = PAL.index(blue)
        idx[sky_s] = SKY_I
        idx[0] = SKY_I                                     # the top edge is all sky
        idx[:, 0] = idx[:, 1]; idx[:, -1] = idx[:, -2]     # no leftover border down the sides
        idx = tidy(idx, len(pal))
        # the ink outline: foam and water cells that touch the sky, as in the chart
        sky_now = idx == SKY_I
        touch = np.zeros_like(sky_now)
        touch[1:] |= sky_now[:-1]; touch[:-1] |= sky_now[1:]; touch[:, 1:] |= sky_now[:, :-1]; touch[:, :-1] |= sky_now[:, 1:]
        idx[touch & ~sky_now & ~np.isin(idx, GREYS)] = INK_I
        # the far sea on the horizon: calm, clean bands of grey (no speckle to pull the eye)
        band = far & np.isin(idx, GREYS + [PAL.index('#fdfbf3')]) & (yy < .75)
        idx[band] = np.where(yy < .70, GREYS[1], np.where(yy < .725, GREYS[2], GREYS[3]))[band]
        # the boats, each drawn on its own layer (so the game can rock them) and painted out of the
        # picture, which takes the colours of the water around them. A boat the chart crops off the
        # bottom of the screen is still painted out, but gets no layer.
        boats, hole = {}, np.zeros((H, width), bool)
        yy2, xx2 = np.mgrid[0:H, 0:width]
        for bname, spec in BOATS.items():
            layer = draw_boat(width, H, **spec)
            shape = layer[..., 3] > 0
            ys, xs = np.nonzero(shape)
            box = (yy2 >= ys.min() - 1) & (yy2 <= ys.max() + 1) & (xx2 >= xs.min() - 1) & (xx2 <= xs.max() + 1)
            smear = box & ndimage.binary_dilation(shape, iterations=2) & np.isin(idx, [PAL.index('#c9a464'), PAL.index('#dbc8a2')])
            hole |= ndimage.binary_dilation(shape, iterations=1) | smear
            if max(p[1] for p in spec['bottom']) * H <= min(H, 120) - 2:   # (painted out either way)
                boats[bname] = layer
        _, (iy, ix) = ndimage.distance_transform_edt(hole, return_indices=True)
        idx = idx[iy, ix]
        draw_fuji(idx, width, H)
        out = pal[idx].astype(np.uint8)
        cl = np.zeros((H, width, 4), np.uint8); cl[cloud_s & sky_now] = rgb(CLOUD) + [255]
        if name == 'title':   # the great wave on its own (sky see-through), for the intro to roll in
            wave = np.zeros((72, 100, 4), np.uint8)
            keep = ~sky_now[:72, :100] & ~cloud_s[:72, :100] & ~np.isin(idx[:72, :100], GREYS)
            wave[keep] = np.concatenate([out[:72, :100][keep], np.full((keep.sum(), 1), 255, np.uint8)], 1)
            Image.fromarray(wave).save(os.path.join(ROOT, 'assets', 'great_wave.png'))
            ys, xs = np.nonzero(cl[..., 3])   # the cloud on its own, rounded off underneath, for the game's sky
            m = round_bottom(cl[ys.min():ys.max() + 1, xs.min():xs.max() + 1, 3] > 0, 16)
            gc = np.zeros(m.shape + (4,), np.uint8); gc[m] = rgb(CLOUD) + [255]
            Image.fromarray(gc).save(os.path.join(ROOT, 'assets', 'cloud.png'))
        if H > 120: out, cl = out[:120], cl[:120]
        Image.fromarray(out).save(os.path.join(ROOT, 'assets', name + '.png'))
        for bname, layer in boats.items():
            Image.fromarray(layer[:out.shape[0]]).save(os.path.join(ROOT, 'assets', f'{name}_boat_{bname}.png'))
        print(f'assets/{name}.png', out.shape[1], 'x', out.shape[0], 'cells')

# The print's three boats, traced from it in fractions of its width and height (so they fit either
# chart): the top and bottom edges of each hull, from bow to stern; where the straw mat lies on the
# rim; and where rowers sit (light = white caps, dark = dark hair).
BOATS = {
    'bottom': dict(rim=[(.406, .783), (.50, .858), (.575, .915), (.738, .939), (.80, .915)],
                   bottom=[(.406, .783), (.49, .887), (.563, .953), (.738, .967), (.80, .915)],
                   mat=(.463, .58), rowers=[.705 + k * .016 for k in range(6)], caps='dark'),
    'fuji': dict(rim=[(.554, .718), (.60, .746), (.65, .76), (.70, .755), (.75, .735), (.80, .705), (.855, .65)],   # (two rows lower than traced, and
                 bottom=[(.554, .718), (.60, .765), (.65, .785), (.70, .785), (.75, .765), (.80, .735), (.855, .68)],  # no mat, so Fuji stands clear above it)
                 mat=None, rowers=[.725, .74, .815, .83, .845], caps='light'),
    'left': dict(rim=[(.012, .479), (.048, .569), (.096, .617), (.16, .648), (.224, .66)],
                 bottom=[(.012, .479), (.03, .53), (.06, .62), (.10, .70), (.16, .712), (.228, .672)],
                 mat=(.09, .2), rowers=[], caps='dark', deck=True),
}

def round_bottom(m, cut=28):
    """The cloud is cut off where the wave runs under it in the print: drop the ragged bits below,
    then finish it with a row of round puffs along the bottom, like its top."""
    m = m[:cut].copy(); h, w = m.shape
    m = np.vstack([m, np.zeros((8, w), bool)])
    row = m[h - 1]; xs = np.nonzero(row)[0]
    runs = np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1)
    yy, xx = np.mgrid[0:h + 8, 0:w]
    for run in runs:
        if len(run) < 3: continue
        n = max(1, round(len(run) / 10)); edges = np.linspace(run[0], run[-1] + 1, n + 1)
        for a, b in zip(edges[:-1], edges[1:]):   # a puff per stretch of the bottom edge
            cx, r = (a + b) / 2 - .5, (b - a) / 2
            m |= ((xx - cx) / r) ** 2 + ((yy - (h - 1)) / (r * .85)) ** 2 <= 1
    m = ndimage.binary_closing(m, structure=np.ones((3, 3)), iterations=1, border_value=0) | m
    keep = ndimage.binary_opening(m, structure=np.array([[0,1,0],[1,1,1],[0,1,0]]))
    lab, n = ndimage.label(keep); sizes = ndimage.sum(keep, lab, range(1, n + 1))
    keep = lab == (np.argmax(sizes) + 1)
    ys = np.nonzero(keep.any(1))[0]; xs = np.nonzero(keep.any(0))[0]
    return keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def draw_fuji(idx, width, H, peak=(.632, .642), base=.748, half=.078):
    """Mt Fuji, drawn cell by cell so it stays clear at this size: a white snowy peak, its snow
    line ragged, streaks of snow running down the grey lower slopes."""
    W_ = PAL.index('#fdfbf3'); B1 = PAL.index('#64666a'); B2 = PAL.index('#8a8a84')
    py, by, cx = peak[1] * H, base * H, peak[0] * width
    for y in range(int(py), int(np.ceil(by))):
        k = (y + .5 - py) / (by - py)                      # 0 at the peak, 1 at the base
        hw = max(.6, k * half * width)
        for x in range(int(cx - hw), int(np.ceil(cx + hw))):
            if not (0 <= x < width and 0 <= y < H): continue
            snow = k < .5 + (.12 if x % 3 == 0 else 0) or (x % 4 == 1 and k < .8)
            idx[y, x] = W_ if snow else (B2 if (x + y) % 5 == 0 else B1)

def draw_boat(width, H, rim, bottom, mat, rowers, caps, deck=False):
    """One boat, drawn cell by cell: a salmon rim over a cream side, the straw mat on top (or, with
    deck, covering the whole hull in planks, as the left boat's is), the rowers hunched along the
    rim, all with an ink outline. Returns a transparent layer the size
    of the chart."""
    X = lambda f: f * width; Y = lambda f: f * H
    lerp = lambda pts, x: np.interp(x, [X(p[0]) for p in pts], [Y(p[1]) for p in pts])
    out = np.zeros((H, width, 4), np.uint8)
    put = lambda x, y, c: out.__setitem__((y, x), rgb(c) + [255]) if 0 <= x < width and 0 <= y < H else None
    x0, x1 = int(np.ceil(X(rim[0][0]))), int(X(rim[-1][0]))
    for x in range(x0, x1 + 1):
        top, bot = int(round(lerp(rim, x + .5))), int(round(lerp(bottom, x + .5)))
        for y in range(top, max(top, bot) + 1):
            put(x, y, '#c9a464' if y < top + 1 or bot - top < 2 else '#dbc8a2')   # salmon rim, cream side
            if deck and X(mat[0]) <= x < X(mat[1]) and top < y < bot:   # planks, tied across every few cells
                put(x, y, '#c9a464' if x % 6 == 0 or (y - top) % 2 else '#dbc8a2')
    for x in (range(int(X(mat[0])), int(X(mat[1]))) if mat and not deck else []):   # the straw mat, lying on the rim, tied in bundles
        top = int(round(lerp(rim, x + .5)))
        put(x, top - 1, '#0e1430' if x % 3 == 0 else '#c9a464'); put(x, top - 2, '#dbc8a2')
    for f in rowers:   # the rowers: hunched backs, a head on top
        x = int(X(f)); top = int(round(lerp(rim, x + .5)))
        for dy in range(1, 3): put(x, top - dy, '#3f669c'); put(x + 1, top - dy, '#1f3270')
        if caps == 'light': put(x, top - 3, '#fdfbf3'); put(x + 1, top - 3, '#f4ecd8')
        else: put(x, top - 3, '#0e1430'); put(x + 1, top - 3, '#f4ecd8')
    a = out[..., 3] > 0   # the ink outline all round
    ring = ndimage.binary_dilation(a, structure=np.ones((3, 3))) & ~a
    out[ring] = rgb('#0e1430') + [255]
    return out

def tidy(idx, n, passes=2):
    """Clean up the chart: a cell that matches almost none of its 8 neighbours, when most of them
    agree, takes their colour. Removes the specks that make a shrunk picture look noisy."""
    for _ in range(passes):
        p = np.pad(idx, 1, mode='edge')
        nb = np.stack([p[1 + dy:p.shape[0] - 1 + dy, 1 + dx:p.shape[1] - 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx])
        counts = np.stack([(nb == c).sum(0) for c in range(n)])
        best, best_n = counts.argmax(0), counts.max(0)
        same = np.take_along_axis(counts, idx[None], 0)[0]
        idx = np.where((same <= 1) & (best_n >= 5), best, idx)
    return idx

if __name__ == '__main__':
    main(sys.argv[1])

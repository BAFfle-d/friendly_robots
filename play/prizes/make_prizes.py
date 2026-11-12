"""Builds the coloring-page prizes for Rex Runs RoboTown. Needs Python 3 and Pillow.

Add new art:   python3 play/prizes/make_prizes.py --add path/to/new-art-folder
  Each image in the folder becomes the next page number (rex-and-billy-page-11.png, ...),
  saved as a 300 dpi letter-size grayscale PNG plus a small thumbnail. Then add the new
  page numbers to a pack in prizes.json.
Replace a page: python3 play/prizes/make_prizes.py --set 7 path/to/updated-art.png
  Swaps in an updated picture under the same page number, so links and prizes.json stay as they are.
Rebuild PDFs:  python3 play/prizes/make_prizes.py
  Makes one PDF per pack in prizes.json, pages in the listed order.
"""
import json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PAGES = os.path.join(HERE, 'pages')
SIZE = (2550, 3300)  # 8.5 x 11 in at 300 dpi


def page_path(n, thumb=False):
    return os.path.join(PAGES, f'rex-and-billy-page-{n:02d}' + ('-thumb.jpg' if thumb else '.png'))


def convert(src, n):
    im = Image.open(src).convert('L')
    im.thumbnail(SIZE, Image.LANCZOS)
    sheet = Image.new('L', SIZE, 255)
    sheet.paste(im, ((SIZE[0] - im.width) // 2, (SIZE[1] - im.height) // 2))
    sheet.quantize(colors=16, dither=Image.Dither.NONE).save(page_path(n), optimize=True)
    th = sheet.copy()
    th.thumbnail((240, 311), Image.LANCZOS)
    th.save(page_path(n, True), quality=78, optimize=True, progressive=True)


def add(folder):
    os.makedirs(PAGES, exist_ok=True)
    existing = [int(f[19:21]) for f in os.listdir(PAGES) if f.startswith('rex-and-billy-page-') and f.endswith('.png')]
    n = max(existing, default=0)
    for name in sorted(os.listdir(folder)):
        if not name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        n += 1
        convert(os.path.join(folder, name), n)
        print(f'{name} -> page {n}')


def pdfs():
    with open(os.path.join(HERE, 'prizes.json')) as f:
        packs = json.load(f)['packs']
    for pack in packs:
        ims = [Image.open(page_path(n)).convert('L') for n in pack['pages']]
        out = os.path.join(HERE, pack['pdf'])
        ims[0].save(out, save_all=True, append_images=ims[1:], resolution=300, quality=82)
        print(f"{pack['pdf']}: pages {pack['pages']}, {os.path.getsize(out) // 1024} KB")


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--add':
        add(sys.argv[2])
    elif len(sys.argv) == 4 and sys.argv[1] == '--set':
        convert(sys.argv[3], int(sys.argv[2]))
        print(f'{sys.argv[3]} -> page {int(sys.argv[2])}')
    elif len(sys.argv) > 1:
        sys.exit(__doc__)
    pdfs()

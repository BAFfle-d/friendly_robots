FRIENDLY ROBOTS!

The live site is the static files at the repository root. Vercel serves them
as-is (no build command, framework null). index.html is the homepage.

EDITING
index.html is the page, including metadata and JSON-LD.
styles.css, catalog.js, app.js, and friend.js are the other editable sources.
assets/robotown.webp is the hero image. assets/robotown.jpg is the fallback.
assets/og.jpg is the 1200x630 share image.

After changing a book in catalog.js, run: node build.cjs
That refreshes the Book JSON-LD in index.html, rewrites the homepage book
cards, writes each /books/<slug>/ page, updates sitemap.xml, and checks links,
categories, and required copy. Commit the updated files. Vercel does not run
the script.

BOOK PAGES (/books/<slug>/)
Each catalog book has its own page: title, cover, author, the short description
already in catalog.js, the paperback price when one is recorded, and the
Amazon buy link. Slugs, prices, currency, availability, and format live in
catalog.js. Prices are the paperback buy-box amounts from the Amazon listing
that catalog.js already links, in USD. If a price cannot be verified, leave
price, priceCurrency, availability, and format off that book. The page then
hides the price and omits offers.price. Do not invent a price, a rating, or a
review. Book JSON-LD on the homepage points at these pages. offers.url on both
the homepage and the book page stays the tagged Amazon link.

AMAZON
Product and author-store links use tag=stashandset-20, the Associates tracking
ID confirmed from reviews.bfloore.online. The page discloses that relationship.
Book JSON-LD url stays the clean dp URL. offers.url carries the tag.

NOT UPLOADED
.vercelignore keeps build.cjs and this README off the public site.

PLAY PAGE (/play)
play/index.html is the games page: one card per game, each with a screenshot from
play/img/ (WebP plus a JPG fallback, 16:10) and a gold Play button. The homepage's
top Play link goes here. To add a game, add a card and its two screenshots.

GAME (/play/rex/)
Rex Runs RoboTown's page is play/rex/index.html; its code and prizes stay in play/
and load only on /play/rex/, so the homepage stays light.
play/engine.js holds the rules: speeds, level lengths, time limits, the shield and
the obstacle layouts. play/game.js draws everything and handles controls and screens.
Tuning lives at the top of engine.js: ALLOWED_BUMPS (bumps each board allows before
the clock runs out), BONK (how long a bump stuns Rex), PHYS (jump height and float),
PLATFORM heights, and POWERS / POWER_ORDER (power-ups, earned one per board from board 2).
After changing engine.js, run: node play/test-engine.cjs
That plays every level hundreds of times and fails if a level cannot be cleared
without bumps, or if a player who never presses anything can still finish.
The prize coloring pages are b. floore's Rex and Billy art in play/prizes/pages/
(300 dpi grayscale PNGs plus small thumbnails), with each pack also
as a PDF in play/prizes/. Board 5 unlocks pack 1, board 10 unlocks pack 2.
play/prizes/prizes.json says which pages go in which pack, in what order, and after
which board; the game reads it, so no code changes are needed. To add new pages:
  python3 play/prizes/make_prizes.py --add <folder of images>
That makes the next numbered pages and thumbnails. Then put the new page numbers in
prizes.json (or add a pack with its own "after" board and "pdf" name) and rebuild
the PDFs with: python3 play/prizes/make_prizes.py
To swap in an updated picture for an existing page, keeping its number:
  python3 play/prizes/make_prizes.py --set <page number> <image>
Progress and prizes are saved in the player's own browser (localStorage). The prize
gate is client-side, so anyone who knows the file address can download the pages.

HOLIBOT MATCH (/play/holidays/)
A five-round matching game for FRIENDLY ROBOTS! Celebrate the Holidays, linked from
the /play page and the holiday book section on the homepage. It loads only on its own page. Rounds: 1 holiday things (pictures),
2 Feliz dresses up (pictures), 3 holiday words, 4 Festiva dresses up (pictures),
5 holiday people (words only, always). Each round draws 6 of the 9 holidays at random
(PER_ROUND in data.js). Finishing round 5 unlocks a coloring pack download.
All wording, colors, icon names and the prize file live in play/holidays/data.js.
After changing it, run: node play/holidays/test-data.cjs

PICTURES DROP IN BY NAME. Save each as a PNG in play/holidays/img/ with the exact
name below and commit it. No code changes: a picture that exists replaces its
placeholder words, and a missing one keeps the words. Transparent or white
backgrounds work best; the card shows them at about 4:3 (pictures) or square (icons).
Holiday names in file names: bodhi-day, diwali, kwanzaa, yule, mawlid,
lunar-new-year, christmas, hanukkah, new-years.
  icon-<holiday>-1.png      book footer icon, shown on the holiday's name card
  icon-<holiday>-2.png      the holiday's other icon, shown on the card it matches
  object-<holiday>.png      round 1 picture (diya, kinara, Yule log...)
  feliz-<holiday>.png       round 2: Feliz dressed for that holiday
  festiva-<holiday>.png     round 4: Festiva dressed for that holiday
  feliz.png, festiva.png    the two robots on the start and between-round screens
There is no picture for round 5: the Prophet Muhammad is never pictured.
PRIZE: four coloring packs, play/holidays/prize/feliz-and-festiva-pack-1.pdf to -4.pdf,
each with a page-1 thumbnail pack-1.png to pack-4.png (PRIZE.packs in data.js).
Each win on a browser hands out the next pack, 1 to 4, then pack 1 again.

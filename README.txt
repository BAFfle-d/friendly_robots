FRIENDLY ROBOTS!

The live site is the static files at the repository root. Vercel serves them
as-is (no build command, framework null). index.html is the homepage.

EDITING
index.html is the page, including metadata and JSON-LD.
styles.css, catalog.js, app.js, and friend.js are the other editable sources.
assets/robotown.webp is the hero image. assets/robotown.jpg is the fallback.
assets/og.jpg is the 1200x630 share image.

After changing a book in catalog.js, run: node build.cjs
That refreshes the Book JSON-LD in index.html and checks links, categories,
and required copy. Commit the updated index.html. Vercel does not run the script.

AMAZON
Product and author-store links use tag=stashandset-20, the Associates tracking
ID confirmed from reviews.bfloore.online. The page discloses that relationship.
Book JSON-LD url stays the clean dp URL. offers.url carries the tag.

NOT UPLOADED
.vercelignore keeps build.cjs and this README off the public site.

GAME (/play)
Rex Runs RoboTown lives in play/ and loads only on /play, so the homepage stays light.
play/engine.js holds the rules: speeds, level lengths, time limits, the shield and
the obstacle layouts. play/game.js draws everything and handles controls and screens.
Tuning lives at the top of engine.js: ALLOWED_BUMPS (bumps each board allows before
the clock runs out), BONK (how long a bump stuns Rex), PHYS (jump height and float),
PLATFORM heights, and POWERS / POWER_ORDER (power-ups, earned one per board from board 2).
After changing engine.js, run: node play/test-engine.cjs
That plays every level hundreds of times and fails if a level cannot be cleared
without bumps, or if a player who never presses anything can still finish.
The prize coloring pages are b. floore's Rex and Billy art in play/prizes/pages/
(300 dpi grayscale PNGs plus small thumbnails), with each five-page pack also
as a PDF in play/prizes/. Board 5 unlocks pack 1, board 10 unlocks pack 2.
play/prizes/prizes.json says which pages go in which pack, in what order, and after
which board; the game reads it, so no code changes are needed. To add new pages:
  python3 play/prizes/make_prizes.py --add <folder of images>
That makes the next numbered pages and thumbnails. Then put the new page numbers in
prizes.json (or add a pack with its own "after" board and "pdf" name) and rebuild
the PDFs with: python3 play/prizes/make_prizes.py
Progress and prizes are saved in the player's own browser (localStorage). The prize
gate is client-side, so anyone who knows the file address can download the pages.

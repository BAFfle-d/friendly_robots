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

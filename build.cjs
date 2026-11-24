// Local checker for the static site. Vercel serves the committed files as-is
// and does not run this script. After editing catalog.js, run: node build.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const TAG = 'stashandset-20';
const SITE = 'https://www.friendlyrobots.online/';
const AUTHOR_STORE = 'https://www.amazon.com/stores/B.-Floore/author/B0D2DBX9BH';

function amazonUrl(url, tagged) {
  const parsed = new URL(url);
  if (tagged) parsed.searchParams.set('tag', TAG);
  else parsed.searchParams.delete('tag');
  return parsed.href;
}

const assert = (pass, message) => { if (!pass) throw new Error(message); };

assert(amazonUrl('https://www.amazon.com/dp/B0HNWNQ7ZS', true) === 'https://www.amazon.com/dp/B0HNWNQ7ZS?tag=stashandset-20', 'Tag must be added with ? when there is no query.');
assert(amazonUrl('https://www.amazon.com/dp/B0HNWNQ7ZS?ref=ab', true) === 'https://www.amazon.com/dp/B0HNWNQ7ZS?ref=ab&tag=stashandset-20', 'Tag must be added with & when a query already exists.');
assert(amazonUrl('https://www.amazon.com/dp/B0HNWNQ7ZS?tag=stashandset-20', true) === 'https://www.amazon.com/dp/B0HNWNQ7ZS?tag=stashandset-20', 'An existing Associates tag must not be duplicated.');
assert(amazonUrl('https://www.amazon.com/dp/B0HNWNQ7ZS?ref=ab&tag=other-20', true) === 'https://www.amazon.com/dp/B0HNWNQ7ZS?ref=ab&tag=stashandset-20', 'A different tag value must be replaced.');
assert(amazonUrl('https://www.amazon.com/dp/B0HNWNQ7ZS?ref=ab&tag=stashandset-20', false) === 'https://www.amazon.com/dp/B0HNWNQ7ZS?ref=ab', 'Removing the tag must leave other query parameters.');
assert(amazonUrl(AUTHOR_STORE, true) === AUTHOR_STORE + '?tag=' + TAG, 'Author store tag was not appended cleanly.');

const catalog = read('catalog.js');
const app = read('app.js');
const friend = read('friend.js');
new vm.Script(catalog);
new vm.Script(app);
new vm.Script(friend);
const context = {window: {}};
vm.runInNewContext(catalog, context);
const books = context.window.FRIENDLY_BOOKS;
const find = id => books.find(book => book.id === id);

assert(books.length === 10, 'Expected all ten books.');
assert(new Set(books.map(book => book.id)).size === 10, 'Duplicate book ID.');
assert(new Set(books.map(book => book.url)).size === 10, 'Duplicate book destination.');
assert(find('rex').categories.includes('animals') && find('rex').categories.includes('stories'), 'Rex and Billy must appear in both categories.');
assert(find('usa').categories.includes('community') && find('usa').categories.includes('explore'), 'Travel the USA must appear in both categories.');
assert(['scifi', 'fantasy'].every(id => find(id).categories.includes('explore')), 'Both imaginative adventures must be in Explore.');
assert(books.every(book => book.url.includes('tag=' + TAG)), 'Every catalog.js Amazon URL needs the Associates tag.');
assert(!books.some(book => book.isbn), 'No ISBN is recorded in catalog.js. Do not invent one.');
assert(!/isbn/i.test(catalog), 'catalog.js must not contain an invented ISBN.');
assert(books[0].id === 'holidays', 'The newest holiday book must stay first.');
assert(books.every(book => typeof book.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.slug)), 'Every book needs a lowercase slug.');
assert(new Set(books.map(book => book.slug)).size === books.length, 'Duplicate book slug.');
const FORMATS = {Paperback: 'https://schema.org/Paperback', Hardcover: 'https://schema.org/Hardcover'};
const AVAILABILITY = new Set(['https://schema.org/InStock', 'https://schema.org/OutOfStock', 'https://schema.org/PreOrder']);
for (const book of books) {
  const priced = book.price != null || book.priceCurrency != null || book.format != null;
  if (!priced) {
    assert(book.price == null && book.priceCurrency == null, 'A partial price must not be recorded for ' + book.id);
    continue;
  }
  assert(/^\d+\.\d{2}$/.test(book.price), 'Verified price must be a dollars-and-cents string for ' + book.id);
  assert(book.priceCurrency === 'USD', 'Verified priceCurrency must be USD for ' + book.id);
  assert(AVAILABILITY.has(book.availability), 'Verified availability must be a schema.org URL for ' + book.id);
  assert(FORMATS[book.format], 'Verified format is not a known book format for ' + book.id);
}

const disclosure = 'As an Amazon Associate I earn from qualifying purchases.';
assert(app.includes('rel="noopener sponsored"'), 'Book buttons must be sponsored affiliate links.');
assert(app.includes(disclosure), 'The book dialog must show the Associates disclosure.');

let html = read('index.html');
assert(!html.includes('Where shall we go?') && !html.includes('id="worlds"'), 'Removed destination section remains.');
assert(html.includes('data-place="university"') && html.includes('data-place="duckies"'), 'Missing RoboTown discoveries.');
assert(html.includes('the tomorrow-ers') && html.includes('nieces and nephews'), 'Missing author story or dedication.');
assert(!/gumroad|id="printables"|href="#printables"/.test(html), 'Print and Play must remain disabled.');
assert(['id="friend"', 'id="hero-friend"', 'id="friend-line"', 'id="maker-robot"', 'id="print-sheet"'].every(id => html.includes(id)), 'Missing robot friend maker.');
assert(html.includes('Explore the complete FRIENDLY ROBOTS!'), 'Missing noscript fallback.');
assert((html.match(new RegExp(disclosure.replace(/[.]/g, '\\.'), 'g')) || []).length >= 2, 'The disclosure must be visible in the page HTML.');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(match[1]), 'Missing anchor: ' + match[1]);
for (const match of html.matchAll(/data-book="([^"]+)"/g)) assert(find(match[1]), 'Unknown book pin.');
assert(!html.includes('data:image/jpeg;base64,'), 'The hero must not be inlined into the HTML.');
assert(html.includes('href="styles.css"') && html.includes('src="catalog.js"') && html.includes('src="app.js"') && html.includes('src="friend.js"'), 'CSS and scripts must stay separate cacheable files.');
assert(html.includes("assets/robotown.webp"), 'Homepage must reference the WebP hero.');

const hrefs = [...html.matchAll(/href="(https:\/\/www\.amazon\.com[^"]*)"/g)].map(match => match[1]);
assert(hrefs.length === 5, 'Expected five Amazon links in the page HTML (nav, holiday feature, bookshelf, noscript, footer).');
for (const href of hrefs) {
  assert(href === amazonUrl(href, true), 'Amazon link is missing a properly appended tag: ' + href);
  assert(href.includes('rel="sponsored"') || html.includes(`href="${href}" rel="sponsored"`), 'Amazon link must be rel=sponsored: ' + href);
}

const esc = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const categories = {stories:'Story time', imagination:'Magic & imagination', animals:'Animal friends', community:'Our community', explore:'Let\u2019s explore'};
const pageUrl = book => SITE + 'books/' + book.slug + '/';
const imageUrl = book => new URL(book.image, SITE).href;
const GAMES = {
  holidays: {href: '/play/holidays/', label: 'Play HoliBot Match'},
  rex: {href: '/play/rex/', label: 'Play Rex Runs RoboTown'}
};

function offerFor(book) {
  const asin = (book.url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i) || [])[1];
  assert(asin, 'Missing ASIN for ' + book.id);
  const offerUrl = amazonUrl(book.url, true);
  assert(offerUrl.includes('tag=' + TAG), 'Offer url must include the Associates tag.');
  assert(offerUrl.includes('/dp/' + asin), 'Offer url lost its ASIN.');
  const offer = {'@type': 'Offer', url: offerUrl};
  if (book.price) {
    offer.price = book.price;
    offer.priceCurrency = book.priceCurrency;
  }
  if (book.availability) offer.availability = book.availability;
  return {asin, offer};
}

const data = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      name: 'b. floore',
      url: AUTHOR_STORE
    },
    {
      '@type': 'ItemList',
      name: 'FRIENDLY ROBOTS! books',
      numberOfItems: books.length,
      itemListElement: books.map((book, index) => {
        const {asin, offer} = offerFor(book);
        const item = {
          '@type': 'Book',
          name: book.title,
          author: {'@type': 'Person', name: 'b. floore'},
          image: imageUrl(book),
          url: pageUrl(book),
          identifier: {
            '@type': 'PropertyValue',
            propertyID: 'ASIN',
            value: asin
          },
          offers: offer
        };
        if (typeof book.isbn === 'string' && book.isbn.trim()) item.isbn = book.isbn.trim();
        return {
          '@type': 'ListItem',
          position: index + 1,
          item
        };
      })
    }
  ]
};

assert(!JSON.stringify(data).includes('"isbn"'), 'JSON-LD contains an ISBN that is not in catalog.js.');
const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
JSON.parse(json);
const pattern = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
assert(pattern.test(html), 'Homepage is missing the JSON-LD script.');
html = html.replace(pattern, '<script type="application/ld+json">\n' + json + '\n</script>');

function fillMarked(source, name, inner) {
  const start = '<!-- books:' + name + ' -->';
  const end = '<!-- /books:' + name + ' -->';
  const at = source.indexOf(start);
  const until = source.indexOf(end);
  assert(at !== -1 && until > at, 'Missing homepage marker ' + name);
  return source.slice(0, at + start.length) + '\n' + inner + '\n' + source.slice(until);
}
const coverTag = book => `<img src="${esc(book.image)}" alt="${esc(book.title)} - book cover" loading="lazy">`;
for (const book of books) for (const id of book.categories) assert(categories[id], 'Unknown category ' + id + ' on ' + book.id);
const newCards = books.filter(book => !book.featured).slice(0, 2).map(book => `<article class="new-book" style="--book-color:${esc(book.color)}"><button class="new-cover" data-book="${esc(book.id)}" aria-label="Take a peek at ${esc(book.title)}">${coverTag(book)}</button><div class="new-copy"><span class="tag">${esc(book.badge)}</span><h3><a href="/books/${esc(book.slug)}/">${esc(book.short)}<span class="sr-only">, ${esc(book.subtitle)}</span></a></h3><p class="subtitle">${esc(book.subtitle)}</p><p class="description">${esc(book.description)}</p><div class="new-actions"><button class="text-button" data-book="${esc(book.id)}">Take a peek &#8599;</button><a class="text-button" href="/books/${esc(book.slug)}/">Book page<span class="sr-only"> for ${esc(book.title)}</span></a></div></div></article>`).join('\n');
const gridCards = books.map(book => {
  const cats = book.categories.map(id => esc(categories[id])).join(' &middot; ');
  return `<article class="book-card" data-categories="${esc(book.categories.join(' '))}"><button class="book-image" style="--book-color:${esc(book.color)}" data-book="${esc(book.id)}" aria-label="Take a peek at ${esc(book.title)}">${coverTag(book)}</button><span class="book-category">${cats}</span><h3><a href="/books/${esc(book.slug)}/">${esc(book.short)}<span class="sr-only">, ${esc(book.subtitle)}</span></a></h3><p class="subtitle">${esc(book.subtitle)}</p><p class="page-link"><a href="/books/${esc(book.slug)}/">Book page<span class="sr-only"> for ${esc(book.title)}</span></a></p></article>`;
}).join('\n');
html = fillMarked(html, 'new', newCards);
html = fillMarked(html, 'grid', gridCards);
fs.writeFileSync(path.join(root, 'index.html'), html);

function pageDocument(book) {
  const canonical = pageUrl(book);
  const image = imageUrl(book);
  const src = /^https?:\/\//.test(book.image) ? book.image : '/' + book.image.replace(/^\//, '');
  const {offer} = offerFor(book);
  const linked = {
    '@context': 'https://schema.org',
    '@type': ['Book', 'Product'],
    name: book.title,
    image,
    description: book.description,
    author: {'@type': 'Person', name: 'b. floore', url: AUTHOR_STORE},
    url: canonical,
    offers: offer
  };
  if (book.format) linked.bookFormat = FORMATS[book.format];
  const linkedJson = JSON.stringify(linked, null, 2).replace(/</g, '\\u003c');
  const title = book.title + ' | FRIENDLY ROBOTS!';
  const price = book.price ? `<p class="price"><b>$${esc(book.price)}</b>${book.format ? ' ' + esc(book.format) : ''}</p>` : '';
  const game = GAMES[book.id];
  const gameLink = game ? `<a class="button plain" href="${esc(game.href)}">${esc(game.label)} <span aria-hidden="true">&#8594;</span></a>` : '';
  const actions = `<div class="actions"><a class="button" href="${esc(offer.url)}" target="_blank" rel="noopener sponsored">Get this book on Amazon <span aria-hidden="true">&#8599;</span></a>${gameLink}</div>`;
  const amazon = /^https:\/\/m\.media-amazon\.com\//.test(image) ? '<link rel="preconnect" href="https://m.media-amazon.com">\n' : '';
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#153fd0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(book.description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="book">
<meta property="og:site_name" content="FRIENDLY ROBOTS!">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(book.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc('Cover of ' + book.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(book.description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc('Cover of ' + book.title)}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${amazon}<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/books/book.css">
<script type="application/ld+json">
${linkedJson}
</script>
</head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="bar"><a class="brand" href="/"><span class="robot-logo" aria-hidden="true">&#8226;&#7447;&#8226;</span>FRIENDLY ROBOTS!</a><a class="shelf-link" href="/#books">All the books</a></header>
<main id="main"><article class="sheet">
  <div class="cover" style="--book-color:${esc(book.color)}"><img src="${esc(src)}" alt="${esc('Cover of ' + book.title)}"></div>
  <div class="copy">
    <p class="eyebrow">A FRIENDLY ROBOTS! book</p>
    <h1>${esc(book.title)}</h1>
    <p class="by">by <b>b. floore</b></p>
    <p class="desc">${esc(book.description)}</p>
    ${price}
    ${actions}
    <p class="disclosure">Opens Amazon in a new tab. As an Amazon Associate I earn from qualifying purchases.</p>
    <p class="back"><a href="/#books">Back to the bookshelf</a></p>
  </div>
</article></main>
<footer class="foot"><div class="wrap"><span>Adventures in being friendly. Created by b. floore.</span><a href="/#books">The bookshelf</a></div></footer>
</body></html>
`;
}

const booksDir = path.join(root, 'books');
fs.mkdirSync(booksDir, {recursive: true});
const slugs = new Set(books.map(book => book.slug));
for (const entry of fs.readdirSync(booksDir, {withFileTypes: true})) {
  if (entry.isDirectory() && !slugs.has(entry.name)) fs.rmSync(path.join(booksDir, entry.name), {recursive: true, force: true});
}
for (const book of books) {
  const dir = path.join(booksDir, book.slug);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'index.html'), pageDocument(book));
}

const BOOK_LASTMOD = '2026-11-24';
const sitemapLocs = [
  [SITE, '2026-11-24'],
  [SITE + 'play', '2026-11-23'],
  [SITE + 'play/rex/', '2026-11-23'],
  [SITE + 'play/holidays/', '2026-11-23'],
  ...books.map(book => [pageUrl(book), BOOK_LASTMOD])
];
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapLocs.map(([loc, lastmod]) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemapXml);

const robots = read('robots.txt');
const sitemap = read('sitemap.xml');
assert(robots.includes('Allow: /') && robots.includes('Sitemap: https://www.friendlyrobots.online/sitemap.xml'), 'robots.txt must allow crawling and point at the sitemap.');
assert(!/^Disallow:\s*\/(?:play\b.*)?\s*$/im.test(robots), 'robots.txt must not block /play.');
assert(!/^Disallow:\s*\/(?:books\b.*)?\s*$/im.test(robots), 'robots.txt must not block /books.');
function robotsBlocks(urlPath) {
  for (const line of robots.split('\n')) {
    const match = line.match(/^\s*Disallow:\s*(\S*)\s*$/i);
    if (match && match[1] && (urlPath === match[1] || urlPath.startsWith(match[1]))) return match[1];
  }
  return '';
}
for (const page of ['play/index.html', 'play/rex/index.html', 'play/holidays/index.html']) assert(!/noindex/i.test(read(page)), page + ' must not be noindex.');
const hub = read('play/index.html');
assert(hub.includes('href="/play/rex/"') && hub.includes('href="/play/holidays/"'), 'The /play page must link to both games.');
assert([...hub.matchAll(/<img [^>]*alt="[^"]{20,}"/g)].length === 2, 'Each game card on /play needs a screenshot with alt text.');
assert(html.includes('class="nav-play" href="/play"'), 'The top Play link must go to the /play page.');
assert(html.includes('href="/play/rex/"') && html.includes('href="/play/holidays/"'), 'The homepage must link to both games.');
const locs = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(match => match[1]);
assert(JSON.stringify(locs) === JSON.stringify(sitemapLocs.map(([loc]) => loc)), 'Sitemap must list the homepage, /play, both games, and every book page, with no duplicate or asset URLs.');
assert((sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || []).length === locs.length, 'Each sitemap URL needs a lastmod date.');
assert(app.includes('/books/${esc(book.slug)}/'), 'The book dialog must link to the book page.');
for (const book of books) {
  const canonical = pageUrl(book);
  const href = '/books/' + book.slug + '/';
  assert(html.includes('href="' + href + '"'), 'Homepage is missing a link to ' + href);
  assert(locs.includes(canonical), 'Sitemap is missing ' + canonical);
  assert(!robotsBlocks(href), 'robots.txt blocks ' + href);
  const pagePath = path.join('books', book.slug, 'index.html');
  const page = read(pagePath);
  assert(!/noindex/i.test(page), pagePath + ' must not be noindex.');
  assert(!/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(page), pagePath + ' must not contain an email address.');
  assert(!/tel:/i.test(page), pagePath + ' must not use a tel: link.');
  assert(!/904[\s.-]*297[\s.-]*8201/.test(page), pagePath + ' must not contain a phone number.');
  assert(page.includes('<title>' + esc(book.title) + ' | FRIENDLY ROBOTS!</title>'), 'Missing page title for ' + book.id);
  assert(page.includes('name="description" content="' + esc(book.description) + '"'), 'Missing meta description for ' + book.id);
  assert(page.includes('<link rel="canonical" href="' + canonical + '">'), 'Missing canonical for ' + book.id);
  assert(page.includes('property="og:title"') && page.includes('property="og:description"') && page.includes('property="og:url" content="' + canonical + '"') && page.includes('property="og:image" content="' + imageUrl(book) + '"'), 'Missing Open Graph tags for ' + book.id);
  assert(page.includes('name="twitter:card" content="summary_large_image"') && page.includes('name="twitter:title"') && page.includes('name="twitter:description"') && page.includes('name="twitter:image"'), 'Missing Twitter tags for ' + book.id);
  assert(page.includes('>b. floore<'), 'Missing author for ' + book.id);
  assert(page.includes('href="' + amazonUrl(book.url, true) + '"'), 'Missing buy link for ' + book.id);
  if (GAMES[book.id]) assert(page.includes('href="' + GAMES[book.id].href + '"'), 'Missing game link for ' + book.id);
  assert(page.includes('rel="noopener sponsored"'), 'Buy link must be a sponsored affiliate link for ' + book.id);
  const embeddedPage = page.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  assert(embeddedPage, 'Missing JSON-LD for ' + book.id);
  const linked = JSON.parse(embeddedPage[1]);
  const types = [].concat(linked['@type']);
  assert(types.includes('Book') && types.includes('Product'), 'JSON-LD must be a Book and a Product for ' + book.id);
  assert(linked.name === book.title, 'JSON-LD name mismatch for ' + book.id);
  assert(linked.image === imageUrl(book) && linked.image.startsWith('https://'), 'JSON-LD image must be an absolute URL for ' + book.id);
  assert(linked.author && linked.author.name === 'b. floore', 'JSON-LD author mismatch for ' + book.id);
  assert(linked.url === canonical, 'JSON-LD url must be the canonical book page for ' + book.id);
  assert(linked.offers && linked.offers.url === amazonUrl(book.url, true), 'JSON-LD offer url mismatch for ' + book.id);
  assert(linked.offers.availability === book.availability, 'JSON-LD availability mismatch for ' + book.id);
  if (book.price) {
    assert(linked.offers.price === book.price && linked.offers.priceCurrency === book.priceCurrency, 'JSON-LD price mismatch for ' + book.id);
    assert(page.includes('$' + book.price), 'Visible price missing for ' + book.id);
  } else {
    assert(!Object.prototype.hasOwnProperty.call(linked.offers, 'price'), 'Unverified price must be omitted for ' + book.id);
    assert(!page.includes('class="price"'), 'Unverified price must stay off the page for ' + book.id);
  }
  const flat = JSON.stringify(linked);
  assert(!flat.includes('"aggregateRating"') && !flat.includes('"review"'), 'Do not mark up ratings or reviews for ' + book.id);
}
const holiday = find('holidays');
assert(holiday && holiday.featured && html.includes('id="holidays"'), 'Missing the featured holiday book section.');
assert(html.includes(`href="${holiday.url}" rel="sponsored"`), 'The holiday Get the book button must use the catalog URL.');
const holidaySection = html.slice(html.indexOf('id="holidays"'), html.indexOf('id="new"'));
assert(holidaySection.includes('href="/books/' + holiday.slug + '/"'), 'The holiday feature must link to its book page.');
assert(fs.existsSync(path.join(root, 'books/book.css')), 'Missing books/book.css.');
assert(html.includes('src="holidays.js"'), 'The holiday flip-through script is missing.');
const peekImages = [...html.matchAll(/<img[^>]*class="peek-img"[^>]*>/g)].map(match => match[0]);
assert(peekImages.length === 4 && peekImages.every(tag => /alt="[^"]{20,}"/.test(tag) && tag.includes('loading="lazy"')), 'The flip-through needs four lazy images with alt text.');
for (const file of ['favicon.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'assets/og.jpg', 'assets/robotown.webp', 'assets/robotown.jpg', 'holidays.js', ...[...html.matchAll(/(?:src|srcset)="(assets\/holidays\/[^" ]+)/g)].map(match => match[1])]) {
  assert(fs.existsSync(path.join(root, file)), 'Missing ' + file);
}
const og = fs.readFileSync(path.join(root, 'assets/og.jpg'));
let ogSize = null;
for (let i = 2; i < og.length - 8; i++) {
  if (og[i] !== 0xFF) continue;
  const marker = og[i + 1];
  if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
    ogSize = {height: og.readUInt16BE(i + 5), width: og.readUInt16BE(i + 7)};
    break;
  }
  if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) continue;
  i += 2 + og.readUInt16BE(i + 2) - 1;
}
assert(ogSize && ogSize.width === 1200 && ogSize.height === 630, 'Share image must be 1200 by 630.');

const fresh = read('index.html');
const embedded = fresh.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
const parsed = JSON.parse(embedded[1]);
assert(parsed['@graph'][1].itemListElement.length === 10, 'JSON-LD ItemList is incomplete.');
assert(parsed['@graph'][0].name === 'b. floore', 'JSON-LD author name mismatch.');
parsed['@graph'][1].itemListElement.forEach((entry, index) => {
  const book = books[index];
  assert(entry.item.url === pageUrl(book), 'ItemList entry must point at the book page for ' + book.id);
  assert(entry.item.offers.url === amazonUrl(book.url, true), 'ItemList offer must stay the tagged Amazon link for ' + book.id);
  if (book.price) assert(entry.item.offers.price === book.price && entry.item.offers.priceCurrency === book.priceCurrency, 'ItemList price mismatch for ' + book.id);
  else assert(!Object.prototype.hasOwnProperty.call(entry.item.offers, 'price'), 'ItemList must omit an unverified price for ' + book.id);
});
assert(!JSON.stringify(parsed).includes('"aggregateRating"') && !JSON.stringify(parsed).includes('"review"'), 'Homepage JSON-LD must not invent ratings or reviews.');
console.log('Homepage ' + Buffer.byteLength(fresh) + ' bytes. ' + books.length + ' book pages. JSON-LD parses. Associates tag and share image checked.');

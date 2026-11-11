// Local checker for the static site. Vercel serves the committed files as-is
// and does not run this script. After editing catalog.js, run: node build.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const TAG = 'stashandset-20';
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

assert(books.length === 9, 'Expected all nine books.');
assert(new Set(books.map(book => book.id)).size === 9, 'Duplicate book ID.');
assert(new Set(books.map(book => book.url)).size === 9, 'Duplicate book destination.');
assert(find('rex').categories.includes('animals') && find('rex').categories.includes('stories'), 'Rex and Billy must appear in both categories.');
assert(find('usa').categories.includes('community') && find('usa').categories.includes('explore'), 'Travel the USA must appear in both categories.');
assert(['scifi', 'fantasy'].every(id => find(id).categories.includes('explore')), 'Both imaginative adventures must be in Explore.');
assert(books.every(book => book.url.includes('tag=' + TAG)), 'Every catalog.js Amazon URL needs the Associates tag.');
assert(!books.some(book => book.isbn), 'No ISBN is recorded in catalog.js. Do not invent one.');
assert(!/isbn/i.test(catalog), 'catalog.js must not contain an invented ISBN.');

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
assert(hrefs.length === 4, 'Expected four Amazon links in the page HTML (nav, bookshelf, noscript, footer).');
for (const href of hrefs) {
  assert(href === amazonUrl(href, true), 'Amazon link is missing a properly appended tag: ' + href);
  assert(href.includes('rel="sponsored"') || html.includes(`href="${href}" rel="sponsored"`), 'Amazon link must be rel=sponsored: ' + href);
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
        const asin = (book.url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i) || [])[1];
        assert(asin, 'Missing ASIN for ' + book.id);
        const cleanUrl = amazonUrl(book.url, false);
        const offerUrl = amazonUrl(book.url, true);
        assert(!cleanUrl.includes('tag='), 'Book url must stay a clean dp URL.');
        assert(offerUrl.includes('tag=' + TAG), 'Offer url must include the Associates tag.');
        assert(cleanUrl.includes('/dp/' + asin), 'Clean book url lost its ASIN.');
        const item = {
          '@type': 'Book',
          name: book.title,
          author: {'@type': 'Person', name: 'b. floore'},
          image: book.image,
          url: cleanUrl,
          identifier: {
            '@type': 'PropertyValue',
            propertyID: 'ASIN',
            value: asin
          },
          offers: {
            '@type': 'Offer',
            url: offerUrl
          }
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
fs.writeFileSync(path.join(root, 'index.html'), html);

const robots = read('robots.txt');
const sitemap = read('sitemap.xml');
assert(robots.includes('Allow: /') && robots.includes('Sitemap: https://www.friendlyrobots.online/sitemap.xml'), 'robots.txt must allow crawling and point at the sitemap.');
assert(sitemap.includes('<loc>https://www.friendlyrobots.online/</loc>') && !/index\.html|page\.html|friendly-robots/.test(sitemap), 'Sitemap must list only the canonical homepage.');
for (const file of ['favicon.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'assets/og.jpg', 'assets/robotown.webp', 'assets/robotown.jpg']) {
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
assert(parsed['@graph'][1].itemListElement.length === 9, 'JSON-LD ItemList is incomplete.');
assert(parsed['@graph'][0].name === 'b. floore', 'JSON-LD author name mismatch.');
console.log('Homepage ' + Buffer.byteLength(fresh) + ' bytes. JSON-LD parses. Nine books, Associates tag, and share image checked.');

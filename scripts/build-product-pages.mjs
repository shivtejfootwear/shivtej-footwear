// Builds one plain HTML page per active product (so Google can find it by article number and name),
// saves each product's main photo next to it (p/img/), and refreshes sitemap.xml.
// Only product data and product photos are used; no customer data is read or written.
// Run:   node scripts/build-product-pages.mjs
// Test:  node scripts/build-product-pages.mjs --from-file=rows.json [--no-photos]
// The Supabase address and public key are read from index.html, so there is one source of truth.
import { readFile, writeFile, mkdir, readdir, rm, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://shivtejfootwear.com";
const SHOP = {
  name: "Shivtej Footwear",
  address: "Bajaj Finance, Opposite Site, Akluj, Maharashtra 413101, India",
  phone: "+918898900888",
};
const fromFile = process.argv.find((a) => a.startsWith("--from-file="))?.split("=")[1];
const NO_PHOTOS = process.argv.includes("--no-photos");
const IMG_FILE = /^[A-Za-z0-9_.-]+\.(jpg|jpeg|png|webp)$/i;

async function supabaseConfig() {
  // Test only: point at a local fake server instead of Supabase.
  if (process.env.SUPABASE_URL_OVERRIDE) return { url: process.env.SUPABASE_URL_OVERRIDE, key: "test" };
  const html = await readFile(path.join(ROOT, "index.html"), "utf8");
  const url = html.match(/const SB_URL="([^"]+)"/)?.[1];
  const key = html.match(/const SB_KEY="([^"]+)"/)?.[1];
  if (!url || !key) throw new Error("Supabase settings not found in index.html");
  return { url, key };
}

async function loadRows(cfg) {
  if (fromFile) return JSON.parse(await readFile(fromFile, "utf8"));
  const r = await fetch(`${cfg.url}/rest/v1/rpc/site_list_products`, {
    method: "POST",
    headers: { apikey: cfg.key, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!r.ok) throw new Error(`site_list_products failed (${r.status})`);
  return r.json();
}

// Product photos are private (Backblaze B2). The b2-media-url function gives a short signed link
// for a file that belongs to the product. The photo is then saved here, so Google can read it.
async function fetchPhoto(cfg, productId, file) {
  const r = await fetch(`${cfg.url}/functions/v1/b2-media-url?product_id=${encodeURIComponent(productId)}&file=${encodeURIComponent(file)}`, {
    headers: { apikey: cfg.key },
  });
  if (!r.ok) throw new Error(`signed link failed (${r.status})`);
  const { url } = await r.json();
  const img = await fetch(url);
  if (!img.ok) throw new Error(`photo download failed (${img.status})`);
  return Buffer.from(await img.arrayBuffer());
}

// Width and height of a saved photo (JPEG, PNG or WebP), read from the file header.
// The page then reserves the photo's space before it loads, so nothing jumps.
function imageSize(buf) {
  try {
    if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1];
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
        const len = buf.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
        i += 2 + len;
      }
    }
    if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      const kind = buf.toString("ascii", 12, 16);
      if (kind === "VP8X") return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
      if (kind === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
      if (kind === "VP8L") { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
    }
  } catch {}
  return null;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const numSort = (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0);
const slugify = (s) => String(s ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const rupees = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

// Same rules as the website: colours and sizes come from the product row; stock is per size.
function toProduct(r) {
  const colours = (Array.isArray(r.colours) ? r.colours : [])
    .map((c) => {
      const name = String(typeof c === "object" ? c.name || c.colour || "" : c).trim();
      const sizes = (c && Array.isArray(c.sizes) ? c.sizes : []).map((s) =>
        typeof s === "object" ? { size: String(s.size), qty: Math.max(0, Number(s.qty) || 0) } : { size: String(s), qty: 0 });
      const images = c && Array.isArray(c.images) ? c.images : [];
      return { name, sizes, images };
    })
    .filter((c) => c.name);
  const sizes = [...new Set(colours.flatMap((c) => c.sizes.filter((s) => s.qty > 0).map((s) => s.size)))].sort(numSort);

  // The first photo the website shows: the first colour's photos, then the product's own photos. Videos are skipped.
  const allImages = [...(colours[0]?.images ?? []), ...(Array.isArray(r.images) ? r.images : [])];
  const fullName = allImages.find((x) => typeof x === "string" && IMG_FILE.test(x.split("/").pop())) || "";
  const base = fullName.split("/").pop();

  return {
    id: String(r.id),
    name: String(r.name || "").trim(),
    article: String(r.article || "").trim(),
    brand: String(r.brand || "").trim(),
    category: String(r.category || "").split(",").map((x) => x.trim()).filter(Boolean).join(", "),
    price: Number(r.price) || 0,
    mrp: Number(r.mrp) || Number(r.price) || 0,
    desc: String(r.description || "").trim(),
    colours: [...new Set(colours.map((c) => c.name))],
    sizes,
    inStock: sizes.length > 0,
    photoFile: fullName && IMG_FILE.test(base) ? fullName : "",
    photoBase: fullName && IMG_FILE.test(base) ? base : "",
  };
}

// Address like /p/eeken-6102.html. If two products give the same address, the second gets -2, -3 ...
function assignSlugs(products) {
  const used = new Set(["index"]); // /p/index.html is the all-products page
  for (const p of products) {
    const base = slugify([p.brand, p.article || p.name].filter(Boolean).join(" ")) || `product-${slugify(p.id)}`;
    let slug = base;
    let n = 2;
    while (used.has(slug)) slug = `${base}-${n++}`;
    used.add(slug);
    p.slug = slug;
  }
}

// Saves the main photo of each product to p/img/. Already saved photos are not downloaded again.
// A failed photo is skipped (the page is still built). Photos no longer used are removed.
async function savePhotos(cfg, products) {
  const imgDir = path.join(ROOT, "p", "img");
  await mkdir(imgDir, { recursive: true });
  const keep = new Set();
  for (const p of products) {
    if (!p.photoBase) continue;
    const local = path.join(imgDir, p.photoBase);
    try {
      await access(local);
    } catch {
      try {
        await writeFile(local, await fetchPhoto(cfg, p.id, p.photoFile));
        console.log(`photo saved: ${p.photoBase}`);
      } catch (e) {
        console.warn(`photo skipped for ${p.slug}: ${e.message}`);
        p.photoBase = "";
        continue;
      }
    }
    keep.add(p.photoBase);
    p.photoSize = imageSize(await readFile(local));
  }
  for (const f of await readdir(imgDir)) {
    if (!keep.has(f)) await rm(path.join(imgDir, f));
  }
}

const headOf = (p) => [p.brand, p.article || p.name].filter(Boolean).join(" ");
const sizeAttr = (p) => (p.photoSize ? ` width="${p.photoSize.w}" height="${p.photoSize.h}"` : "");

// One small product card (link + photo + name + price). Used on product pages and the all-products page.
function cardHtml(p) {
  return `<li><a href="/p/${esc(p.slug)}.html">${p.photoBase ? `<img src="/p/img/${esc(p.photoBase)}"${sizeAttr(p)} alt="${esc(headOf(p))}" loading="lazy">` : `<i class="nop"></i>`}<span>${esc(headOf(p))}</span>${p.price ? `<b>${rupees(p.price)}</b>` : ""}</a></li>`;
}

// Up to 8 other products: same category first, then the rest. Gives every product page links from other pages.
function relatedOf(p, products) {
  const catsOf = (x) => x.category.toLowerCase().split(", ").filter(Boolean);
  const cats = new Set(catsOf(p));
  const others = products.filter((o) => o !== p);
  const same = others.filter((o) => catsOf(o).some((c) => cats.has(c)));
  const rest = others.filter((o) => !same.includes(o));
  return [...same, ...rest].slice(0, 8);
}

const CARD_CSS = `.cards{list-style:none;padding:0;margin:8px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.cards a{display:block;color:#222;text-decoration:none;border:1px solid #eee;border-radius:8px;padding:8px;font-size:14px}
.cards img{display:block;width:100%;height:auto;border-radius:6px;margin-bottom:6px}
.cards b{display:block;margin-top:2px}
.cards .nop{display:block;aspect-ratio:3/4;background:#f3f3f3;border-radius:6px;margin-bottom:6px}`;

function pageHtml(p, products) {
  // Title = brand + article only (the product name is no longer used). Falls back to the name if there is no article.
  const head = headOf(p);
  const url = `${SITE}/p/${p.slug}.html`;
  const related = relatedOf(p, products);
  const title = `${head} | Shivtej Footwear, Akluj`;
  const metaDesc = `Buy ${head} online from Shivtej Footwear, Akluj. ${p.price ? rupees(p.price) + ". " : ""}${p.inStock ? `Sizes: ${p.sizes.join(", ")}.` : "Check the website for stock."}`.slice(0, 158);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: head,
    image: p.photoBase ? `${SITE}/p/img/${p.photoBase}` : undefined,
    sku: p.article || p.id,
    brand: { "@type": "Brand", name: p.brand || SHOP.name },
    category: p.category || undefined,
    color: p.colours.join(", ") || undefined,
    description: metaDesc,
    url,
    ...(p.price
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "INR",
            price: p.price,
            availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: SHOP.name },
          },
        }
      : {}),
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:url" content="${esc(url)}">
${p.photoBase ? `<meta property="og:image" content="${esc(`${SITE}/p/img/${p.photoBase}`)}">` : ""}
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#222;background:#fff;line-height:1.5}
header{padding:12px 16px;border-bottom:1px solid #eee}
header a{color:#222;text-decoration:none;font-weight:700}
main{max-width:720px;margin:0 auto;padding:16px}
nav{font-size:14px;color:#666;margin-bottom:12px}
nav a{color:#666}
.pphoto{display:block;width:100%;max-width:520px;height:auto;border-radius:8px;margin:0 0 8px}
h1{font-size:24px;margin:8px 0}
.price{font-size:20px;font-weight:700;margin:8px 0}
.price s{color:#888;font-weight:400;font-size:16px}
.meta{font-size:15px;margin:4px 0}
.btn{display:inline-block;margin-top:12px;padding:12px 18px;background:#222;color:#fff;border-radius:6px;text-decoration:none}
footer{font-size:14px;color:#555;border-top:1px solid #eee;margin-top:24px;padding:16px}
h2{font-size:18px;margin:28px 0 4px}
${CARD_CSS}
</style>
</head>
<body>
<header><a href="/">Shivtej Footwear, Akluj</a></header>
<main>
<nav><a href="/">Home</a> &rsaquo; <a href="/p/">All products</a> &rsaquo; ${esc(head)}</nav>
${p.photoBase ? `<img class="pphoto" src="/p/img/${esc(p.photoBase)}"${sizeAttr(p)} alt="${esc(head)}">` : ""}
${p.price ? `<p class="price">${p.mrp > p.price ? `MRP <s>${rupees(p.mrp)}</s> ` : ""}${rupees(p.price)}</p>` : ""}
<h1>${esc(head)}</h1>
${p.article ? `<p class="meta"><strong>Article:</strong> ${esc(p.article)}</p>` : ""}
${p.brand ? `<p class="meta"><strong>Brand:</strong> ${esc(p.brand)}</p>` : ""}
${p.category ? `<p class="meta"><strong>Category:</strong> ${esc(p.category)}</p>` : ""}
${p.colours.length ? `<p class="meta"><strong>Colours:</strong> ${esc(p.colours.join(", "))}</p>` : ""}
<p class="meta"><strong>${p.inStock ? "Sizes in stock:" : "Stock:"}</strong> ${p.inStock ? esc(p.sizes.join(", ")) : "Currently out of stock"}</p>
${p.desc ? `<p>${esc(p.desc).replace(/\n/g, "<br>")}</p>` : ""}
<p><a class="btn" href="/">Shop on the website</a></p>
${related.length ? `<h2>More products</h2>\n<ul class="cards">${related.map(cardHtml).join("")}</ul>\n<p><a href="/p/">See all products</a></p>` : ""}
</main>
<footer>${esc(SHOP.name)}, ${esc(SHOP.address)}. Phone: ${esc(SHOP.phone)}</footer>
</body>
</html>
`;
}

// /p/ : one plain page that links to every product, grouped by category.
function allProductsHtml(products) {
  const url = `${SITE}/p/`;
  const title = "All products | Shivtej Footwear, Akluj";
  const desc = `All footwear and luggage at Shivtej Footwear, Akluj: ${products.length} products for men, women, kids and seniors, with price and sizes in stock.`.slice(0, 158);
  const groups = new Map();
  for (const p of products) {
    const raw = p.category.split(", ")[0] || "Other";
    const key = raw.toLowerCase(); // "Men" and "MEN" are one group
    if (!groups.has(key)) groups.set(key, { label: raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase(), list: [] });
    groups.get(key).list.push(p);
  }
  const sections = [...groups.values()]
    .sort((a, b) => (a.label === "Other") - (b.label === "Other") || a.label.localeCompare(b.label))
    .map(({ label: c, list }) => `<h2>${esc(c)}</h2>\n<ul class="cards">${list.map(cardHtml).join("")}</ul>`)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<style>
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#222;background:#fff;line-height:1.5}
header{padding:12px 16px;border-bottom:1px solid #eee}
header a{color:#222;text-decoration:none;font-weight:700}
main{max-width:960px;margin:0 auto;padding:16px}
nav{font-size:14px;color:#666;margin-bottom:12px}
nav a{color:#666}
h1{font-size:24px;margin:8px 0}
h2{font-size:18px;margin:24px 0 4px}
footer{font-size:14px;color:#555;border-top:1px solid #eee;margin-top:24px;padding:16px}
${CARD_CSS}
</style>
</head>
<body>
<header><a href="/">Shivtej Footwear, Akluj</a></header>
<main>
<nav><a href="/">Home</a> &rsaquo; All products</nav>
<h1>All products</h1>
<p>Footwear and luggage from Shivtej Footwear, Akluj. Open a product to see its price, colours and sizes in stock, then buy it on the website.</p>
${sections}
<p><a class="btn" href="/">Shop on the website</a></p>
</main>
<footer>${esc(SHOP.name)}, ${esc(SHOP.address)}. Phone: ${esc(SHOP.phone)}</footer>
</body>
</html>
`;
}

async function main() {
  const cfg = await supabaseConfig();
  const rows = await loadRows(cfg);
  // Safety: an empty or failed read must never delete the existing pages.
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("No products returned; existing pages were not changed");

  const products = rows.map(toProduct).filter((p) => p.id && (p.name || p.article));
  assignSlugs(products);

  if (!NO_PHOTOS) await savePhotos(cfg, products);
  else for (const p of products) p.photoBase = "";

  const dir = path.join(ROOT, "p");
  await mkdir(dir, { recursive: true });
  const wanted = new Set(products.map((p) => `${p.slug}.html`));
  wanted.add("index.html");
  for (const f of await readdir(dir)) {
    if (f.endsWith(".html") && !wanted.has(f)) await rm(path.join(dir, f));
  }
  for (const p of products) await writeFile(path.join(dir, `${p.slug}.html`), pageHtml(p, products), "utf8");
  await writeFile(path.join(dir, "index.html"), allProductsHtml(products), "utf8");

  const urls = [`${SITE}/`, `${SITE}/p/`, ...products.map((p) => `${SITE}/p/${p.slug}.html`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(u)}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  await writeFile(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");
  console.log(`Wrote ${products.length} product pages and sitemap.xml (${urls.length} URLs).`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

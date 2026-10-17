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
  const used = new Set();
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
  }
  for (const f of await readdir(imgDir)) {
    if (!keep.has(f)) await rm(path.join(imgDir, f));
  }
}

function pageHtml(p) {
  // Title = brand + article only (the product name is no longer used). Falls back to the name if there is no article.
  const head = [p.brand, p.article || p.name].filter(Boolean).join(" ");
  const url = `${SITE}/p/${p.slug}.html`;
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
</style>
</head>
<body>
<header><a href="/">Shivtej Footwear, Akluj</a></header>
<main>
<nav><a href="/">Home</a> &rsaquo; ${esc(head)}</nav>
${p.photoBase ? `<img class="pphoto" src="/p/img/${esc(p.photoBase)}" alt="${esc(head)}">` : ""}
${p.price ? `<p class="price">${p.mrp > p.price ? `MRP <s>${rupees(p.mrp)}</s> ` : ""}${rupees(p.price)}</p>` : ""}
<h1>${esc(head)}</h1>
${p.article ? `<p class="meta"><strong>Article:</strong> ${esc(p.article)}</p>` : ""}
${p.brand ? `<p class="meta"><strong>Brand:</strong> ${esc(p.brand)}</p>` : ""}
${p.category ? `<p class="meta"><strong>Category:</strong> ${esc(p.category)}</p>` : ""}
${p.colours.length ? `<p class="meta"><strong>Colours:</strong> ${esc(p.colours.join(", "))}</p>` : ""}
<p class="meta"><strong>${p.inStock ? "Sizes in stock:" : "Stock:"}</strong> ${p.inStock ? esc(p.sizes.join(", ")) : "Currently out of stock"}</p>
${p.desc ? `<p>${esc(p.desc).replace(/\n/g, "<br>")}</p>` : ""}
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
  for (const f of await readdir(dir)) {
    if (f.endsWith(".html") && !wanted.has(f)) await rm(path.join(dir, f));
  }
  for (const p of products) await writeFile(path.join(dir, `${p.slug}.html`), pageHtml(p), "utf8");

  const urls = [`${SITE}/`, ...products.map((p) => `${SITE}/p/${p.slug}.html`)];
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

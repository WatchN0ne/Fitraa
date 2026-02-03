"use strict";

/* ========= Shopify (optional) ========= */
const SHOPIFY = {
  domain: "YOUR_SHOPIFY_DOMAIN",
  storefrontToken: "YOUR_STOREFRONT_ACCESS_TOKEN",
  apiVersion: "2025-10",
  variants: {
    tallow: "gid://shopify/ProductVariant/XXXXXXXXXXXX",
    "blackseed-soap": "gid://shopify/ProductVariant/YYYYYYYYYYYY",
    "rosewater-spray": "gid://shopify/ProductVariant/ZZZZZZZZZZZZ"
  }
};

const PRODUCTS = {
  tallow: {
    sku: "tallow",
    title: "Halal Beef Tallow",
    price: 24.90,
    img: "04c964c5-dc5d-4dab-bede-fd05d2bae3db.png",
    tag: "signature",
    desc: "Warm comfort. Barrier glow. Blue glass signature.",
    text: [
      "Ein stilles Produkt — warm, schützend, luxuriös ohne Lärm.",
      "Halal ist Haltung. Nicht Marketing."
    ]
  },
  "blackseed-soap": {
    sku: "blackseed-soap",
    title: "Schwarzkümmelseife",
    price: 9.90,
    img: "0e04dcfa-24f9-44bc-ba14-808b8ef6b378.png",
    tag: "cleanse",
    desc: "Clean start. Calm routine. Minimal.",
    text: [
      "Reinigung ohne Stress. Klar und ruhig.",
      "Für Tage, an denen du Einfachheit brauchst."
    ]
  },
  "rosewater-spray": {
    sku: "rosewater-spray",
    title: "Rosenwasser Spray",
    price: 14.90,
    img: "8d7e4363-49bd-486d-aa06-bd079c970d2b.png",
    tag: "mist",
    desc: "Mist refresh. Subtle reset.",
    text: [
      "Ein Reset zwischen Momenten. Leise, klar.",
      "Wie Luft — aber auf der Haut."
    ]
  }
};

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const storage = {
  get(k, fb){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};

const STATE = {
  cart: storage.get("fitraa_cart_v6", []), // [{sku, qty}]
  modalSku: null
};

document.addEventListener("DOMContentLoaded", () => {
  $("#year") && ($("#year").textContent = String(new Date().getFullYear()));

  bindGlobalUI();
  mountHeaderScrollState();
  mountReveal();
  mountScrollZoom();
  mountSmartVideo();
  mountMagnetic();
  mountScrollBar();
  mountSwitches();

  renderCart();
  updateCheckoutHint();

  if (document.body.dataset.page === "products") mountProductsPage();
  if (document.body.dataset.page === "index") mountIndexPage();
});

/* ===== Global UI (delegation => unkaputtbar) ===== */
function bindGlobalUI(){
  document.addEventListener("click", (e) => {
    const t = e.target;

    // Cart open
    if (t.closest("#openCart") || t.closest("#openCart2")) { openCart(); return; }

    // Cart close (only backdrop / close button)
    if (t.closest("#closeCart")) { closeCart(); return; }
    if (t.closest("#drawerBackdrop")) { closeCart(); return; }

    // Clear
    if (t.closest("#clearCart")) {
      STATE.cart = [];
      persistCart();
      renderCart();
      return;
    }

    // Checkout
    if (t.closest("#checkoutBtn") || t.closest("#checkoutInline")) { checkout(); return; }

    // Modal close
    if (t.closest("#closeModal") || t.closest("#modalBackdrop") || t.closest("#modalBack")) { closeModal(); return; }

    // Modal add
    if (t.closest("#modalAdd")) {
      if (STATE.modalSku) addToCart(STATE.modalSku, 1);
      closeModal();
      return;
    }

    // Legal open/close
    if (t.closest("#openLegal")) { openLegal(); return; }
    if (t.closest("#closeLegal") || t.closest("#closeLegal2") || t.closest("#legalBackdrop")) { closeLegal(); return; }
  });

  // Prevent clicks inside cart panel from closing (extra safety)
  $("#drawer .drawer__panel")?.addEventListener("click", (e) => e.stopPropagation());
  $("#modal .modal__panel")?.addEventListener("click", (e) => e.stopPropagation());
  $("#legal .modal__panel")?.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){ closeCart(); closeModal(); closeLegal(); }
  });
}

/* ===== Index specific ===== */
function mountIndexPage(){
  $("#openTallowModal")?.addEventListener("click", () => openModal("tallow"));
  $("#addTallow")?.addEventListener("click", () => addToCart("tallow", 1));
  $("#addTallow2")?.addEventListener("click", () => addToCart("tallow", 1));
}

/* ===== Switch (Atelier) ===== */
function mountSwitches(){
  const root = document.body;
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pane]");
    if (!btn) return;
    const paneId = btn.dataset.pane;
    const group = btn.closest(".atelier__media") || document;
    if (!paneId) return;

    group.querySelectorAll(".switch__btn").forEach(b => {
      b.classList.toggle("isOn", b === btn);
      b.setAttribute("aria-selected", String(b === btn));
    });
    group.querySelectorAll(".pane").forEach(p => p.classList.toggle("isOn", p.id === paneId));

    mountReveal();
    mountScrollZoom();
    mountMagnetic();
    mountSmartVideo();
  });
}

/* ===== Products page ===== */
function mountProductsPage(){
  const grid = $("#productsGrid");
  if (!grid) return;

  renderProducts(Object.values(PRODUCTS));
  mountReveal(); mountScrollZoom(); mountMagnetic();

  // Filter tabs
  $$(".tabs__btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tabs__btn").forEach(b => b.classList.remove("isOn"));
      btn.classList.add("isOn");
      btn.setAttribute("aria-selected", "true");
      $$(".tabs__btn").filter(b => b !== btn).forEach(b => b.setAttribute("aria-selected","false"));
      applyProductsFilter(btn.dataset.filter || "all", ($("#searchField")?.value||"").trim().toLowerCase());
    });
  });

  // Search
  $("#searchField")?.addEventListener("input", (e) => {
    const q = String(e.target.value || "").trim().toLowerCase();
    const active = $(".tabs__btn.isOn")?.dataset.filter || "all";
    applyProductsFilter(active, q);
  });

  // Card actions
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const sku = card.dataset.sku;
    const b = e.target.closest("button");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "open") openModal(sku);
    if (act === "add") addToCart(sku, 1);
  });

  function applyProductsFilter(filter, q){
    let list = Object.values(PRODUCTS);
    if (filter !== "all") list = list.filter(p => p.tag === filter);
    if (q) list = list.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      p.tag.toLowerCase().includes(q)
    );
    renderProducts(list);
    mountReveal(); mountScrollZoom(); mountMagnetic();
  }

  function renderProducts(list){
    grid.innerHTML = list.map(p => `
      <article class="card reveal zoomTarget" data-zoom="1.04" data-sku="${p.sku}">
        <div class="card__media" data-reveal="clip">
          <img loading="lazy" decoding="async" src="${p.img || premiumPlaceholder(p.title)}" alt="${p.title}">
          <div class="sheen" aria-hidden="true"></div>
        </div>
        <div class="card__body">
          <div class="card__top">
            <h3 class="card__title">${p.title}</h3>
            <div class="card__price">${money(p.price)}</div>
          </div>
          <div class="card__desc">${p.desc}</div>
          <div class="card__actions">
            <button class="link" data-act="open" type="button">Details</button>
            <button class="link link--ink" data-act="add" type="button">Add</button>
          </div>
        </div>
      </article>
    `).join("");
  }
}

/* ===== Reveals ===== */
function mountReveal(){
  const els = $$(".reveal:not(.is-in)");
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    for (const en of entries){
      if (en.isIntersecting){
        en.target.classList.add("is-in");
        const clip = en.target.matches?.('[data-reveal="clip"]') ? en.target : en.target.querySelector?.('[data-reveal="clip"]');
        if (clip) clip.classList.add("is-in");
        io.unobserve(en.target);
      }
    }
  }, { threshold: 0.15 });

  els.forEach(el => io.observe(el));
}

/* ===== Scroll Zoom (smooth, performant) ===== */
function mountScrollZoom(){
  const targets = $$(".zoomTarget");
  if (!targets.length) return;

  let ticking = false;
  function update(){
    ticking = false;

    const vh = window.innerHeight || 800;
    for (const el of targets){
      const rect = el.getBoundingClientRect();
      const max = Number(el.dataset.zoom || 1.06);

      const visible = Math.max(0, Math.min(vh, rect.bottom) - Math.max(0, rect.top));
      const denom = Math.min(vh, Math.max(1, rect.height));
      const ratio = Math.max(0, Math.min(1, visible / denom));

      const z = 1 + (max - 1) * (ratio * 0.85);
      el.style.setProperty("--z", z.toFixed(4));
    }
  }

  function onScroll(){
    if (!ticking){
      ticking = true;
      requestAnimationFrame(update);
    }
  }
  window.addEventListener("scroll", onScroll, { passive:true });
  window.addEventListener("resize", onScroll, { passive:true });
  update();
}

/* ===== Smart video play/pause ===== */
function mountSmartVideo(){
  const vids = $$("video[data-smartvideo]");
  if (!vids.length) return;

  const io = new IntersectionObserver((entries) => {
    for (const en of entries){
      const v = en.target;
      if (en.isIntersecting) v.play().catch(()=>{});
      else v.pause();
    }
  }, { threshold: 0.2 });

  vids.forEach(v => io.observe(v));
}

/* ===== Magnetic hover (subtle) ===== */
function mountMagnetic(){
  const items = $$(".magnetic");
  if (!items.length) return;

  const strength = 10;
  items.forEach(el => {
    if (el.__magBound) return;
    el.__magBound = true;

    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--mx", `${x * strength}px`);
      el.style.setProperty("--my", `${y * strength}px`);
    }, { passive:true });

    el.addEventListener("mouseleave", () => {
      el.style.setProperty("--mx", `0px`);
      el.style.setProperty("--my", `0px`);
    }, { passive:true });
  });
}

/* ===== Scroll progress bar (hero) ===== */
function mountScrollBar(){
  const bar = $("#scrollBar");
  if (!bar) return;

  let ticking = false;
  function update(){
    ticking = false;
    const doc = document.documentElement;
    const max = (doc.scrollHeight - doc.clientHeight) || 1;
    const p = Math.max(0, Math.min(1, (window.scrollY || 0) / max));
    bar.style.width = `${(p*100).toFixed(2)}%`;
  }
  function onScroll(){
    if (!ticking){
      ticking = true;
      requestAnimationFrame(update);
    }
  }
  window.addEventListener("scroll", onScroll, { passive:true });
  update();
}

/* ===== Header scroll state ===== */
function mountHeaderScrollState(){
  const hdr = $("#hdr");
  if (!hdr) return;

  const onScroll = () => hdr.classList.toggle("is-scrolled", (window.scrollY || 0) > 8);
  window.addEventListener("scroll", onScroll, { passive:true });
  onScroll();
}

/* ===== Cart ===== */
function persistCart(){ storage.set("fitraa_cart_v6", STATE.cart); }

function money(n){
  const fixed = (Math.round(n * 100) / 100).toFixed(2);
  return fixed.replace(".", ",") + " €";
}
function cartCount(){ return STATE.cart.reduce((a,b)=>a+b.qty,0); }
function cartSubtotal(){
  let sum = 0;
  for (const line of STATE.cart){
    const p = PRODUCTS[line.sku];
    if (p) sum += p.price * line.qty;
  }
  return sum;
}

function addToCart(sku, qty){
  const p = PRODUCTS[sku];
  if (!p) return;

  const line = STATE.cart.find(x=>x.sku===sku);
  if (line) line.qty += qty;
  else STATE.cart.push({ sku, qty });

  persistCart();
  renderCart();
  openCart();
}

function setQty(sku, qty){
  const line = STATE.cart.find(x=>x.sku===sku);
  if (!line) return;
  line.qty = Math.max(1, qty);
  persistCart();
  renderCart();
}

function removeLine(sku){
  STATE.cart = STATE.cart.filter(x=>x.sku!==sku);
  persistCart();
  renderCart();
}

function renderCart(){
  $("#cartCount") && ($("#cartCount").textContent = String(cartCount()));
  $("#cartSubtotal") && ($("#cartSubtotal").textContent = money(cartSubtotal()));

  const wrap = $("#cartItems");
  if (!wrap) return;

  wrap.innerHTML = "";
  if (STATE.cart.length === 0){
    wrap.innerHTML = `<div class="muted">Cart is empty.</div>`;
    return;
  }

  for (const line of STATE.cart){
    const p = PRODUCTS[line.sku];
    if (!p) continue;

    const row = document.createElement("div");
    row.className = "cartItem";
    row.innerHTML = `
      <div class="thumb"><img loading="lazy" decoding="async" src="${p.img || premiumPlaceholder(p.title)}" alt=""></div>
      <div>
        <div class="cartTitle">${p.title}</div>
        <div class="cartMeta">${money(p.price)} • ${line.sku}</div>

        <div class="qtyRow">
          <button class="qtyBtn" data-act="dec" type="button" aria-label="minus">−</button>
          <div class="qtyVal">${line.qty}</div>
          <button class="qtyBtn" data-act="inc" type="button" aria-label="plus">+</button>
          <span class="muted" style="margin-left:auto">${money(p.price * line.qty)}</span>
        </div>

        <div style="margin-top:10px; display:flex; justify-content:flex-end;">
          <button class="removeBtn" data-act="rm" type="button">Remove</button>
        </div>
      </div>
    `;

    row.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "dec") setQty(line.sku, line.qty - 1);
      if (act === "inc") setQty(line.sku, line.qty + 1);
      if (act === "rm") removeLine(line.sku);
    });

    wrap.appendChild(row);
  }
}

function openCart(){
  const d = $("#drawer");
  if (!d) return;
  d.classList.add("isOpen");
  d.setAttribute("aria-hidden","false");
}
function closeCart(){
  const d = $("#drawer");
  if (!d) return;
  d.classList.remove("isOpen");
  d.setAttribute("aria-hidden","true");
}

/* ===== Product Modal ===== */
function openModal(sku){
  const p = PRODUCTS[sku];
  if (!p) return;
  STATE.modalSku = sku;

  $("#modalTitle").textContent = p.title;
  $("#modalBody").innerHTML = `
    <div class="modalGrid">
      <div class="modalMedia">
        <img loading="lazy" decoding="async" src="${p.img || premiumPlaceholder(p.title)}" alt="${p.title}">
      </div>
      <div class="modalText">
        <div class="kicker kicker--muted">FITRAA</div>
        <p class="muted" style="margin-top:10px;">${p.desc}</p>
        <p>${p.text[0]}</p>
        <p>${p.text[1]}</p>
        <div class="rowBetween" style="margin-top:14px;">
          <strong style="font-size:18px;">${money(p.price)}</strong>
          <span class="muted">secure checkout</span>
        </div>
      </div>
    </div>
  `;

  const m = $("#modal");
  m.classList.add("isOpen");
  m.setAttribute("aria-hidden","false");
}

function closeModal(){
  const m = $("#modal");
  if (!m) return;
  m.classList.remove("isOpen");
  m.setAttribute("aria-hidden","true");
  STATE.modalSku = null;
}

/* ===== Legal Modal ===== */
function openLegal(){
  const m = $("#legal");
  if (!m) return;
  m.classList.add("isOpen");
  m.setAttribute("aria-hidden","false");
}
function closeLegal(){
  const m = $("#legal");
  if (!m) return;
  m.classList.remove("isOpen");
  m.setAttribute("aria-hidden","true");
}

/* ===== Checkout ===== */
function isShopifyConfigured(){
  return (
    SHOPIFY.domain && SHOPIFY.domain !== "YOUR_SHOPIFY_DOMAIN" &&
    SHOPIFY.storefrontToken && SHOPIFY.storefrontToken !== "YOUR_STOREFRONT_ACCESS_TOKEN"
  );
}
function updateCheckoutHint(){
  const hint = $("#checkoutHint");
  if (!hint) return;
  hint.textContent = isShopifyConfigured()
    ? "Checkout via Shopify Storefront API."
    : "Demo Checkout aktiv (Shopify noch nicht gesetzt).";
}
async function checkout(){
  if (STATE.cart.length === 0){ openCart(); return; }
  if (!isShopifyConfigured()){ demoCheckout(); return; }
  await checkoutShopify();
}
function demoCheckout(){
  const lines = STATE.cart.map(l => {
    const p = PRODUCTS[l.sku];
    return `${p.title} × ${l.qty} — ${money(p.price * l.qty)}`;
  }).join("\n");
  alert(
    "DEMO CHECKOUT\n\n" +
    lines + "\n\nSubtotal: " + money(cartSubtotal()) +
    "\n\nSobald du Shopify Domain/Token/VariantIDs setzt, geht es automatisch in echten Checkout."
  );
}
async function checkoutShopify(){
  const lines = STATE.cart.map(line => {
    const variantId = SHOPIFY.variants[line.sku];
    if (!variantId) throw new Error(`No Variant ID for ${line.sku}`);
    return { merchandiseId: variantId, quantity: line.qty };
  });
  try{
    const url = await shopifyCartCreate(lines);
    window.location.assign(url);
  }catch(err){
    console.error(err);
    alert("Checkout error. Prüfe Shopify Token / Variant IDs (console).");
  }
}
async function shopifyGraphQL(query, variables){
  const url = `https://${SHOPIFY.domain}/api/${SHOPIFY.apiVersion}/graphql.json`;
  const res = await fetch(url, {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY.storefrontToken
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}
async function shopifyCartCreate(lines){
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { checkoutUrl }
        userErrors { message }
      }
    }
  `;
  const data = await shopifyGraphQL(query, { input:{ lines } });
  const errs = data?.cartCreate?.userErrors || [];
  if (errs.length) throw new Error(errs.map(e=>e.message).join(" | "));
  return data.cartCreate.cart.checkoutUrl;
}

/* ===== Premium placeholder ===== */
function premiumPlaceholder(label){
  const svg =
`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
  <defs>
    <radialGradient id="g" cx="28%" cy="20%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#eef1f6" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#0b1b2b" stop-opacity="0.92"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="90" y="110" width="1020" height="980" fill="none" stroke="#ffffff" stroke-opacity="0.20"/>
  <text x="110" y="190" font-family="Arial Narrow, Arial" font-size="34" fill="#ffffff" fill-opacity="0.82" letter-spacing="8">${escapeXml(label || "FITRAA")}</text>
  <text x="110" y="240" font-family="Arial Narrow, Arial" font-size="14" fill="#ffffff" fill-opacity="0.62" letter-spacing="4">PLACEHOLDER</text>
</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
function escapeXml(s){
  return String(s).replace(/[<>&'"]/g, (c) => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;"
  }[c]));
}










import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import AuthPanel from "./components/AuthPanel";
import { supabase } from "./lib/supabase";
import "./App.css";

// ======================================================
// EDIT HERE: TEAM DESALSAL BUSINESS INFORMATION
// ======================================================

const BUSINESS_NAME = "Team Desalsal";
const BUSINESS_LOCATION = "Brgy. Maypangdan, Borongan City, Eastern Samar";
const BUSINESS_EMAIL = "jessacampoto@gmail.com";
const BUSINESS_PHONE = "09606674158";
const BUSINESS_SOCIAL_URL = "https://www.facebook.com/share/18efry1dKK/";
const BUSINESS_HOURS = "Monday - Friday";
const BULK_DISCOUNT_LABEL = "5 pieces for ₱45";

// ======================================================
// EDIT HERE: PRODUCT INFORMATION AND PRICES
// ======================================================

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  category: string;
  available: boolean;
  image_url?: string | null;
};

let PRODUCTS: Product[] = [];

// ======================================================
// EDIT HERE: ORDER AND DISCOUNT RULES
// ======================================================

const MINIMUM_DELIVERY_QUANTITY = 5;

type CartItem = {
  productId: string;
  quantity: number;
};

type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Preparing"
  | "Ready"
  | "Out for delivery"
  | "Completed"
  | "Delivered"
  | "Cancelled";

type OrderStatusEvent = {
  status: OrderStatus;
  at: string;
  note?: string;
};

type Order = {
  id: string;
  databaseId?: string;
  customerName: string;
  phone: string;
  address: string;
  fulfillmentType: "Delivery" | "Pickup";
  paymentMethod: string;
  notes: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  statusHistory?: OrderStatusEvent[];
  violationNote?: string;
};

type DbProductRow = { id: string | number; name: string; description: string | null; price: number | string; image_url: string | null; is_active: boolean; category: string | null };
type DbOrderItem = { productId?: string | number; product_id?: string | number; quantity: number | string };
type DbStoreOrder = { id: string; order_code: string; customer_name: string; phone: string; address: string; fulfillment_type: "Delivery" | "Pickup"; payment_method: string; notes: string | null; items: DbOrderItem[] | null; subtotal: number | string; discount: number | string; total: number | string; status: OrderStatus; created_at: string; status_history?: OrderStatusEvent[] };
type DbOrderHistoryRow = { order_id: string; status: OrderStatus; note: string | null; created_at: string };


function getDiscountPercent(quantity: number): number {
  if (quantity < MINIMUM_DELIVERY_QUANTITY) return 0;
  if (quantity < 10) return 10;
  if (quantity < 15) return 12;

  return Math.min(20, 12 + Math.floor((quantity - 10) / 5));
}

function calculateCart(items: CartItem[]) {
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const product = PRODUCTS.find((p) => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const discountPercent = getDiscountPercent(quantity);
  const discount = Math.round(subtotal * discountPercent) / 100;
  const total = Math.max(0, subtotal - discount);

  return { quantity, subtotal, discountPercent, discount, total };
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount);
}

function localProductImage(product: Product) {
  if (product.image_url) return product.image_url;
  const name = product.name.toLowerCase();
  if (name.includes("choco") || name.includes("pi ta byte")) return "/assets/products/choco-pi-ta-byte.jpg";
  if (name.includes("strawberry") || name.includes("pie")) return "/assets/products/strawberry-pie.jpg";
  return "";
}

// ======================================================
// EDIT HERE: NAVIGATION OPTIONS
// ======================================================

type Page =
  | "Home"
  | "Shop"
  | "Cart"
  | "Checkout"
  | "Orders"
  | "About Us"
  | "Contact"
  | "Admin"
  | "Account"
  | "Treat Passport"
  | "Reviews"
  | "Promotions"
  | "Product Passports"
  | "Inbox";



// ======================================================
// REUSABLE: HEADER
// ======================================================

type HeaderProps = {
  page: Page;
  setPage: (page: Page) => void;
  cartQuantity: number;
  orderCount: number;
  isSignedIn: boolean;
  isAdmin: boolean;
};

function UiIcon({ name }: { name: "home" | "shop" | "account" | "inbox" | "cart" | "contact" | "admin" | "orders" | "rewards" | "about" | "reviews" | "promotions" | "details" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" {...common}>
      {name === "home" && <><path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>}
      {name === "shop" && <><path d="M4 8h16l-1.2 12H5.2L4 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></>}
      {name === "account" && <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>}
      {name === "inbox" && <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/></>}
      {name === "cart" && <><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>}
      {name === "contact" && <><path d="M21 15a4 4 0 0 1-4 4H8l-5 2V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></>}
      {name === "admin" && <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 8h6M9 12h6M9 16h3"/></>}
      {name === "orders" && <><path d="M7 3h10v18H7zM9 7h6M9 11h6M9 15h4"/></>}
      {name === "rewards" && <><path d="m12 3 2.5 5.1 5.6.8-4.1 4 .9 5.7-4.9-2.7-4.9 2.7.9-5.7-4.1-4 5.6-.8Z"/></>}
      {name === "about" && <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.4 1.9c-1.2 1-1.9 1.3-1.9 3M12 17.5h.01"/></>}
      {name === "reviews" && <><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></>}
      {name === "promotions" && <><path d="M20 12 12 20H5v-7l8-8a3 3 0 0 1 4 0l3 3a3 3 0 0 1 0 4Z"/><circle cx="15.5" cy="8.5" r="1"/></>}
      {name === "details" && <><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/></>}
    </svg>
  );
}

function Header({ page, setPage, cartQuantity, orderCount, isSignedIn, isAdmin }: HeaderProps) {
  function navigate(destination: Page) {
    setPage(destination);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const centerLinks: { page: Page; label: string; icon: Parameters<typeof UiIcon>[0]["name"] }[] = [
    { page: "Home", label: "Home", icon: "home" },
    { page: "Shop", label: "Shop", icon: "shop" },
    { page: "Orders", label: "Orders", icon: "orders" },
    { page: "Treat Passport", label: "Treat Passport", icon: "rewards" },
    { page: "About Us", label: "About", icon: "about" },
  ];

  const utilityButton = (destination: Page, label: string, icon: Parameters<typeof UiIcon>[0]["name"], count?: number) => (
    <button className={`header-icon-button ${page === destination ? "active" : ""}`} type="button" onClick={() => navigate(destination)} aria-label={label} title={label} data-tooltip={label}>
      <UiIcon name={icon} />
      {typeof count === "number" && count > 0 && <span className="header-icon-count">{count > 99 ? "99+" : count}</span>}
    </button>
  );

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="header-utilities" aria-label="Your account and shopping tools">
          {utilityButton("Account", isSignedIn ? "Account" : "Sign in", "account")}
          {isSignedIn && utilityButton("Inbox", "Inbox", "inbox")}
          {utilityButton("Cart", `Cart${cartQuantity ? `, ${cartQuantity} items` : ""}`, "cart", cartQuantity)}
        </div>

        <nav className="header-main-nav" aria-label="Main navigation">
          {centerLinks.map((item) => (
            <button key={item.page} type="button" className={`header-nav-link ${page === item.page || (item.page === "Shop" && page === "Checkout") ? "active" : ""}`} onClick={() => navigate(item.page)} aria-current={page === item.page ? "page" : undefined}>
              <span className="header-nav-icon"><UiIcon name={item.icon} /></span><span>{item.label}{item.page === "Orders" && orderCount > 0 ? ` (${orderCount})` : ""}</span>
            </button>
          ))}
        </nav>

        <div className="header-brand-actions">
          {utilityButton("Contact", "Contact us", "contact")}
          {isAdmin && utilityButton("Admin", "Open admin workspace", "admin")}
          <button className="header-brand" type="button" onClick={() => navigate("Home")} aria-label={`${BUSINESS_NAME} home`}>
            <span className="header-brand-mark logo-image-wrap"><span className="logo-fallback">TD</span><img src="/assets/team-desalsal-logo.png" alt="" onLoad={(event) => { const fallback = event.currentTarget.parentElement?.querySelector(".logo-fallback") as HTMLElement | null; if (fallback) fallback.style.display = "none"; }} onError={(event) => { event.currentTarget.style.display = "none"; }} /></span>
            <span className="header-brand-copy"><strong>{BUSINESS_NAME}</strong><small>Freshly made, happily shared</small></span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ======================================================
// REUSABLE: FOOTER
// ======================================================

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <h3><span className="shared-brand-mark logo-placeholder logo-image-wrap" aria-hidden="true"><span className="logo-fallback">TD</span><img src="/assets/team-desalsal-logo.png" alt="" onLoad={(event) => { const fallback = event.currentTarget.parentElement?.querySelector(".logo-fallback") as HTMLElement | null; if (fallback) fallback.style.display = "none"; }} onError={(event) => { event.currentTarget.style.display = "none"; }} /></span> {BUSINESS_NAME}</h3>
          <p>Made with sweetness, shared with happiness.</p>
          <p>{BUSINESS_LOCATION}</p>
          <p><a href={`mailto:${BUSINESS_EMAIL}`}>{BUSINESS_EMAIL}</a></p>
          <p><a href={`tel:${BUSINESS_PHONE}`}>{BUSINESS_PHONE}</a></p>
          <p>{BUSINESS_HOURS}</p>
          <p><a href={BUSINESS_SOCIAL_URL} target="_blank" rel="noreferrer">Facebook page</a></p>
        </div>

        <div className="footer-links footer-business-note">
          <h4>Ordering Information</h4>
          <p>Delivery area: {BUSINESS_LOCATION}.</p>
          <p>Self-pickup is available by arrangement.</p>
          <p>Bulk offer: {BULK_DISCOUNT_LABEL}.</p>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.
      </div>
    </footer>
  );
}

// ======================================================
// SHOP PAGE
// ======================================================


function HomePage({ setPage, addToCart, catalogStatus, catalogError }: { setPage: (page: Page) => void; addToCart: (productId: string, quantity: number) => void; catalogStatus: "loading" | "ready" | "error"; catalogError: string }) {
  const featured = PRODUCTS.slice(0, 3);
  return (
    <section className="home-page">
      <div className="home-hero section">
        <div className="home-hero-copy">
          <span className="eyebrow">BAKED FOR YOUR LITTLE MOMENTS</span>
          <h1>A little sweetness goes a long way.</h1>
          <p>Discover Team Desalsal's available treats, choose your favorites, and order for pickup or local delivery.</p>
          <div className="home-hero-actions">
            <button className="button button-primary" onClick={() => setPage("Shop")}>Explore the shop</button>
            <button className="button button-secondary" onClick={() => setPage("About Us")}>Meet the team</button>
          </div>
          <div className="home-quick-facts"><span><UiIcon name="shop" /> Freshly prepared treats</span><span><UiIcon name="cart" /> Bulk order savings</span></div>
        </div>
        <div className="home-hero-art" aria-hidden="true"><span className="home-art-sparkle sparkle-one">✦</span><span className="home-art-sparkle sparkle-two">✧</span><div className="home-art-plate"><span>🥧</span><span>🍓</span><span>🍫</span></div><small>little treats, big joy</small></div>
      </div>
      <section className="section promo-video-section" aria-labelledby="promo-video-heading">
        <div className="promo-video-copy"><span className="eyebrow">A LITTLE LOOK AT OUR BUSINESS</span><h2 id="promo-video-heading">Meet Team Desalsal</h2><p>Watch our promotional video and see the treats and teamwork behind our small business.</p></div>
        <div className="promo-video-frame">
          <div className="promo-video-fallback"><span aria-hidden="true">▶</span><strong>Team Desalsal promotional video</strong><small>Place your video at public/videos/team-desalsal-promo.mp4</small></div>
          <video controls playsInline preload="metadata" poster="/assets/team/team-desalsal-promo-poster.jpg" onCanPlay={(event) => { const fallback = event.currentTarget.parentElement?.querySelector(".promo-video-fallback") as HTMLElement | null; if (fallback) fallback.style.display = "none"; }} onError={(event) => { event.currentTarget.style.display = "none"; }}>
            <source src="/videos/team-desalsal-promo.mp4" type="video/mp4" />
            Your browser does not support embedded videos.
          </video>
        </div>
      </section>
      <section className="section home-featured-section">
        <div className="section-heading home-section-heading"><div><span className="eyebrow">FROM OUR COUNTER</span><h2>Available treats</h2><p>Only products currently listed in the store catalog appear here.</p></div><button className="text-action" onClick={() => setPage("Shop")}>View all products <span aria-hidden="true">→</span></button></div>
        {catalogStatus === "loading" ? <div className="empty-state compact-empty"><span>◌</span><h3>Loading today's treats</h3><p>Checking the live product catalog.</p></div> : catalogStatus === "error" ? <div className="empty-state compact-empty" role="status"><span>!</span><h3>Products aren't available right now</h3><p>We couldn't load the store catalog. Please try again in a moment.</p><small>{catalogError}</small></div> : featured.length === 0 ? <div className="empty-state compact-empty"><span>♡</span><h3>Our display case is being prepared</h3><p>There are no active products in the catalog yet. Please check back soon.</p><button className="button button-secondary" onClick={() => setPage("Shop")}>Open shop</button></div> : <div className="home-featured-grid">{featured.map((product) => <article className="home-featured-card" key={product.id}><div className="home-featured-art">{localProductImage(product) ? <img src={localProductImage(product)} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; const fallback = event.currentTarget.parentElement?.querySelector(".local-image-fallback") as HTMLElement | null; if (fallback) fallback.style.display = "inline"; }} /> : null}<span className="local-image-fallback" aria-hidden="true" style={{ display: localProductImage(product) ? "none" : "inline" }}>{product.emoji}</span></div><div className="home-featured-copy"><span className="product-category-label">{product.category}</span><h3>{product.name}</h3><p>{product.description || "A sweet treat from Team Desalsal."}</p><div className="home-featured-bottom"><strong>{formatPrice(product.price)}</strong><button className="home-add-button" onClick={() => addToCart(product.id, 1)} aria-label={`Add ${product.name} to cart`} title="Add to cart">＋</button></div></div></article>)}</div>}
      </section>
      <section className="home-bottom-strip"><div><span className="eyebrow">MADE TO SHARE</span><h2>Ordering for a group?</h2><p>Explore eligible quantities and discounts in the shop.</p></div><button className="button button-primary" onClick={() => setPage("Shop")}>Browse treats</button></section>
    </section>
  );
}

type ShopProps = {
  cart: CartItem[];
  addToCart: (productId: string, quantity: number) => void;
  setPage: (page: Page) => void;
  catalogStatus: "loading" | "ready" | "error";
  catalogError: string;
};

function Shop({ cart, addToCart, setPage, catalogStatus, catalogError }: ShopProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");

  // EDIT HERE: MIX & MATCH DEFAULT QUANTITIES
  const [mixChoco, setMixChoco] = useState(0);
  const [mixStrawberry, setMixStrawberry] = useState(0);

  const MINIMUM_DELIVERY_QUANTITY = 5;
  const MAX_QUANTITY = 999;

  // Mix & Match uses only currently active Supabase catalog products.
  const chocoCatalogProduct = PRODUCTS.find((product) => /choco|chocolate/i.test(product.name));
  const strawberryCatalogProduct = PRODUCTS.find((product) => /strawberry/i.test(product.name));
  const hasMixMatchProducts = Boolean(chocoCatalogProduct && strawberryCatalogProduct);
  const mixQuantity = mixChoco + mixStrawberry;
  const mixSubtotal = mixChoco * (chocoCatalogProduct?.price ?? 0) + mixStrawberry * (strawberryCatalogProduct?.price ?? 0);

  function getDiscountPercent(quantity: number): number {
    if (quantity < 5) return 0;
    if (quantity < 10) return 10;
    if (quantity < 15) return 12;

    return Math.min(
      20,
      12 + Math.floor((quantity - 10) / 5),
    );
  }

  const mixDiscountPercent = getDiscountPercent(mixQuantity);
  const mixDiscount =
    Math.round(mixSubtotal * mixDiscountPercent) / 100;
  const mixTotal = mixSubtotal - mixDiscount;

  const categories = [
    "All",
    ...new Set(PRODUCTS.map((product) => product.category)),
  ];

  const filteredProducts = PRODUCTS.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || product.category === category;

    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sort === "price-low") return a.price - b.price;
    if (sort === "price-high") return b.price - a.price;
    return 0;
  });

  const cartSummary = calculateCart(cart);

  function updateQuantity(productId: string, amount: number) {
    setQuantities((previous) => ({
      ...previous,
      [productId]: Math.max(
        1,
        Math.min(MAX_QUANTITY, Math.floor(amount || 1)),
      ),
    }));
  }

  function updateMixQuantity(
    flavor: "choco" | "strawberry",
    amount: number,
  ) {
    const safeAmount = Math.max(
      0,
      Math.min(MAX_QUANTITY, Math.floor(amount || 0)),
    );

    if (flavor === "choco") {
      setMixChoco(safeAmount);
    } else {
      setMixStrawberry(safeAmount);
    }

    setMessage("");
  }

  function handleAdd(product: Product) {
    const quantity = quantities[product.id] ?? 1;

    if (!product.available) {
      setMessage(`${product.name} is currently unavailable.`);
      return;
    }

    addToCart(product.id, quantity);
    setMessage(`${quantity} × ${product.name} added to your cart!`);
  }

  // EDIT HERE: ADD BOTH FLAVORS TO THE SAME CART
  function handleAddMixAndMatch() {
    if (mixQuantity < MINIMUM_DELIVERY_QUANTITY) {
      setMessage(
        `Please select at least ${MINIMUM_DELIVERY_QUANTITY} pieces in total.`,
      );
      return;
    }

    const chocoProduct = PRODUCTS.find((product) => /choco|chocolate/i.test(product.name));
    const strawberryProduct = PRODUCTS.find((product) => /strawberry/i.test(product.name));

    if (
      (mixChoco > 0 && !chocoProduct) ||
      (mixStrawberry > 0 && !strawberryProduct)
    ) {
      setMessage("We couldn't find one of the selected products.");
      return;
    }

    if (
      (mixChoco > 0 && !chocoProduct?.available) ||
      (mixStrawberry > 0 && !strawberryProduct?.available)
    ) {
      setMessage(
        "One of your selected flavors is unavailable. Please adjust your combination.",
      );
      return;
    }

    if (mixChoco > 0 && chocoProduct) {
      addToCart(chocoProduct.id, mixChoco);
    }

    if (mixStrawberry > 0 && strawberryProduct) {
      addToCart(strawberryProduct.id, mixStrawberry);
    }

    setMessage(
      `Your Mix & Match bundle of ${mixQuantity} pieces has been added to your cart!`,
    );
  }

  return (
    <>
      {/* Shop contains the live product catalog and purchasing tools only. */}
      {/* ==========================================
          PRODUCT CATALOG
      ========================================== */}
      <section
        className="section product-section"
        id="product-catalog"
      >
        <div className="section-heading">
          <span className="eyebrow">OUR MENU</span>
          <h2>Find your favorite treat</h2>
          <p>
            Choose your favorite product or create your own
            flavor combination.
          </p>
        </div>

        <div className="shop-toolbar">
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search products"
          />

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter category"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All categories" : item}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort products"
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        {message && (
          <div className="notice" role="status">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        <div className="product-grid">
          {filteredProducts.map((product) => {
            const quantity = quantities[product.id] ?? 1;

            const alreadyInCart =
              cart.find((item) => item.productId === product.id)
                ?.quantity ?? 0;

            return (
              <article className="product-card" key={product.id}>
                <div
                  className={`product-art product-art-${product.category.toLowerCase()}`}
                >
                  <span className="product-category">
                    {product.category}
                  </span>

                  {localProductImage(product) && <img className="product-local-image" src={localProductImage(product)} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; const fallback = event.currentTarget.parentElement?.querySelector(".product-emoji") as HTMLElement | null; if (fallback) fallback.style.display = "inline"; }} />}
                  <span className="product-emoji" aria-hidden="true" style={{ display: localProductImage(product) ? "none" : undefined }}>
                    {product.emoji}
                  </span>

                  <span className="product-art-caption">
                    A sweet little treat
                  </span>
                </div>

                <div className="product-details">
                  <div className="product-title-row">
                    <h3>{product.name}</h3>

                    <strong className="product-price">
                      {formatPrice(product.price)}
                      <small> / piece</small>
                    </strong>
                  </div>

                  <p>{product.description}</p>

                  <p className="stock-label">
                    {product.available
                      ? "● Available for inquiry"
                      : "● Currently unavailable"}
                  </p>

                  {alreadyInCart > 0 && (
                    <p className="carted-label">
                      {alreadyInCart} already in your cart
                    </p>
                  )}

                  <div className="product-buy-row">
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(product.id, quantity - 1)
                        }
                        aria-label={`Decrease ${product.name} quantity`}
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={MAX_QUANTITY}
                        value={quantity}
                        aria-label={`${product.name} quantity`}
                        onChange={(event) => {
                          const value = event.target.value;

                          if (value === "") {
                            setQuantities((previous) => ({
                              ...previous,
                              [product.id]: 1,
                            }));
                            return;
                          }

                          updateQuantity(product.id, Number(value));
                        }}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(product.id, quantity + 1)
                        }
                        aria-label={`Increase ${product.name} quantity`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="button button-primary add-cart-button"
                      disabled={!product.available}
                      onClick={() => handleAdd(product)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="empty-state catalog-empty-state" role="status" aria-live="polite">
            <span aria-hidden="true">{catalogStatus === "loading" ? "◌" : catalogStatus === "error" ? "!" : search || category !== "All" ? "⌕" : "♡"}</span>
            <h3>{catalogStatus === "loading" ? "Loading the menu" : catalogStatus === "error" ? "Menu temporarily unavailable" : search || category !== "All" ? "No matching products" : "No products published yet"}</h3>
            <p>{catalogStatus === "loading" ? "Fetching currently available products from the store catalog." : catalogStatus === "error" ? "We couldn't load the live catalog. Please refresh the page or try again shortly." : search || category !== "All" ? "Try another search or clear the selected category." : "The bakery hasn't published any active products yet. Please check back soon."}</p>
            {catalogStatus === "error" && catalogError && <p className="catalog-error-detail">{catalogError}</p>}
            {catalogStatus === "ready" && (search || category !== "All") && (
              <button type="button" className="button button-secondary" onClick={() => { setSearch(""); setCategory("All"); }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ==========================================
            MIX & MATCH BUNDLE
        ========================================== */}
        {hasMixMatchProducts && <section className="mix-match-section">
          <div className="mix-match-heading">
            <span className="eyebrow">YOUR TREATS, YOUR WAY</span>
            <h2>Mix & Match</h2>
            <p>
              Love both flavors? Pick how many pieces you want
              from each and combine them in one order.
            </p>
          </div>

          <div className="mix-match-content">
            {/* CHOCOLATE FLAVOR */}
            <div className="mix-flavor-card">
              <span className="mix-flavor-emoji" aria-hidden="true">
                🍫
              </span>

              <h3>{chocoCatalogProduct?.name}</h3>
              <p>{formatPrice(chocoCatalogProduct?.price ?? 0)} per piece</p>

              <div className="quantity-control">
                <button
                  type="button"
                  onClick={() =>
                    updateMixQuantity("choco", mixChoco - 1)
                  }
                  aria-label="Remove one chocolate piece"
                >
                  −
                </button>

                <span className="mix-quantity">{mixChoco}</span>

                <button
                  type="button"
                  onClick={() =>
                    updateMixQuantity("choco", mixChoco + 1)
                  }
                  aria-label="Add one chocolate piece"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mix-plus" aria-hidden="true">
              +
            </div>

            {/* STRAWBERRY FLAVOR */}
            <div className="mix-flavor-card">
              <span className="mix-flavor-emoji" aria-hidden="true">
                🍓
              </span>

              <h3>{strawberryCatalogProduct?.name}</h3>
              <p>{formatPrice(strawberryCatalogProduct?.price ?? 0)} per piece</p>

              <div className="quantity-control">
                <button
                  type="button"
                  onClick={() =>
                    updateMixQuantity(
                      "strawberry",
                      mixStrawberry - 1,
                    )
                  }
                  aria-label="Remove one strawberry piece"
                >
                  −
                </button>

                <span className="mix-quantity">
                  {mixStrawberry}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    updateMixQuantity(
                      "strawberry",
                      mixStrawberry + 1,
                    )
                  }
                  aria-label="Add one strawberry piece"
                >
                  +
                </button>
              </div>
            </div>

            {/* LIVE PRICE SUMMARY */}
            <div className="mix-summary">
              <span className="eyebrow">YOUR COMBINATION</span>

              <h3>{mixQuantity} pieces selected</h3>

              <p>
                {mixChoco} chocolate + {mixStrawberry} strawberry
              </p>

              <div className="summary-line">
                <span>Subtotal</span>
                <strong>{formatPrice(mixSubtotal)}</strong>
              </div>

              <div className="summary-line">
                <span>Discount ({mixDiscountPercent}%)</span>
                <strong className="discount-value">
                  −{formatPrice(mixDiscount)}
                </strong>
              </div>

              <div className="summary-total">
                <span>Estimated total</span>
                <strong>{formatPrice(mixTotal)}</strong>
              </div>

              {mixQuantity < MINIMUM_DELIVERY_QUANTITY && (
                <p className="form-warning">
                  Select{" "}
                  {MINIMUM_DELIVERY_QUANTITY - mixQuantity} more
                  piece(s) to meet the minimum order.
                </p>
              )}

              <button
                type="button"
                className="button button-primary full-width"
                disabled={
                  mixQuantity < MINIMUM_DELIVERY_QUANTITY ||
                  mixQuantity > MAX_QUANTITY * 2
                }
                onClick={handleAddMixAndMatch}
              >
                Add Mix & Match to Cart
              </button>

              <p className="small-note">
                Both flavors will appear in your cart. The final
                discount is calculated using the total order quantity.
              </p>
            </div>
          </div>
        </section>}

        {/* ==========================================
            DISCOUNT INFORMATION
        ========================================== */}
        <div className="discount-banner">
          <span className="discount-banner-icon">🎁</span>

          <div>
            <h3>Bulk order savings</h3>
            <p>
              Save 10% on 5–9 pieces and 12% on 10–14 pieces. Bigger orders can save up to 20%.
            </p>
          </div>

          <button
            type="button"
            className="button button-secondary"
            onClick={() => setPage("Cart")}
          >
            View Cart ({cartSummary.quantity})
          </button>
        </div>

        {/* ==========================================
            ORDER POLICIES
        ========================================== */}
        <div className="policy-grid">
          <div className="policy-item">
            <span>📦</span>
            <h4>Minimum 5 pieces</h4>
            <p>
              At least 5 pieces in total are required for delivery
              orders.
            </p>
          </div>

          <div className="policy-item">
            <span>💗</span>
            <h4>Bulk savings</h4>
            <p>
              Your discount increases as your order quantity grows.
              Mix both flavors to reach the quantity you need.
            </p>
          </div>

          <div className="policy-item">
            <span>📩</span>
            <h4>Order confirmation</h4>
            <p>
              Orders are subject to product availability and
              confirmation by the Team Desalsal staff.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

// ======================================================
// CART PAGE
// ======================================================

type CartProps = {
  cart: CartItem[];
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  setPage: (page: Page) => void;
};

function Cart({
  cart,
  updateQuantity,
  removeFromCart,
  setPage,
}: CartProps) {
  const summary = calculateCart(cart);
  const meetsMinimum = summary.quantity >= MINIMUM_DELIVERY_QUANTITY;

  if (cart.length === 0) {
    return (
      <section className="section page-section">
        <div className="empty-state">
          <span>🛒</span>
          <h1>Your cart is waiting for treats</h1>
          <p>You haven't added any products yet.</p>
          <button
            className="button button-primary"
            onClick={() => setPage("Shop")}
          >
            Browse Products
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-section">
      <div className="section-heading">
        <span className="eyebrow">YOUR SELECTION</span>
        <h1>Shopping Cart</h1>
        <p>Review your products and quantities before checking out.</p>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {cart.map((item) => {
            const product = PRODUCTS.find((p) => p.id === item.productId);
            if (!product) return null;

            return (
              <article className="cart-item" key={item.productId}>
                <div className="cart-item-art">{product.emoji}</div>

                <div className="cart-item-info">
                  <h3>{product.name}</h3>
                  <p>{formatPrice(product.price)} per piece</p>
                  <strong>
                    {formatPrice(product.price * item.quantity)}
                  </strong>
                </div>

                <div className="cart-item-actions">
                  <div className="quantity-control">
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={item.quantity}
                      aria-label="Quantity"
                      onChange={(event) => {
                        const value = event.target.value;
                        updateQuantity(
                          item.productId,
                          value === "" ? 1 : Number(value),
                        );
                      }}
                    />
                    <button
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="text-button danger-text"
                    onClick={() => removeFromCart(item.productId)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}

          <button
            className="button button-secondary"
            onClick={() => setPage("Shop")}
          >
            ← Continue Shopping
          </button>
        </div>

        <aside className="summary-card">
          <h2>Order Summary</h2>

          <div className="summary-line">
            <span>Total pieces</span>
            <strong>{summary.quantity}</strong>
          </div>

          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{formatPrice(summary.subtotal)}</strong>
          </div>

          <div className="summary-line">
            <span>Discount ({summary.discountPercent}%)</span>
            <strong className="discount-value">
              −{formatPrice(summary.discount)}
            </strong>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>{formatPrice(summary.total)}</strong>
          </div>

          {!meetsMinimum && (
            <p className="form-warning">
              Delivery requires at least {MINIMUM_DELIVERY_QUANTITY} pieces. You can still continue with a smaller order if you choose self-pickup at checkout.
            </p>
          )}

          {meetsMinimum && (
            <p className="success-message">
              ✓ Your cart meets the minimum delivery quantity.
            </p>
          )}

          <button
            className="button button-primary full-width"
            onClick={() => setPage("Checkout")}
          >
            Proceed to Checkout
          </button>

          <p className="small-note">
            Final order acceptance and availability must be confirmed by the
            team.
          </p>
        </aside>
      </div>
    </section>
  );
}

// ======================================================
// CHECKOUT PAGE
// ======================================================

type CheckoutProps = {
  cart: CartItem[];
  placeOrder: (details: {
    customerName: string;
    phone: string;
    address: string;
    fulfillmentType: "Delivery" | "Pickup";
    paymentMethod: string;
    notes: string;
  }) => Promise<string | null>;
  setPage: (page: Page) => void;
};

function Checkout({ cart, placeOrder, setPage }: CheckoutProps) {
  const summary = calculateCart(cart);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"Delivery" | "Pickup">("Delivery");
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (fulfillmentType === "Delivery" && summary.quantity < MINIMUM_DELIVERY_QUANTITY) {
      setError(`You need at least ${MINIMUM_DELIVERY_QUANTITY} pieces for delivery. Self-pickup orders can be arranged with the team.`);
      return;
    }

    if (fulfillmentType === "Delivery" && !address.toLowerCase().includes("maypangdan")) {
      setError("Delivery is currently limited to Brgy. Maypangdan, Borongan City. Choose self-pickup if you are outside the delivery area.");
      return;
    }

    const orderId = await placeOrder({
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: fulfillmentType === "Pickup" ? "Self-pickup — coordinate with Team Desalsal" : address.trim(),
      fulfillmentType,
      paymentMethod,
      notes: notes.trim(),
    });

    if (!orderId) {
      setError("Your order could not be created. Please try again.");
      return;
    }

    setPage("Orders");
  }

  if (cart.length === 0) {
    return (
      <section className="section page-section empty-state">
        <h1>Your cart is empty</h1>
        <p>Add some treats before checking out.</p>
        <button
          className="button button-primary"
          onClick={() => setPage("Shop")}
        >
          Browse Products
        </button>
      </section>
    );
  }

  return (
    <section className="section page-section">
      <div className="section-heading">
        <span className="eyebrow">ALMOST THERE</span>
        <h1>Checkout</h1>
        <p>Enter your details so our team can review your order.</p>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submitOrder}>
          <h2>Customer Information</h2>

          <label htmlFor="customer-name">Full Name *</label>
          <input
            id="customer-name"
            required
            maxLength={100}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Enter your full name"
          />

          <label htmlFor="customer-phone">Contact Number *</label>
          <input
            id="customer-phone"
            required
            type="tel"
            maxLength={30}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Enter your contact number"
          />

          <label htmlFor="fulfillment-type">How would you like to receive your order? *</label>
          <select id="fulfillment-type" value={fulfillmentType} onChange={(event) => {
            const value = event.target.value as "Delivery" | "Pickup";
            setFulfillmentType(value);
            setError("");
            if (value === "Pickup") setPaymentMethod("Cash on Pickup");
            else if (paymentMethod === "Cash on Pickup") setPaymentMethod("Cash on Delivery");
          }}>
            <option value="Delivery">Delivery — Brgy. Maypangdan only</option>
            <option value="Pickup">Self-pickup</option>
          </select>

          {fulfillmentType === "Delivery" && <>
            <label htmlFor="customer-address">Delivery Address in Brgy. Maypangdan *</label>
            <textarea
              id="customer-address"
              required
              maxLength={500}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="House number, street/sitio, Brgy. Maypangdan, Borongan City"
              rows={3}
            />
          </>}

          <label htmlFor="payment-method">Payment Method *</label>
          <select id="payment-method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            {fulfillmentType === "Delivery" ? <>
              <option>Cash on Delivery</option>
              <option>GCash (confirm details with the team)</option>
              <option>Bank Transfer (confirm details with the team)</option>
            </> : <>
              <option>Cash on Pickup</option>
              <option>GCash (confirm details with the team)</option>
              <option>Bank Transfer (confirm details with the team)</option>
            </>}
          </select>
          <p className="small-note">Online payment details and payment verification must be confirmed directly with Team Desalsal. Do not send money until the team confirms.</p>

          <label htmlFor="order-notes">Order Notes (Optional)</label>
          <textarea
            id="order-notes"
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Additional instructions or requests"
            rows={3}
          />

          <div className="order-policy">
            <strong>Before placing your order</strong>
            <ul>
              <li>Your order is initially marked as Pending.</li>
              <li>The team must confirm product availability, fulfillment, and payment instructions.</li>
              <li>You may cancel while your order is Pending.</li>
              <li>
                Customer cancellation is unavailable once the order becomes
                Confirmed or Ready.
              </li>
            </ul>
          </div>

          {error && <p className="form-warning">{error}</p>}

          <button className="button button-primary full-width" type="submit">
            Place Order
          </button>

          <button
            className="button button-secondary full-width"
            type="button"
            onClick={() => setPage("Cart")}
          >
            Back to Cart
          </button>
        </form>

        <aside className="summary-card">
          <h2>Your Order</h2>

          {cart.map((item) => {
            const product = PRODUCTS.find((p) => p.id === item.productId);
            if (!product) return null;

            return (
              <div className="checkout-product" key={item.productId}>
                <span>
                  {product.emoji} {product.name} × {item.quantity}
                </span>
                <strong>
                  {formatPrice(product.price * item.quantity)}
                </strong>
              </div>
            );
          })}

          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{formatPrice(summary.subtotal)}</strong>
          </div>

          <div className="summary-line">
            <span>Discount ({summary.discountPercent}%)</span>
            <strong className="discount-value">
              −{formatPrice(summary.discount)}
            </strong>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>{formatPrice(summary.total)}</strong>
          </div>

          <p className="small-note">
            {fulfillmentType === "Delivery" ? "Delivery is limited to Brgy. Maypangdan. Any delivery fee will be confirmed by the team." : "Pickup timing and location details will be confirmed by the team."}
          </p>
        </aside>
      </div>
    </section>
  );
}

// ======================================================
// ORDER STATUS PAGE
// ======================================================

type OrdersProps = {
  orders: Order[];
  cancelOrder: (orderId: string) => void;
  setPage: (page: Page) => void;
};

function Orders({ orders, cancelOrder, setPage }: OrdersProps) {
  const [searchId, setSearchId] = useState("");
  const [orderView, setOrderView] = useState<"Current" | "History">("Current");
  const historyStatuses: OrderStatus[] = ["Completed", "Delivered", "Cancelled"];

  const visibleOrders = orders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchId.trim().toLowerCase());
    const isHistory = historyStatuses.includes(order.status);
    return matchesSearch && (orderView === "History" ? isHistory : !isHistory);
  });

  function canCancel(status: OrderStatus) {
    return status === "Pending";
  }

  return (
    <section className="section page-section">
      <div className="section-heading">
        <span className="eyebrow">ORDER TRACKING</span>
        <h1>Your Orders</h1>
        <p>Check the current status of your orders on this device.</p>
      </div>

      <div className="order-history-tabs" role="tablist" aria-label="Order views">
        <button type="button" role="tab" aria-selected={orderView === "Current"} className={orderView === "Current" ? "order-history-tab active" : "order-history-tab"} onClick={() => setOrderView("Current")}>Current orders <span>{orders.filter((order) => !historyStatuses.includes(order.status)).length}</span></button>
        <button type="button" role="tab" aria-selected={orderView === "History"} className={orderView === "History" ? "order-history-tab active" : "order-history-tab"} onClick={() => setOrderView("History")}>Order history <span>{orders.filter((order) => historyStatuses.includes(order.status)).length}</span></button>
      </div>

      <div className="order-search">
        <input
          value={searchId}
          onChange={(event) => setSearchId(event.target.value)}
          placeholder="Search by order ID..."
          aria-label="Search order ID"
        />
      </div>

      {visibleOrders.length === 0 ? (
        <div className="empty-state">
          <span>📋</span>
          <h3>{orders.length === 0 ? "No orders yet" : orderView === "History" ? "No order history yet" : "No current orders"}</h3>
          <p>
            {orders.length === 0
              ? "Your placed orders will appear here."
              : orderView === "History"
                ? "Completed, delivered, and cancelled orders will be saved here."
                : "Completed, delivered, and cancelled orders are available in Order History."}
          </p>
          <button
            className="button button-primary"
            onClick={() => setPage("Shop")}
          >
            Shop Now
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {visibleOrders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-card-header">
                <div>
                  <span className="eyebrow">ORDER NUMBER</span>
                  <h3>{order.id}</h3>
                  <p>{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <span
                  className={`status-badge status-${order.status.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="order-card-details">
                <p>
                  <strong>Customer:</strong> {order.customerName}
                </p>
                <p>
                  <strong>Contact:</strong> {order.phone}
                </p>
                <p>
                  <strong>Fulfillment:</strong> {order.fulfillmentType ?? "Delivery"}
                </p>
                <p>
                  <strong>Payment:</strong> {order.paymentMethod ?? "Confirm with team"}
                </p>
                {order.fulfillmentType !== "Pickup" && <p><strong>Address:</strong> {order.address}</p>}
                <p>
                  <strong>Pieces:</strong>{" "}
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
              </div>

              <div className="order-products">
                {order.items.map((item) => {
                  const product = PRODUCTS.find(
                    (p) => p.id === item.productId,
                  );

                  return (
                    <p key={item.productId}>
                      {product?.emoji} {product?.name} × {item.quantity}
                    </p>
                  );
                })}
              </div>

              {order.notes && (
                <p>
                  <strong>Notes:</strong> {order.notes}
                </p>
              )}

              <div className="order-total-row">
                <span>Discount: {formatPrice(order.discount)}</span>
                <strong>Total: {formatPrice(order.total)}</strong>
              </div>

              <details className="order-timeline">
                <summary>Order status history</summary>
                <ol>
                  {(order.statusHistory?.length ? order.statusHistory : [{ status: order.status, at: order.createdAt }]).map((event, index) => (
                    <li key={`${event.at}-${event.status}-${index}`}>
                      <span className={`timeline-dot status-${event.status.toLowerCase().replace(/\s+/g, "-")}`} />
                      <div><strong>{event.status}</strong><time>{new Date(event.at).toLocaleString()}</time>{event.note && <p>{event.note}</p>}</div>
                    </li>
                  ))}
                </ol>
              </details>

              {order.violationNote && (
                <p className="form-warning">
                  Review note: {order.violationNote}
                </p>
              )}

              {canCancel(order.status) && (
                <button
                  className="button button-danger"
                  onClick={() => cancelOrder(order.id)}
                >
                  Cancel Order
                </button>
              )}

              {order.status === "Confirmed" && (
                <p className="small-note">
                  This order is confirmed. Customer cancellation is no longer
                  available.
                </p>
              )}

              {order.status === "Ready" && (
                <p className="small-note">
                  Your order is ready. Please contact the team if you need
                  assistance.
                </p>
              )}

              {(["Completed", "Delivered"] as OrderStatus[]).includes(order.status) && (
                <button className="button button-secondary" type="button" onClick={() => setPage("Reviews")}>
                  ★ Rate this order
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// ======================================================
// ABOUT US PAGE
// ======================================================

function AboutUs({ setPage }: { setPage: (page: Page) => void }) {
  const teamMembers = [
    { role: "Team Leader", name: "Sharie Ann Domalaon", description: "Coordinates the team and oversees business operations." },
    { role: "Finance", name: "Sha-ina Jaradal", description: "Helps plan and monitor the business's financial activities." },
    { role: "Treasurer", name: "Irish Joy Lebrilla", description: "Keeps track of collected funds, payments, and cash records." },
    { role: "Production", name: "Alliaza Agarpao", description: "Coordinates product preparation and production tasks." },
    { role: "Baker", name: "Lovely Jane Jama", description: "Prepares and bakes the team's products." },
    { role: "Baker Assistant", name: "Adan Garcia", description: "Assists with ingredient preparation and baking tasks." },
    { role: "Sales Representative", name: "Jessa Beah Sumalpong", description: "Shares product information and supports sales." },
    { role: "Seller", name: "Benedict Voloso", description: "Helps sell products and serve customers." },
    { role: "Order Manager", name: "Aaron Pomarejos", description: "Organizes incoming orders and order coordination." },
    { role: "Developer", name: "Jessa Maica Campoto", description: "Develops and maintains the Team Desalsal website." },
  ];

  return (
    <section className="section page-section">
      <div className="about-hero">
        <div className="about-illustration" aria-hidden="true"><span>🍓</span><span>🥧</span><span>🍫</span></div>
        <div>
          <span className="eyebrow">OUR STORY</span>
          <h1>Small treats. Big happiness.</h1>
          <p>Team Desalsal is a student-led food business based in {BUSINESS_LOCATION}, bringing affordable treats and a friendly ordering experience to our community.</p>
          <p>Our Choco Pi Ta Byte and Strawberry Pie are priced at ₱10 per piece. Customers can mix flavors and, for eligible larger orders, enjoy quantity-based discounts.</p>
          <button className="button button-primary" onClick={() => setPage("Shop")}>Explore Our Products</button>
        </div>
      </div>

      <div className="values-grid about-purpose-grid">
        <article className="value-card"><span>🎯</span><h3>Our Mission</h3><p>To offer enjoyable, affordable treats with thoughtful customer service while learning practical entrepreneurship, teamwork, and responsible business management.</p></article>
        <article className="value-card"><span>🌱</span><h3>Our Vision</h3><p>To grow as a trusted student-led food business known in our community for creativity, consistency, and a positive customer experience.</p></article>
        <article className="value-card"><span>💗</span><h3>Our Values</h3><p>Customer care, cleanliness, creativity, honesty, teamwork, and continuous improvement guide our work.</p></article>
      </div>



      <div className="section-heading team-section-heading">
        <span className="eyebrow">THE PEOPLE BEHIND THE TREATS</span>
        <h2>Meet Team Desalsal</h2>
        <p>Meet the people who manage, prepare, and share our bakery treats.</p>
      </div>
      <div className="team-tree">
        <div className="team-tree-root"><span>🥧</span><strong>Team Desalsal</strong><small>Student-led food business</small></div>
        <div className="team-tree-branches">
          {teamMembers.map((member, index) => <article className="team-member-card" key={member.role}>
            <div className="team-member-photo-placeholder team-member-photo" aria-label={`Photo of ${member.name}`}>
              <img src={`/assets/team/member-${index + 1}.jpg`} alt={member.name} loading="lazy" onLoad={(event) => { const fallback = event.currentTarget.parentElement?.querySelector(".asset-image-fallback") as HTMLElement | null; if (fallback) fallback.style.display = "none"; }} onError={(event) => { event.currentTarget.style.display = "none"; }} />
              <div className="asset-image-fallback"><span aria-hidden="true">＋</span><small>Member photo</small><code>member-{index + 1}.jpg</code></div>
            </div>
            <h3>{member.role}</h3><strong>{member.name}</strong><p>{member.description}</p>
          </article>)}
        </div>
      </div>

      <div className="section-heading"><span className="eyebrow">WHAT WE VALUE</span><h2>More than just a treat</h2></div>
      <div className="values-grid">
        <article className="value-card"><span>💗</span><h3>Customer Care</h3><p>We aim to make every interaction helpful, respectful, and welcoming.</p></article>
        <article className="value-card"><span>✨</span><h3>Creativity</h3><p>We keep learning how to present our products and business in better ways.</p></article>
        <article className="value-card"><span>🤝</span><h3>Teamwork</h3><p>We share responsibilities, communicate, and work toward common goals.</p></article>
      </div>
      <section className="about-documentation" aria-labelledby="documentation-heading">
        <div className="section-heading">
          <span className="eyebrow">OUR JOURNEY</span>
          <h2 id="documentation-heading">Photos &amp; documentation</h2>
          <p>Keep a visual record of our products, preparation, packaging, school activities, and business milestones.</p>
        </div>
        <div className="documentation-grid">
          <article className="documentation-card documentation-card-featured"><div className="documentation-photo-placeholder documentation-image"><img src="/assets/gallery/team-activity.jpg" alt="Team Desalsal activity" loading="lazy" onLoad={(event) => { const fallback = event.currentTarget.parentElement?.querySelector(".asset-image-fallback") as HTMLElement | null; if (fallback) fallback.style.display = "none"; }} onError={(event) => { event.currentTarget.style.display = "none"; }} /><div className="asset-image-fallback"><span>＋</span><strong>Add a team or event photo</strong><small>gallery/team-activity.jpg</small></div></div><div className="documentation-card-copy"><span className="eyebrow">TEAM MOMENTS</span><h3>Behind the business</h3><p>Use this space for group photos, school events, and team activities.</p></div></article>
          <article className="documentation-card"><div className="documentation-photo-placeholder documentation-image"><img src="/assets/gallery/product-gallery.jpg" alt="Team Desalsal products" loading="lazy" onLoad={(event) => { const fallback = event.currentTarget.parentElement?.querySelector(".asset-image-fallback") as HTMLElement | null; if (fallback) fallback.style.display = "none"; }} onError={(event) => { event.currentTarget.style.display = "none"; }} /><div className="asset-image-fallback"><span>＋</span><strong>Add product photos</strong><small>gallery/product-gallery.jpg</small></div></div><div className="documentation-card-copy"><span className="eyebrow">PRODUCT GALLERY</span><h3>Made with care</h3><p>Show the finished products, packaging, and serving ideas.</p></div></article>
          <article className="documentation-card"><div className="documentation-photo-placeholder documentation-image"><img src="/assets/gallery/business-documentation.jpg" alt="Team Desalsal business documentation" loading="lazy" onLoad={(event) => { const fallback = event.currentTarget.parentElement?.querySelector(".asset-image-fallback") as HTMLElement | null; if (fallback) fallback.style.display = "none"; }} onError={(event) => { event.currentTarget.style.display = "none"; }} /><div className="asset-image-fallback"><span>＋</span><strong>Add documentation</strong><small>gallery/business-documentation.jpg</small></div></div><div className="documentation-card-copy"><span className="eyebrow">OUR PROGRESS</span><h3>Milestones &amp; records</h3><p>Reserve this space for approved project documents and business milestones.</p></div></article>
        </div>
        
      </section>

      <div className="location-panel"><span>📍</span><div><h3>Visit Us</h3><p>{BUSINESS_LOCATION}</p><p className="small-note">Delivery: Brgy. Maypangdan only. Pickup by arrangement.</p></div></div>
    </section>
  );
}

// ======================================================
// CONTACT PAGE
// ======================================================

function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sentMessages, setSentMessages] = useState<
    { name: string; subject: string; message: string }[]
  >([]);
  const [notice, setNotice] = useState("");

  function submitInquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSentMessages((previous) => [
      ...previous,
      { name: name.trim(), subject: subject.trim(), message: message.trim() },
    ]);

    setNotice(
      "Your inquiry has been saved in this page preview. Connect the PHP backend to deliver it to the team.",
    );
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  }

  return (
    <section className="section page-section">
      <div className="section-heading">
        <span className="eyebrow">WE'RE HERE TO HELP</span>
        <h1>Contact Us</h1>
        <p>Questions about our treats or your order? Send us an inquiry.</p>
      </div>

      <div className="contact-layout">
        <div className="contact-information">
          <h2>Get in touch</h2>
          <p>We would love to hear from you!</p>

          <div className="contact-info-item">
            <span>📍</span>
            <div>
              <strong>Our Location</strong>
              <p>{BUSINESS_LOCATION}</p>
            </div>
          </div>

          <div className="contact-info-item">
            <span>📞</span>
            <div>
              <strong>Contact Number</strong>
              <p><a href={`tel:${BUSINESS_PHONE}`}>{BUSINESS_PHONE}</a></p>
            </div>
          </div>

          <div className="contact-info-item">
            <span>✉️</span>
            <div>
              <strong>Email</strong>
              <p><a href={`mailto:${BUSINESS_EMAIL}`}>{BUSINESS_EMAIL}</a></p>
            </div>
          </div>

          <div className="contact-info-item">
            <span>◷</span>
            <div>
              <strong>Business Hours</strong>
              <p>{BUSINESS_HOURS}</p>
            </div>
          </div>

          <div className="contact-info-item">
            <span aria-hidden="true">f</span>
            <div>
              <strong>Facebook</strong>
              <p><a href={BUSINESS_SOCIAL_URL} target="_blank" rel="noreferrer">Visit Team Desalsal on Facebook</a></p>
            </div>
          </div>
        </div>

        <form className="checkout-form" onSubmit={submitInquiry}>
          <h2>Send an Inquiry</h2>

          <label htmlFor="inquiry-name">Your Name *</label>
          <input
            id="inquiry-name"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
          />

          <label htmlFor="inquiry-email">Email Address *</label>
          <input
            id="inquiry-email"
            required
            type="email"
            maxLength={200}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
          />

          <label htmlFor="inquiry-subject">Subject *</label>
          <input
            id="inquiry-subject"
            required
            maxLength={150}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="What is your inquiry about?"
          />

          <label htmlFor="inquiry-message">Message *</label>
          <textarea
            id="inquiry-message"
            required
            maxLength={2000}
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write your message here..."
          />

          {notice && <p className="success-message">{notice}</p>}

          <button className="button button-primary full-width" type="submit">
            Submit Inquiry
          </button>

          {sentMessages.length > 0 && (
            <p className="small-note">
              Preview only: {sentMessages.length} inquiry/inquiries submitted
              during this session.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

// ======================================================
// CUSTOMER ENGAGEMENT PAGES (FRONT-END PREVIEW)
// These records use this browser's localStorage until backend integration.
// ======================================================

type CustomerReview = {
  id: string;
  orderId: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

const CUSTOMER_REVIEWS_KEY = "team-desalsal-customer-reviews-v1";
const ADMIN_WORKSPACE_STORAGE_KEY = "team-desalsal-admin-workspaces-v1";
const CUSTOMER_REDEMPTIONS_KEY = "team-desalsal-reward-redemptions-v1";

// EDIT HERE before launch: proposed loyalty rules, not yet approved business policy.
const TREAT_PASSPORT_RULES = {
  programName: "Treat Passport",
  pesosPerPoint: 10,
  rewardPoints: 50,
  rewardTitle: "Bakery treat reward",
  rewardDescription: "Reward details will be announced once the team confirms them.",
};

function readLocalArray<T>(key: string): T[] {
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function TreatPassport({ orders }: { orders: Order[] }) {
  const [redemptions, setRedemptions] = useState<string[]>(() => readLocalArray<string>(CUSTOMER_REDEMPTIONS_KEY));
  const [message, setMessage] = useState("");
  const loyaltyRecords = readLocalArray<{ section: string; values: Record<string, string>; createdAt: string }>(ADMIN_WORKSPACE_STORAGE_KEY)
    .filter((record) => record.section === "Loyalty & Rewards")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const configured = loyaltyRecords[0]?.values ?? {};
  const parsedPesoRule = Number(configured.pesosPerPoint);
  const parsedRewardPoints = Number(configured.rewardPoints);
  const pesosPerPoint = Number.isFinite(parsedPesoRule) && parsedPesoRule > 0 ? parsedPesoRule : TREAT_PASSPORT_RULES.pesosPerPoint;
  const rewardPoints = Number.isFinite(parsedRewardPoints) && parsedRewardPoints > 0 ? parsedRewardPoints : TREAT_PASSPORT_RULES.rewardPoints;
  const programName = configured.programName?.trim() || TREAT_PASSPORT_RULES.programName;
  const rewardTitle = configured.rewardName?.trim() || TREAT_PASSPORT_RULES.rewardTitle;
  const earningRule = configured.stampRule?.trim() || "Points are calculated from completed orders. The earning rate will be confirmed by the team.";
  const rewardDescription = configured.rewardRule?.trim() || TREAT_PASSPORT_RULES.rewardDescription;
  const eligibleOrders = orders.filter((order) => ["Completed", "Delivered"].includes(order.status));
  const earnedPoints = eligibleOrders.reduce((sum, order) => sum + Math.floor(order.total / pesosPerPoint), 0);
  const spentPoints = redemptions.length * rewardPoints;
  const availablePoints = Math.max(0, earnedPoints - spentPoints);
  const progress = Math.min(100, (availablePoints / rewardPoints) * 100);

  function redeemReward() {
    if (availablePoints < rewardPoints) {
      setMessage(`You need ${rewardPoints - availablePoints} more points to unlock this reward.`);
      return;
    }
    const next = [...redemptions, `REWARD-${Date.now()}`];
    setRedemptions(next);
    window.localStorage.setItem(CUSTOMER_REDEMPTIONS_KEY, JSON.stringify(next));
    setMessage("Preview redemption recorded in this browser. Backend validation will be added later.");
  }

  return (
    <section className="section page-section engagement-page">
      <div className="engagement-hero reward-hero">
        <div><span className="eyebrow">A LITTLE THANK-YOU FOR YOU</span><h1>{programName}</h1><p>Collect points from completed orders and work toward a little bakery treat.</p></div>
        <div className="reward-balance"><span>Your preview balance</span><strong>{availablePoints}</strong><small>points available</small></div>
      </div>
      <div className="engagement-grid">
        <article className="engagement-card reward-progress-card">
          <span className="engagement-icon">🎟️</span><h2>Your progress</h2>
          <p>{earningRule}</p>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="progress-labels"><span>{availablePoints} points</span><span>{rewardPoints} points</span></div>
          <div className="reward-offer"><div><strong>{rewardTitle}</strong><p>{rewardDescription}</p></div><span>🎁</span></div>
          <button className="button button-primary" onClick={redeemReward} disabled={availablePoints < rewardPoints}>Redeem preview reward</button>
          {message && <p className="form-notice" role="status">{message}</p>}
        </article>
        <article className="engagement-card">
          <span className="engagement-icon">🧾</span><h2>Earn and use points</h2>
          <ol className="engagement-steps"><li>Place an order.</li><li>Receive your completed order.</li><li>Eligible purchases earn points.</li><li>Redeem points when rewards are available.</li></ol>
          <p className="small-note">Rewards are confirmed by the store before redemption.</p>
        </article>
      </div>
      <div className="engagement-card engagement-history"><div className="record-block-heading"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>Completed orders & redemptions</h2></div><span className="record-tag">{eligibleOrders.length} eligible order(s)</span></div>
        {eligibleOrders.length === 0 && redemptions.length === 0 ? <div className="empty-state compact-empty"><span>🌷</span><h3>Your Treat Passport starts here</h3><p>Completed orders and redemption history will appear here.</p></div> : <div className="engagement-history-list">{eligibleOrders.map((order) => <div key={order.id}><span>Order {order.id}</span><strong>+{Math.floor(order.total / pesosPerPoint)} points</strong><small>{new Date(order.createdAt).toLocaleDateString()}</small></div>)}{redemptions.map((id) => <div key={id}><span>{id}</span><strong>−{rewardPoints} points</strong><small>Preview redemption</small></div>)}</div>}
      </div>
      <p className="preview-disclaimer">Preview balance only. Your points are currently saved on this device.</p>
    </section>
  );
}

function CustomerReviews({ orders }: { orders: Order[] }) {
  const [reviews, setReviews] = useState<CustomerReview[]>(() => readLocalArray<CustomerReview>(CUSTOMER_REVIEWS_KEY));
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const completedOrders = orders.filter((order) => ["Completed", "Delivered"].includes(order.status));
  const reviewedOrderIds = new Set(reviews.map((review) => review.orderId));
  const reviewableOrders = completedOrders.filter((order) => !reviewedOrderIds.has(order.id));

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const order = reviewableOrders.find((item) => item.id === selectedOrderId);
    if (!order) { setMessage("Choose a completed order that has not already been reviewed."); return; }
    const purchasedItem = order.items.find((item) => item.productId === selectedProductId);
    if (!purchasedItem) { setMessage("Choose a product included in that order."); return; }
    const next: CustomerReview[] = [{ id: `REV-${crypto.randomUUID()}`, orderId: order.id, productId: selectedProductId, rating, comment: comment.trim(), createdAt: new Date().toISOString() }, ...reviews];
    setReviews(next);
    window.localStorage.setItem(CUSTOMER_REVIEWS_KEY, JSON.stringify(next));
    setComment(""); setSelectedOrderId(""); setSelectedProductId(""); setRating(5);
    setMessage("Review saved in this browser preview. Shared review storage and moderation will be added in the backend phase.");
  }

  const publishedReviews = reviews;
  return (
    <section className="section page-section engagement-page">
      <div className="section-heading"><span className="eyebrow">YOUR EXPERIENCE MATTERS</span><h1>Reviews & Ratings</h1><p>Share feedback about products you've received. Only completed orders can be reviewed in this preview.</p></div>
      <div className="engagement-grid reviews-layout">
        <form className="engagement-card review-form" onSubmit={submitReview}>
          <span className="engagement-icon">⭐</span><h2>Rate a completed order</h2>
          <label htmlFor="review-order">Completed order</label>
          <select id="review-order" value={selectedOrderId} onChange={(event) => { setSelectedOrderId(event.target.value); setSelectedProductId(""); }} required>
            <option value="">Choose an eligible order</option>{reviewableOrders.map((order) => <option key={order.id} value={order.id}>{order.id} · {new Date(order.createdAt).toLocaleDateString()}</option>)}
          </select>
          <label htmlFor="review-product">Product from that order</label>
          <select id="review-product" value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} required disabled={!selectedOrderId}>
            <option value="">Choose a product</option>{(reviewableOrders.find((order) => order.id === selectedOrderId)?.items ?? []).map((item) => { const product = PRODUCTS.find((p) => p.id === item.productId); return <option key={item.productId} value={item.productId}>{product?.name ?? item.productId}</option>; })}
          </select>
          <label>Rating</label><div className="rating-picker" role="radiogroup" aria-label="Select star rating">{[1,2,3,4,5].map((value) => <button key={value} type="button" className={value <= rating ? "rating-star selected" : "rating-star"} aria-label={`${value} stars`} aria-pressed={rating === value} onClick={() => setRating(value)}>★</button>)}</div>
          <label htmlFor="review-comment">Your feedback</label><textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1500} rows={4} placeholder="What did you enjoy, or what could we improve?" required />
          <button className="button button-primary full-width" type="submit" disabled={reviewableOrders.length === 0}>Submit review</button>
          {reviewableOrders.length === 0 && <p className="small-note">No eligible completed orders are available on this device yet, or all have already been reviewed.</p>}
          {message && <p className="form-notice" role="status">{message}</p>}
        </form>
        <div className="engagement-card">
          <span className="engagement-icon">💬</span><h2>Customer reviews</h2>
          {publishedReviews.length === 0 ? <div className="empty-state compact-empty"><span>💗</span><h3>Be the first to share</h3><p>Customer reviews will appear here after they are submitted.</p></div> : <div className="customer-review-list">{publishedReviews.map((review) => { const product = PRODUCTS.find((p) => p.id === review.productId); return <article key={review.id}><div className="review-card-heading"><strong>{product?.name ?? review.productId}</strong><span className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span></div><p>{review.comment}</p><small>Verified order reference: {review.orderId} · {new Date(review.createdAt).toLocaleDateString()}</small></article>; })}</div>}
          <p className="small-note">Reviews are local preview entries, not yet moderated or shared across devices.</p>
        </div>
      </div>
    </section>
  );
}

function CustomerPromotions() {
  const allRecords = readLocalArray<{ id: string; section: string; values: Record<string, string>; createdAt: string }>(ADMIN_WORKSPACE_STORAGE_KEY);
  const published = allRecords
    .filter((record) => record.section === "Promotions & Secret Menu" && record.values.status?.trim().toLowerCase() === "published")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <section className="section page-section engagement-page"><div className="section-heading"><span className="eyebrow">LITTLE SURPRISES</span><h1>Promotions & Secret Menu</h1><p>Discover limited offers and special releases from Team Desalsal.</p></div>
    {published.length === 0 ? <div className="empty-state promotions-empty"><span>✨</span><h3>Something sweet is in the works</h3><p>No promotions have been published yet. In the admin Promotions & Secret Menu workspace, add a confirmed offer and set Publishing status to <strong>Published</strong> to show it here.</p></div> : <div className="promotion-grid">{published.map((record) => { const promotion = record.values; return <article className="promotion-card" key={record.id}><span className="promotion-ribbon">LIMITED OFFER</span><h2>{promotion.promotionName || "Special offer"}</h2><p>{promotion.notes || promotion.discount || "Details will be announced soon."}</p>{promotion.code && <div className="promo-code">{promotion.code}</div>}{promotion.startEnd && <small>{promotion.startEnd}</small>}{promotion.eligibility && <p className="small-note">{promotion.eligibility}</p>}</article>; })}</div>}
    <p className="preview-disclaimer">Published admin entries are shared with this storefront only through this browser's local storage in the current preview. Database publishing will be connected during backend integration.</p>
  </section>;
}

function ProductPassports() {
  const passportRecords = readLocalArray<{ id: string; section: string; values: Record<string, string>; createdAt: string }>(ADMIN_WORKSPACE_STORAGE_KEY)
    .filter((record) => record.section === "QR Product Passports" && record.values.qrStatus?.trim().toLowerCase() === "published")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <section className="section page-section engagement-page"><div className="section-heading"><span className="eyebrow">KNOW WHAT YOU LOVE</span><h1>Product Passports</h1><p>Learn about our products and check verified ingredient and allergen information before ordering.</p></div>
    {passportRecords.length === 0 ? <div className="empty-state promotions-empty"><span>▦</span><h3>Product passports are being prepared</h3><p>No product passport has been published yet. Add a passport in the admin QR Product Passports workspace and set its status to Published only after verifying the product details and allergen notice.</p></div> : <div className="passport-grid">{passportRecords.map((record) => { const values = record.values; return <article className="passport-card" key={record.id}><div className="passport-art">🥧</div><div className="passport-card-body"><span className="eyebrow">TEAM DESALSAL PRODUCT PASSPORT</span><h2>{values.product || "Bakery product"}</h2><p>{values.description || "Product description not provided."}</p><div className="passport-info-row"><span>Ingredients / allergen notice</span><strong>{values.allergens || "No verified notice supplied"}</strong></div>{values.slug && <div className="passport-info-row"><span>Product page</span><strong>{values.slug}</strong></div>}<p className="small-note">Published passport record. For dietary or allergy decisions, the bakery should keep this information accurate and current.</p></div></article>; })}</div>}
  </section>;
}

function CustomerInbox({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Array<{id:string;title:string;body:string;created_at:string;read_at:string|null}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("customer_inbox").select("id,title,body,created_at,read_at").eq("user_id", userId).order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setError(`Inbox is not available yet. Apply the Supabase migration included with this update. (${error.message})`);
      else setMessages((data ?? []) as Array<{id:string;title:string;body:string;created_at:string;read_at:string|null}>);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);
  async function markRead(id: string) {
    const now = new Date().toISOString();
    const { error } = await supabase.from("customer_inbox").update({ read_at: now }).eq("id", id).eq("user_id", userId);
    if (!error) setMessages((current) => current.map((m) => m.id === id ? { ...m, read_at: now } : m));
    else setError(error.message);
  }
  return <section className="section page-section inbox-page"><div className="section-heading inbox-heading"><h1>Inbox</h1></div>
    {loading ? <div className="inbox-state">Loading your messages…</div> : error ? <div className="inbox-state inbox-error"><h3>Inbox setup needed</h3><p>{error}</p></div> : messages.length === 0 ? <div className="empty-state"><span>✉</span><h3>Your inbox is clear</h3><p>When Team Desalsal publishes an announcement, it will appear here.</p></div> : <div className="inbox-list">{messages.map((message) => <article className={`inbox-message ${message.read_at ? "is-read" : "is-unread"}`} key={message.id}><div className="inbox-message-symbol">{message.read_at ? "✓" : "✦"}</div><div className="inbox-message-main"><div className="inbox-message-meta"><span className={`inbox-unread-label ${message.read_at ? "read" : "unread"}`}>{message.read_at ? "Read" : "New message"}</span><time>{new Date(message.created_at).toLocaleString()}</time></div><h2>{message.title}</h2><p>{message.body}</p>{!message.read_at && <button className="button button-secondary" onClick={() => void markRead(message.id)}>Mark as read</button>}</div></article>)}</div>}
  </section>;
}

// ======================================================
// ADMIN DASHBOARD AND NAVIGATION
// ======================================================

type AdminSection =
  | "Dashboard"
  | "Products"
  | "Orders & Scheduling"
  | "Production"
  | "Inventory"
  | "Recipes & Costing"
  | "Sales & Finance"
  | "Waste & Surplus"
  | "Customers"
  | "Ratings & Feedback"
  | "Loyalty & Rewards"
  | "Product Lab"
  | "QR Product Passports"
  | "Reports & Documents"
  | "Business Intelligence"
  | "Settings"
  | "Announcements";

type AdminNavItem = {
  label: AdminSection;
  icon: string;
  description: string;
};

const ADMIN_NAV_GROUPS: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", icon: "▦", description: "Business overview, daily priorities, and key performance indicators." },
      { label: "Announcements", icon: "✉", description: "Publish updates to registered customers’ inboxes." },
    ],
  },
  {
    title: "STORE OPERATIONS",
    items: [
      { label: "Products", icon: "▣", description: "Manage product details, prices, availability, and public ingredient information." },
      { label: "Orders & Scheduling", icon: "☷", description: "Manage orders, pre-orders, pickup schedules, and delivery requests." },
      { label: "Production", icon: "◷", description: "Plan baking schedules, production queues, and batch records." },
      { label: "Inventory", icon: "▤", description: "Track ingredient stock, stock movements, and restocking alerts." },
      { label: "Recipes & Costing", icon: "♨", description: "Maintain private recipes, ingredient costs, and product margins." },
    ],
  },
  {
    title: "BUSINESS & FINANCE",
    items: [
      { label: "Sales & Finance", icon: "₱", description: "Review historical records, sales, expenses, and financial summaries." },
      { label: "Waste & Surplus", icon: "↻", description: "Record waste and manage surplus products." },
      { label: "Reports & Documents", icon: "▧", description: "Organize business reports and operational documentation." },
      { label: "Business Intelligence", icon: "⌁", description: "Explore business health, cost impact, and scenario analysis." },
    ],
  },
  {
    title: "CUSTOMERS & GROWTH",
    items: [
      { label: "Customers", icon: "♙", description: "Review customer accounts and order history." },
      { label: "Ratings & Feedback", icon: "☆", description: "Review eligible customer ratings and track improvements." },
      { label: "Loyalty & Rewards", icon: "✧", description: "Configure Treat Passport stamps, achievements, and rewards." },
      { label: "Product Lab", icon: "⚗", description: "Evaluate internal product ideas and potential launches." },
      { label: "QR Product Passports", icon: "▦", description: "Prepare public product information pages and QR codes." },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Settings", icon: "⚙", description: "Configure store policies, pickup hours, delivery coverage, and access." },
    ],
  },
];

type AdminProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  created_at?: string;
};

type ProductFormState = {
  name: string;
  description: string;
  price: string;
  image_url: string;
  is_active: boolean;
};

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: "",
  description: "",
  price: "10",
  image_url: "",
  is_active: true,
};


type AdminWorkspaceField = { key: string; label: string; placeholder: string; multiline?: boolean; required?: boolean };
type AdminWorkspaceRecord = { id: string; section: AdminSection; values: Record<string, string>; createdAt: string };

// EDIT HERE: Customize the fields shown in each admin workspace.
// Records entered in these workspaces are saved in this browser only until a database table is connected.
const ADMIN_WORKSPACE_FIELDS: Partial<Record<AdminSection, AdminWorkspaceField[]>> = {
  "Production": [
    { key: "batchName", label: "Batch / production name", placeholder: "e.g. Strawberry Pie batch A", required: true },
    { key: "product", label: "Product", placeholder: "product name" },
    { key: "quantity", label: "Planned quantity", placeholder: "number of pieces" },
    { key: "schedule", label: "Production date and time", placeholder: "date / time" },
    { key: "assignedTo", label: "Assigned team members", placeholder: "names" },
    { key: "notes", label: "Preparation notes", placeholder: "preparation steps, status, or reminders", multiline: true },
  ],
  "Inventory": [
    { key: "item", label: "Ingredient / supply", placeholder: "e.g. bread crumbs", required: true },
    { key: "quantity", label: "Quantity on hand", placeholder: "amount" },
    { key: "unit", label: "Unit", placeholder: "kg, packs, bottles, pieces" },
    { key: "reorderLevel", label: "Restock alert level", placeholder: "minimum quantity" },
    { key: "supplier", label: "Supplier", placeholder: "supplier name / contact" },
    { key: "notes", label: "Stock notes", placeholder: "expiry date, storage, or movement notes", multiline: true },
  ],
  "Recipes & Costing": [
    { key: "product", label: "Product / recipe name", placeholder: "product name", required: true },
    { key: "batchSize", label: "Batch yield", placeholder: "pieces per batch" },
    { key: "ingredients", label: "Ingredients and quantities", placeholder: "ingredient — quantity — unit cost", multiline: true },
    { key: "batchCost", label: "Estimated batch cost (₱)", placeholder: "total ingredient cost" },
    { key: "unitCost", label: "Estimated cost per piece (₱)", placeholder: "cost per piece" },
    { key: "notes", label: "Private recipe notes", placeholder: "method, yield, or costing assumptions", multiline: true },
  ],
  "Waste & Surplus": [
    { key: "product", label: "Product / ingredient", placeholder: "item name", required: true },
    { key: "quantity", label: "Quantity", placeholder: "amount" },
    { key: "reason", label: "Record type / reason", placeholder: "waste, damaged, expired, surplus, donated" },
    { key: "date", label: "Date", placeholder: "YYYY-MM-DD" },
    { key: "estimatedValue", label: "Estimated value (₱)", placeholder: "amount" },
    { key: "notes", label: "Action taken / notes", placeholder: "disposal, reuse, donation, follow-up", multiline: true },
  ],
  "Customers": [
    { key: "customerName", label: "Customer name", placeholder: "customer name", required: true },
    { key: "contact", label: "Contact information", placeholder: "only information needed for orders" },
    { key: "orderReference", label: "Order reference", placeholder: "order ID" },
    { key: "preferences", label: "Customer preferences", placeholder: "optional service preferences", multiline: true },
    { key: "notes", label: "Follow-up notes", placeholder: "customer service follow-up", multiline: true },
  ],
  "Ratings & Feedback": [
    { key: "orderReference", label: "Completed order ID", placeholder: "verify completed order", required: true },
    { key: "customer", label: "Customer name / reference", placeholder: "customer reference" },
    { key: "rating", label: "Rating (1–5)", placeholder: "1 to 5" },
    { key: "feedback", label: "Customer feedback", placeholder: "enter feedback only when received", multiline: true },
    { key: "resolution", label: "Response / resolution status", placeholder: "pending, replied, resolved" },
    { key: "notes", label: "Internal follow-up notes", placeholder: "actions taken", multiline: true },
  ],
  "Loyalty & Rewards": [
    { key: "programName", label: "Program / reward name", placeholder: "e.g. Treat Passport", required: true },
    { key: "stampRule", label: "Points earning rule", placeholder: "e.g. earn points from eligible completed orders" },
    { key: "pesosPerPoint", label: "Peso amount per point (₱)", placeholder: "e.g. 10" },
    { key: "rewardName", label: "Reward name", placeholder: "e.g. Free bakery treat" },
    { key: "rewardRule", label: "Reward description", placeholder: "which product or discount is offered" },
    { key: "rewardPoints", label: "Points required to redeem", placeholder: "e.g. 50" },
    { key: "validity", label: "Validity / limits", placeholder: "expiry or usage limits" },
    { key: "notes", label: "Program details", placeholder: "terms and redemption process", multiline: true },
  ],
  "Product Lab": [
    { key: "idea", label: "Experiment / product idea", placeholder: "concept name", required: true },
    { key: "flavor", label: "Flavor / ingredients concept", placeholder: "flavor or ingredients" },
    { key: "testBatch", label: "Test batch / sample size", placeholder: "quantity" },
    { key: "costEstimate", label: "Estimated cost (₱)", placeholder: "estimated cost" },
    { key: "testResults", label: "Test results", placeholder: "feedback, taste, texture, yield", multiline: true },
    { key: "decision", label: "Decision / next action", placeholder: "testing, revise, approve, hold" },
  ],
  "QR Product Passports": [
    { key: "product", label: "Product name", placeholder: "product name", required: true },
    { key: "slug", label: "Public page slug / URL", placeholder: "product page path" },
    { key: "description", label: "Public description", placeholder: "product story and description", multiline: true },
    { key: "allergens", label: "Allergen / ingredient notice", placeholder: "verify details before publishing", multiline: true },
    { key: "qrStatus", label: "Publishing status", placeholder: "Draft or Published after verifying details" },
  ],
  "Reports & Documents": [
    { key: "title", label: "Report / document title", placeholder: "report title", required: true },
    { key: "category", label: "Category", placeholder: "finance, sales, production, meeting" },
    { key: "reportDate", label: "Report date / period", placeholder: "date or reporting period" },
    { key: "owner", label: "Prepared by", placeholder: "team member" },
    { key: "location", label: "Document link / file location", placeholder: "approved shared file path or URL" },
    { key: "summary", label: "Summary / action items", placeholder: "short summary", multiline: true },
  ],
  "Business Intelligence": [
    { key: "question", label: "Business question", placeholder: "what do we want to understand?", required: true },
    { key: "period", label: "Analysis period", placeholder: "week, month, or date range" },
    { key: "metric", label: "Metric / evidence", placeholder: "actual data source and metric" },
    { key: "finding", label: "Finding", placeholder: "analysis based on recorded data", multiline: true },
    { key: "action", label: "Recommended action", placeholder: "next step" },
  ],
  "Settings": [
    { key: "storeHours", label: "Store / order hours", placeholder: "Monday - Friday", required: true },
    { key: "pickupRules", label: "Pickup policy", placeholder: "Pickup by arrangement at the confirmed location", multiline: true },
    { key: "deliveryAreas", label: "Delivery areas", placeholder: "Brgy. Maypangdan, Borongan City, Eastern Samar" },
    { key: "deliveryFees", label: "Delivery fee rules", placeholder: "area and fee" },
    { key: "capacity", label: "Order capacity / lead time", placeholder: "orders per slot and notice required" },
    { key: "contact", label: "Store contact details", placeholder: "jessacampoto@gmail.com · 09606674158" },
    { key: "policies", label: "Policies / additional details", placeholder: "Confirmed offer: 5 pieces for ₱45. Add other policies once confirmed.", multiline: true },
  ],
};


type AdminProps = {
  userId: string;
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addReviewNote: (orderId: string, note: string) => void;
};

function Admin({
  userId,
  orders,
  updateOrderStatus,
  addReviewNote,
}: AdminProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>("Dashboard");
  const [adminNavCollapsed, setAdminNavCollapsed] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [productsMessage, setProductsMessage] = useState("");
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [workspaceRecords, setWorkspaceRecords] = useState<AdminWorkspaceRecord[]>(() => {
    try {
      const saved = window.localStorage.getItem(ADMIN_WORKSPACE_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as AdminWorkspaceRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [workspaceDraft, setWorkspaceDraft] = useState<Record<string, string>>({});
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [customerReviews, setCustomerReviews] = useState<CustomerReview[]>(() => readLocalArray<CustomerReview>(CUSTOMER_REVIEWS_KEY));
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementRecords, setAnnouncementRecords] = useState<Array<{id:string;title:string;body:string;created_at:string}>>([]);

  function removeCustomerReview(reviewId: string) {
    const next = customerReviews.filter((review) => review.id !== reviewId);
    setCustomerReviews(next);
    window.localStorage.setItem(CUSTOMER_REVIEWS_KEY, JSON.stringify(next));
  }

  function saveWorkspaceRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = ADMIN_WORKSPACE_FIELDS[activeSection];
    if (!fields) return;
    const values = Object.fromEntries(fields.map((field) => [field.key, (workspaceDraft[field.key] ?? "").trim()]));
    const missingRequired = fields.find((field) => field.required && !values[field.key]);
    if (missingRequired) {
      setWorkspaceMessage(`Please complete “${missingRequired.label}”.`);
      return;
    }
    const record: AdminWorkspaceRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      section: activeSection,
      values,
      createdAt: new Date().toISOString(),
    };
    const next = [record, ...workspaceRecords];
    setWorkspaceRecords(next);
    try {
      window.localStorage.setItem(ADMIN_WORKSPACE_STORAGE_KEY, JSON.stringify(next));
      setWorkspaceMessage("Entry saved in this browser. It is not yet shared with other devices.");
      setWorkspaceDraft({});
    } catch {
      setWorkspaceRecords(workspaceRecords);
      setWorkspaceMessage("Could not save this entry in browser storage. Check available storage and try again.");
    }
  }

  function deleteWorkspaceRecord(recordId: string) {
    const next = workspaceRecords.filter((record) => record.id !== recordId);
    setWorkspaceRecords(next);
    try {
      window.localStorage.setItem(ADMIN_WORKSPACE_STORAGE_KEY, JSON.stringify(next));
      setWorkspaceMessage("Entry removed from this browser.");
    } catch {
      setWorkspaceMessage("Could not update browser storage.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,price,image_url,is_active,created_at")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        setProductsError(error.message);
        setProducts([]);
      } else {
        setProductsError("");
        setProducts((data ?? []) as AdminProduct[]);
      }
      setProductsLoading(false);
    }

    if (activeSection === "Products") void loadProducts();
    return () => { cancelled = true; };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "Announcements") return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("announcements").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(30);
      if (cancelled) return;
      if (error) setAnnouncementMessage(`Could not load announcements: ${error.message}`);
      else setAnnouncementRecords((data ?? []) as Array<{id:string;title:string;body:string;created_at:string}>);
    })();
    return () => { cancelled = true; };
  }, [activeSection]);

  async function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = announcementTitle.trim();
    const body = announcementBody.trim();
    if (!title || !body) { setAnnouncementMessage("Add a title and message before publishing."); return; }
    setAnnouncementSaving(true);
    setAnnouncementMessage("");
    const { data, error } = await supabase.from("announcements").insert({ title, body, created_by: userId }).select("id,title,body,created_at").single();
    setAnnouncementSaving(false);
    if (error) { setAnnouncementMessage(`Could not publish. Check the announcements database setup and permissions: ${error.message}`); return; }
    setAnnouncementRecords((current) => [data as {id:string;title:string;body:string;created_at:string}, ...current]);
    setAnnouncementTitle(""); setAnnouncementBody("");
    setAnnouncementMessage("Published. Registered customer accounts will receive this in their inbox.");
  }

  function resetProductForm() {
    setProductForm(EMPTY_PRODUCT_FORM);
    setEditingProductId(null);
    setProductsMessage("");
  }

  function beginProductEdit(product: AdminProduct) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      image_url: product.image_url ?? "",
      is_active: product.is_active,
    });
    setProductsMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductsMessage("");
    setProductsError("");

    const name = productForm.name.trim();
    const price = Number(productForm.price);
    if (!name) {
      setProductsError("Enter a product name.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setProductsError("Enter a valid price of ₱0 or more.");
      return;
    }

    setProductSaving(true);
    const payload = {
      name,
      description: productForm.description.trim(),
      price,
      image_url: productForm.image_url.trim() || null,
      is_active: productForm.is_active,
    };

    const result = editingProductId
      ? await supabase.from("products").update(payload).eq("id", editingProductId).select("id,name,description,price,image_url,is_active,created_at").single()
      : await supabase.from("products").insert(payload).select("id,name,description,price,image_url,is_active,created_at").single();

    setProductSaving(false);
    if (result.error) {
      setProductsError(result.error.message);
      return;
    }

    const saved = result.data as AdminProduct;
    setProducts((current) => editingProductId
      ? current.map((product) => product.id === saved.id ? saved : product)
      : [saved, ...current]);
    setProductsMessage(editingProductId ? "Product details updated." : "Product added to the catalog.");
    window.dispatchEvent(new Event("team-desalsal-catalog-refresh"));
    setProductForm(EMPTY_PRODUCT_FORM);
    setEditingProductId(null);
  }

  async function toggleProductAvailability(product: AdminProduct) {
    setProductsError("");
    setProductsMessage("");
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id)
      .select("id,name,description,price,image_url,is_active,created_at")
      .single();

    if (error) {
      setProductsError(error.message);
      return;
    }
    const updated = data as AdminProduct;
    setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
    setProductsMessage(updated.is_active ? "Product is now active." : "Product is now hidden from the active catalog.");
  }

  async function seedStarterProducts() {
    setProductsError("");
    setProductsMessage("");
    setProductSaving(true);
    const starterProducts = [
      { name: "Choco Pi Ta Byte", description: "Crispy bread wrapped around a warm chocolate center.", price: 10, image_url: null, is_active: true },
      { name: "Strawberry Pie", description: "A sweet strawberry-flavored pie for sharing.", price: 10, image_url: null, is_active: true },
    ];
    const { data, error } = await supabase
      .from("products")
      .insert(starterProducts)
      .select("id,name,description,price,image_url,is_active,created_at");
    setProductSaving(false);
    if (error) {
      setProductsError(error.message);
      return;
    }
    const inserted = (data ?? []) as AdminProduct[];
    setProducts((current) => [...inserted, ...current]);
    setProductsMessage("Starter catalog added. Both products are set to ₱10 per piece.");
  }

  const displayedOrders = orders.filter((order) => {
    const matchesSearch =
      filter === "All" || order.id.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = orders.filter(
    (order) => order.status === "Pending",
  ).length;
  const activeCount = orders.filter((order) =>
    ["Confirmed", "Preparing", "Ready", "Out for delivery"].includes(order.status),
  ).length;
  const completedOrders = orders.filter((order) => ["Completed", "Delivered"].includes(order.status));
  const completedRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
  const completedPieces = completedOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const currentOriginalRevenue = completedOrders.reduce((sum, order) => sum + order.items.filter((item) => item.productId === "choco-pi-ta-byte").reduce((itemSum, item) => itemSum + item.quantity * (PRODUCTS.find((product) => product.id === item.productId)?.price ?? 0), 0), 0);
  const currentStrawberryRevenue = completedOrders.reduce((sum, order) => sum + order.items.filter((item) => item.productId === "strawberry-pie").reduce((itemSum, item) => itemSum + item.quantity * (PRODUCTS.find((product) => product.id === item.productId)?.price ?? 0), 0), 0);
  const totalRecordedRevenue = completedRevenue;
  const averageCompletedOrder = completedOrders.length ? completedRevenue / completedOrders.length : 0;
  const cancellationCount = orders.filter((order) => order.status === "Cancelled").length;

  const activeNavItem = ADMIN_NAV_GROUPS.flatMap((group) => group.items).find((item) => item.label === activeSection);
  const workspaceFields = ADMIN_WORKSPACE_FIELDS[activeSection] ?? [];
  const activeWorkspaceRecords = workspaceRecords.filter((record) => record.section === activeSection);

  return (
    <section className="section page-section admin-workspace">
      <div className={`admin-workspace-layout ${adminNavCollapsed ? "admin-nav-collapsed" : ""}`}>
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <div className="admin-sidebar-brand">
            <span className="admin-brand-mark" aria-hidden="true">🥧</span>
            <div className="admin-sidebar-brand-copy"><span className="eyebrow">TEAM DESALSAL</span><h2>Workspace</h2><p>Business management</p></div>
            <button type="button" className="admin-sidebar-toggle" onClick={() => setAdminNavCollapsed((collapsed) => !collapsed)} aria-label={adminNavCollapsed ? "Expand admin navigation" : "Collapse admin navigation"} title={adminNavCollapsed ? "Expand navigation" : "Collapse navigation"}>☰</button>
          </div>
          {ADMIN_NAV_GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.title}>
              <p className="admin-nav-group-title">{group.title}</p>
              <div className="admin-nav-items">
                {group.items.map((item) => {
                  const selected = activeSection === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setActiveSection(item.label);
                        setWorkspaceDraft({});
                        setWorkspaceMessage("");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      aria-current={selected ? "page" : undefined}
                      title={item.label}
                      aria-label={`${item.label}. ${item.description}`}
                      data-tooltip={item.label}
                      className={`admin-nav-item ${selected ? "active" : ""}`}
                    >
                      <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                      <span className="admin-nav-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <div className="admin-workspace-main">
          <div className="admin-heading">
            <div>
              <span className="eyebrow">ADMINISTRATION</span>
              <h1>{activeSection}</h1>
              <p>{activeNavItem?.description ?? "Manage your Team Desalsal business."}</p>
            </div>
            {activeSection === "Orders & Scheduling" && <span className="record-tag live-record-tag">{pendingCount} pending</span>}
          </div>

          {activeSection === "Products" && (
            <div className="product-admin-page" style={{ display: "grid", gap: "22px" }}>
              <section className="record-block" style={{ padding: "22px", background: "#fff", border: "1px solid var(--line)", borderRadius: "20px" }}>
                <div className="record-block-heading" style={{ alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                  <div>
                    <span className="eyebrow">PRODUCT CATALOG</span>
                    <h2 style={{ margin: "5px 0 6px" }}>{editingProductId ? "Edit product" : "Add a product"}</h2>
                    <p className="financial-note" style={{ margin: 0 }}>Manage names, descriptions, prices, product images, and visibility.</p>
                  </div>
                  <span className="record-tag">{products.length} product{products.length === 1 ? "" : "s"}</span>
                </div>
                <form onSubmit={saveProduct} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginTop: "20px" }}>
                  <div style={{ display: "grid", gap: "6px" }}>
                    <label htmlFor="product-name">Product name *</label>
                    <input id="product-name" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} maxLength={120} required placeholder="e.g. Choco Pi Ta Byte" />
                  </div>
                  <div style={{ display: "grid", gap: "6px" }}>
                    <label htmlFor="product-price">Price per piece (₱) *</label>
                    <input id="product-price" type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} required />
                  </div>
                  <div style={{ display: "grid", gap: "6px", gridColumn: "1 / -1" }}>
                    <label htmlFor="product-description">Description</label>
                    <textarea id="product-description" rows={3} maxLength={1000} value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the product for customers..." />
                  </div>
                  <div style={{ display: "grid", gap: "6px", gridColumn: "1 / -1" }}>
                    <label htmlFor="product-image-url">Product image URL (optional)</label>
                    <input id="product-image-url" type="url" value={productForm.image_url} onChange={(event) => setProductForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="https://..." />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "9px", gridColumn: "1 / -1" }}>
                    <input type="checkbox" checked={productForm.is_active} onChange={(event) => setProductForm((current) => ({ ...current, is_active: event.target.checked }))} style={{ width: "18px", height: "18px" }} />
                    Active product (visible in the active catalog)
                  </label>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", gridColumn: "1 / -1" }}>
                    <button className="button button-primary" type="submit" disabled={productSaving}>{productSaving ? "Saving..." : editingProductId ? "Save changes" : "Add product"}</button>
                    {editingProductId && <button className="button button-secondary" type="button" onClick={resetProductForm}>Cancel edit</button>}
                  </div>
                </form>
              </section>

              {productsError && <div role="alert" className="form-warning" style={{ padding: "12px 14px", borderRadius: "12px" }}><strong>Product catalog error:</strong> {productsError}</div>}
              {productsMessage && <div role="status" style={{ padding: "12px 14px", borderRadius: "12px", background: "#f0f8f0", color: "#27633b" }}>{productsMessage}</div>}

              <section className="record-block" style={{ padding: "22px", background: "#fff", border: "1px solid var(--line)", borderRadius: "20px" }}>
                <div className="record-block-heading"><div><span className="eyebrow">MANAGE PRODUCTS</span><h2 style={{ margin: "5px 0" }}>Catalog inventory</h2></div></div>
                {productsLoading ? (
                  <p className="small-note">Loading products from Supabase...</p>
                ) : productsError && products.length === 0 ? (
                  <p className="small-note">Check your products table and admin RLS policies. Once access is configured, products will appear here.</p>
                ) : products.length === 0 ? (
                  <div className="empty-state" style={{ padding: "28px 16px" }}>
                    <span aria-hidden="true" style={{ fontSize: "2rem" }}>🥧</span>
                    <h3>Your product catalog is empty</h3>
                    <p>Add a product using the form above, or create the two existing Team Desalsal products at ₱10 per piece.</p>
                    <button type="button" className="button button-secondary" disabled={productSaving} onClick={seedStarterProducts}>{productSaving ? "Adding products..." : "Add Team Desalsal starter products"}</button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
                    {products.map((product) => (
                      <article key={product.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "16px", alignItems: "center", padding: "16px", border: "1px solid var(--line)", borderRadius: "16px", background: product.is_active ? "#fffdfc" : "#faf7f6" }}>
                        <div style={{ minWidth: 0, display: "flex", gap: "14px", alignItems: "center" }}>
                          {product.image_url ? <img src={product.image_url} alt="" loading="lazy" style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "12px", border: "1px solid var(--line)" }} /> : <div aria-hidden="true" style={{ display: "grid", placeItems: "center", width: "72px", height: "72px", flexShrink: 0, borderRadius: "12px", background: "var(--pink-pale)", fontSize: "1.8rem" }}>🥧</div>}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}><h3 style={{ margin: 0, fontSize: "1rem" }}>{product.name}</h3><span className="record-tag" style={{ color: product.is_active ? "#27633b" : "var(--muted)", background: product.is_active ? "#edf8ef" : "#f1efed" }}>{product.is_active ? "Active" : "Hidden"}</span></div>
                            <p style={{ margin: "6px 0", color: "var(--muted)", fontSize: ".9rem", overflowWrap: "anywhere" }}>{product.description || "No description added yet."}</p>
                            <strong style={{ color: "var(--pink-dark)" }}>{formatPrice(Number(product.price))} <span style={{ fontWeight: 500, color: "var(--muted)", fontSize: ".8rem" }}>per piece</span></strong>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button type="button" className="button button-secondary" onClick={() => beginProductEdit(product)}>Edit</button>
                          <button type="button" className="button button-secondary" onClick={() => void toggleProductAvailability(product)}>{product.is_active ? "Hide" : "Activate"}</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <p className="small-note">Active catalog records are loaded from Supabase and shown in the storefront. Changes appear after the catalog refreshes.</p>
            </div>
          )}

          {activeSection === "Announcements" && (
            <div className="announcement-admin-layout">
              <section className="record-block announcement-composer">
                <div className="record-block-heading"><div><span className="eyebrow">CUSTOMER COMMUNICATIONS</span><h2>Compose an announcement</h2><p>Published messages appear in registered customers’ Team Desalsal inbox.</p></div><span className="record-tag">Supabase</span></div>
                <form onSubmit={publishAnnouncement} className="announcement-compose-form">
                  <label>Announcement title<input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} maxLength={120} placeholder="e.g. Weekend orders are now open" required /></label>
                  <label>Message<textarea value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} maxLength={4000} rows={5} placeholder="Write a clear update about promotions, ordering hours, pickup, or important notices…" required /></label>
                  <div className="announcement-compose-footer"><span className="small-note">Keep messages useful and avoid sharing private customer information.</span><button className="button button-primary" type="submit" disabled={announcementSaving}>{announcementSaving ? "Publishing…" : "Publish announcement"}</button></div>
                </form>
                {announcementMessage && <p className="announcement-feedback" role="status">{announcementMessage}</p>}
              </section>
              <section className="record-block announcement-records">
                <div className="record-block-heading"><div><span className="eyebrow">PUBLICATION HISTORY</span><h2>Recent announcements</h2></div><span className="record-tag">{announcementRecords.length} records</span></div>
                {announcementRecords.length === 0 ? <div className="empty-state"><span>✉</span><h3>No announcements yet</h3><p>Your published messages will appear here after the database is configured.</p></div> : <div className="announcement-record-list">{announcementRecords.map((item) => <article className="announcement-record" key={item.id}><div className="announcement-record-icon">✦</div><div className="announcement-record-copy"><div className="announcement-record-meta"><span className="status-badge status-delivered">Published</span><time>{new Date(item.created_at).toLocaleString()}</time></div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div>}
              </section>
            </div>
          )}

          {activeSection === "Dashboard" && (
            <>
              <div className="admin-stats">
        <article className="admin-stat">
          <span>Pending Orders</span>
          <strong>{pendingCount}</strong>
        </article>
        <article className="admin-stat">
          <span>Active Orders</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="admin-stat">
          <span>All Orders</span>
          <strong>{orders.length}</strong>
        </article>
        <article className="admin-stat">
          <span>Completed Revenue</span>
          <strong>{formatPrice(completedRevenue)}</strong>
        </article>
              </div>
              <div className="record-block overall-analysis" style={{ marginTop: "22px" }}>
                <div className="record-block-heading"><div><span className="eyebrow">QUICK BUSINESS VIEW</span><h3>Today's Priorities</h3></div></div>
                <div className="analysis-grid">
                  <article><span>Pending orders</span><strong>{pendingCount}</strong><p>Orders awaiting confirmation or action</p></article>
                  <article><span>Active orders</span><strong>{activeCount}</strong><p>Confirmed, preparing, or ready</p></article>
                  <article><span>Low-stock alerts</span><strong>Not configured</strong><p>Inventory tracking will be connected in a later step</p></article>
                </div>
                <p className="financial-note">Current order and sales totals are still browser-local. Shared, multi-device figures will require the database integration stage.</p>
              </div>
              <section className="admin-media-library" aria-labelledby="admin-media-heading">
                <div className="admin-media-library-heading"><div><span className="eyebrow">BRAND ASSETS</span><h2 id="admin-media-heading">Media &amp; documentation space</h2><p>Plan and organize the images you will add to the storefront and business records.</p></div><span className="record-tag">Placeholder</span></div>
                <div className="empty-state admin-media-empty">
                  <span aria-hidden="true">▧</span>
                  <h3>No media records yet</h3>
                  <p>There are no uploaded media records to display. Media storage and uploads are not connected to Supabase yet.</p>
                </div>
                <p className="small-note">This panel is a visual planning area only. File uploads and shared media storage are not connected yet.</p>
              </section>
            </>
          )}

          {activeSection === "Sales & Finance" && (
            <section className="financial-section" aria-labelledby="financial-heading">
        <div className="section-heading financial-heading">
          <span className="eyebrow">ADMIN-ONLY BUSINESS RECORDS</span>
          <h2 id="financial-heading">Sales Records &amp; Business Analysis</h2>
          <p>Historical figures are entered manually. Current figures below update from orders marked Completed or Delivered.</p>
        </div>

        <div className="record-block historical-record">
          <div className="record-block-heading"><div><span className="eyebrow">MANUAL / HISTORICAL ENTRY</span><h3>Last Week's Record</h3></div><span className="record-tag">Historical</span></div>
          <p className="financial-note">These are the figures reported for last week's product activity. They remain separate from new website orders.</p>
          <div className="financial-product-grid">
            <article className="financial-card">
              <div className="financial-card-top"><span className="financial-emoji">🍫</span><div><h4>Original Choco Pi Ta Byte</h4><p>Last week's manually recorded figures</p></div></div>
              <div className="financial-table-wrap"><table className="financial-table"><thead><tr><th>Ingredient</th><th>Purchase cost</th></tr></thead><tbody>
                <tr><td>Sliced bread</td><td>₱45</td></tr><tr><td>Bread crumbs</td><td>₱45</td></tr><tr><td>Flat Tops</td><td>₱65</td></tr><tr><td>Eggs</td><td>₱30</td></tr><tr><td>Oil</td><td>₱50</td></tr>
              </tbody><tfoot><tr><th>Total purchases</th><th>₱235</th></tr></tfoot></table></div>
              <div className="financial-metric"><span>Recorded sales revenue</span><strong>₱240</strong></div>
            </article>
            <article className="financial-card">
              <div className="financial-card-top"><span className="financial-emoji">✨</span><div><h4>Innovated Product</h4><p>35 pieces sold at ₱10 each</p></div></div>
              <div className="financial-table-wrap"><table className="financial-table"><thead><tr><th>Ingredient</th><th>Purchase cost</th></tr></thead><tbody>
                <tr><td>Bread</td><td>₱110</td></tr><tr><td>Eggs</td><td>₱36</td></tr><tr><td>Bread crumbs</td><td>₱38</td></tr><tr><td>Jamin</td><td>₱138</td></tr><tr><td>Oil</td><td>₱100</td></tr>
              </tbody><tfoot><tr><th>Total purchases</th><th>₱422</th></tr></tfoot></table></div>
              <div className="financial-metric"><span>Recorded sales revenue</span><strong>₱350</strong></div>
              <p className="financial-note">Some purchased ingredients remained and were eaten by the team. Purchase costs are not the same as the actual cost of ingredients used in sold pieces.</p>
            </article>
          </div>
          <div className="financial-summary">
            <div><span>Original product sales</span><strong>₱240</strong></div>
            <div><span>Innovated product sales</span><strong>₱350</strong></div>
            <div className="financial-summary-total"><span>Last week's total sales</span><strong>₱590</strong></div>
            <div><span>Total ingredient purchases</span><strong>₱657</strong></div>
          </div>
          <p className="financial-disclaimer">Historical record only. Do not treat the difference between sales and total purchases as confirmed profit because leftover ingredients and other costs have not been valued.</p>
        </div>

        <div className="record-block current-record">
          <div className="record-block-heading"><div><span className="eyebrow">AUTOMATIC ORDER-BASED RECORD</span><h3>Current Website Sales</h3></div><span className="record-tag live-record-tag">Updates from completed orders</span></div>
          <p className="financial-note">These totals are calculated from orders currently saved in this website. Only orders marked Completed or Delivered count as sales revenue; pending, cancelled, and in-progress orders are excluded.</p>
          <div className="current-record-stats">
            <article><span>Completed sales revenue</span><strong>{formatPrice(completedRevenue)}</strong></article>
            <article><span>Completed orders</span><strong>{completedOrders.length}</strong></article>
            <article><span>Pieces sold</span><strong>{completedPieces}</strong></article>
            <article><span>Average completed order</span><strong>{formatPrice(averageCompletedOrder)}</strong></article>
          </div>
          <div className="financial-summary current-product-summary">
            <div><span>Choco Pi Ta Byte revenue</span><strong>{formatPrice(currentOriginalRevenue)}</strong></div>
            <div><span>Strawberry Pie revenue</span><strong>{formatPrice(currentStrawberryRevenue)}</strong></div>
            <div><span>Pending orders</span><strong>{pendingCount}</strong></div>
            <div><span>Cancelled orders</span><strong>{cancellationCount}</strong></div>
          </div>
        </div>

        <div className="record-block overall-analysis">
          <div className="record-block-heading"><div><span className="eyebrow">ADMIN INSIGHTS</span><h3>Overall Business Analysis</h3></div></div>
          <div className="analysis-highlight"><span>Completed-order revenue recorded in the current order list</span><strong>{formatPrice(totalRecordedRevenue)}</strong></div>
          <div className="analysis-grid">
            <article><span>Completed-order sales</span><strong>{formatPrice(completedRevenue)}</strong><p>Completed or delivered orders only</p></article>
            <article><span>Order completion rate</span><strong>{orders.length ? `${Math.round((completedOrders.length / orders.length) * 100)}%` : "0%"}</strong><p>Completed orders divided by all website orders</p></article>
          </div>
          <p className="financial-disclaimer">This analysis counts completed or delivered orders available to the current session. It does not include unverified historical sales or deduct ingredient and operating expenses. Use recorded source data before making financial decisions.</p>
        </div>
            </section>
          )}

          {activeSection === "Orders & Scheduling" && (
            <>
              <div className="admin-stats">
                <article className="admin-stat"><span>Pending Orders</span><strong>{pendingCount}</strong></article>
                <article className="admin-stat"><span>Active Orders</span><strong>{activeCount}</strong></article>
                <article className="admin-stat"><span>All Orders</span><strong>{orders.length}</strong></article>
                <article className="admin-stat"><span>Completed Revenue</span><strong>{formatPrice(completedRevenue)}</strong></article>
              </div>
              <div className="admin-filters">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search order ID..."
          aria-label="Search orders"
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter order status"
        >
          {[
            "All",
            "Pending",
            "Confirmed",
            "Preparing",
            "Ready",
            "Out for delivery",
            "Completed",
            "Delivered",
            "Cancelled",
          ].map((status) => (
            <option key={status} value={status}>
              {status === "All" ? "All statuses" : status}
            </option>
          ))}
        </select>
              </div>

              {displayedOrders.length === 0 ? (
        <div className="empty-state">
          <span>📋</span>
          <h3>No orders to display</h3>
          <p>Orders created through this browser will appear here.</p>
        </div>
      ) : (
        <div className="admin-orders">
          {displayedOrders.map((order) => (
            <article className="admin-order-card" key={order.id}>
              <div className="order-card-header">
                <div>
                  <h3>{order.id}</h3>
                  <p>{order.customerName}</p>
                  <p>{order.phone}</p>
                  <p>{order.fulfillmentType ?? "Delivery"} · {order.paymentMethod ?? "Confirm with team"}</p>
                  {order.fulfillmentType !== "Pickup" && <p>{order.address}</p>}
                </div>
                <span
                  className={`status-badge status-${order.status.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="admin-order-products">
                {order.items.map((item) => {
                  const product = PRODUCTS.find(
                    (p) => p.id === item.productId,
                  );

                  return (
                    <p key={item.productId}>
                      {product?.name} × {item.quantity}
                    </p>
                  );
                })}
              </div>

              <div className="summary-line">
                <span>Discount</span>
                <strong>{formatPrice(order.discount)}</strong>
              </div>
              <div className="summary-total">
                <span>Order Total</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>

              <label htmlFor={`status-${order.id}`}>Update Status</label>
              <select
                id={`status-${order.id}`}
                value={order.status}
                onChange={(event) =>
                  updateOrderStatus(
                    order.id,
                    event.target.value as OrderStatus,
                  )
                }
              >
                {[
                  "Pending",
                  "Confirmed",
                  "Preparing",
                  "Ready",
                  "Out for delivery",
                  "Completed",
                  "Delivered",
                  "Cancelled",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <label htmlFor={`note-${order.id}`}>
                Review Note / Violation Record
              </label>
              <textarea
                id={`note-${order.id}`}
                rows={2}
                maxLength={500}
                value={notes[order.id] ?? order.violationNote ?? ""}
                onChange={(event) =>
                  setNotes((previous) => ({
                    ...previous,
                    [order.id]: event.target.value,
                  }))
                }
                placeholder="Record a reason, incident, or follow-up..."
              />

              <button
                className="button button-secondary"
                onClick={() =>
                  addReviewNote(order.id, notes[order.id] ?? "")
                }
              >
                Save Review Note
              </button>
            </article>
          ))}
        </div>
      )}

              <p className="small-note">
                Preview mode: these orders are saved on this device and are not shared across devices.
              </p>
            </>
          )}

          {activeSection === "Ratings & Feedback" && (
            <section className="record-block customer-review-admin-block" style={{ padding: "22px", background: "#fff", border: "1px solid var(--line)", borderRadius: "20px", marginBottom: "20px" }}>
              <div className="record-block-heading"><div><span className="eyebrow">CUSTOMER SUBMISSIONS</span><h2 style={{ margin: "5px 0 6px" }}>Storefront reviews</h2><p className="financial-note" style={{ margin: 0 }}>Reviews submitted through the customer page on this browser.</p></div><span className="record-tag">{customerReviews.length} review(s)</span></div>
              {customerReviews.length === 0 ? <div className="empty-state compact-empty"><span>☆</span><h3>No customer reviews yet</h3><p>When customers submit a review for a completed order in this browser preview, it will appear here.</p></div> : <div className="customer-review-list">{customerReviews.map((review) => { const product = PRODUCTS.find((item) => item.id === review.productId); return <article key={review.id}><div className="review-card-heading"><strong>{product?.name ?? review.productId}</strong><span className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span></div><p>{review.comment}</p><small>Order {review.orderId} · {new Date(review.createdAt).toLocaleString()}</small><div style={{ marginTop: "12px" }}><button type="button" className="button button-secondary" onClick={() => removeCustomerReview(review.id)}>Remove preview review</button></div></article>; })}</div>}
              <p className="preview-disclaimer" style={{ marginTop: "14px" }}>Browser-local preview only. In production, review ownership, eligibility, moderation, and deletion permissions must be enforced by the backend.</p>
            </section>
          )}

          {workspaceFields.length > 0 && (
            <div style={{ display: "grid", gap: "20px" }}>
              <section className="record-block" style={{ padding: "22px", background: "#fff", border: "1px solid var(--line)", borderRadius: "20px" }}>
                <div className="record-block-heading" style={{ alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <span className="eyebrow">WORKSPACE ENTRY</span>
                    <h2 style={{ margin: "5px 0 6px" }}>Add {activeSection.toLowerCase()} details</h2>
                    <p className="financial-note" style={{ margin: 0 }}>Add your details below. Saved entries will appear in the list.</p>
                  </div>
                  <span className="record-tag">{activeWorkspaceRecords.length} saved entr{activeWorkspaceRecords.length === 1 ? "y" : "ies"}</span>
                </div>
                <form onSubmit={saveWorkspaceRecord} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginTop: "20px" }}>
                  {workspaceFields.map((field) => (
                    <div key={field.key} style={{ display: "grid", gap: "6px", gridColumn: field.multiline ? "1 / -1" : undefined }}>
                      <label htmlFor={`workspace-${activeSection}-${field.key}`}>{field.label}{field.required ? " *" : ""}</label>
                      {field.multiline ? (
                        <textarea id={`workspace-${activeSection}-${field.key}`} rows={3} maxLength={4000} value={workspaceDraft[field.key] ?? ""} onChange={(event) => setWorkspaceDraft((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} required={field.required} />
                      ) : (
                        <input id={`workspace-${activeSection}-${field.key}`} value={workspaceDraft[field.key] ?? ""} onChange={(event) => setWorkspaceDraft((current) => ({ ...current, [field.key]: event.target.value }))} maxLength={1000} placeholder={field.placeholder} required={field.required} />
                      )}
                    </div>
                  ))}
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button className="button button-primary" type="submit">Save {activeSection} Entry</button>
                    <button className="button button-secondary" type="button" onClick={() => { setWorkspaceDraft({}); setWorkspaceMessage(""); }}>Clear Form</button>
                  </div>
                </form>
                {workspaceMessage && <p className="small-note" role="status" style={{ marginTop: "14px" }}>{workspaceMessage}</p>}
              </section>

              <section className="record-block" style={{ padding: "22px", background: "#fff", border: "1px solid var(--line)", borderRadius: "20px" }}>
                <div className="record-block-heading"><div><span className="eyebrow">SAVED ENTRIES</span><h2 style={{ margin: "5px 0 6px" }}>{activeSection} records</h2></div><span className="record-tag">{activeWorkspaceRecords.length} total</span></div>
                {activeWorkspaceRecords.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: "14px" }}><span aria-hidden="true">{activeNavItem?.icon ?? "✦"}</span><h3>No entries yet</h3><p>Use the form above to add your first real {activeSection.toLowerCase()} entry.</p></div>
                ) : (
                  <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
                    {activeWorkspaceRecords.map((record) => (
                      <article key={record.id} style={{ border: "1px solid var(--line)", borderRadius: "14px", padding: "16px", background: "#fffdfb" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                          <div style={{ display: "grid", gap: "8px", minWidth: 0, flex: "1 1 320px" }}>
                            {workspaceFields.map((field) => record.values[field.key] ? (
                              <div key={field.key} style={{ overflowWrap: "anywhere" }}><strong>{field.label}: </strong><span style={{ whiteSpace: "pre-wrap" }}>{record.values[field.key]}</span></div>
                            ) : null)}
                            <p className="small-note" style={{ margin: "4px 0 0" }}>Saved {new Date(record.createdAt).toLocaleString()}</p>
                          </div>
                          <button type="button" className="button button-secondary" onClick={() => deleteWorkspaceRecord(record.id)} aria-label={`Delete ${activeSection} entry`}>Delete entry</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <p className="small-note">Local workspace mode: these entries are saved in this browser only. They are not Supabase records, are not shared across devices, and do not automatically affect orders, inventory, prices, or customer accounts. Connect a protected database table before using these modules as the official business record.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ======================================================
// MAIN APP: SHARED STATE AND PAGE RENDERING
// ======================================================

function App() {
  const [page, setPage] = useState<Page>("Home");
  const [guestAnnouncement, setGuestAnnouncement] = useState("✨ Sweet treats from Team Desalsal — 5 pieces for ₱45!");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [roleCheckError, setRoleCheckError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadGuestAnnouncement() {
      const { data, error } = await supabase
        .from("announcements")
        .select("title,body,created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const title = typeof data.title === "string" ? data.title.trim() : "";
      const body = typeof data.body === "string" ? data.body.trim() : "";
      setGuestAnnouncement([title, body].filter(Boolean).join(" — "));
    }
    void loadGuestAnnouncement();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) setRoleCheckError(error.message);
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    }
  

    void loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(false);
      setRoleCheckError("");
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminRole() {
      if (!user) return;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (cancelled) return;

      if (error) {
        setRoleCheckError(error.message);
        return;
      }

      setIsAdmin(data?.some((row) => row.role === "admin") ?? false);
    }

    void checkAdminRole();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("team-desalsal-cart") || "[]") as CartItem[]; }
    catch { return []; }
  });

  const [, setCatalogVersion] = useState(0);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">("loading");
  const [catalogError, setCatalogError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      const { data, error } = await supabase.from("products").select("id,name,description,price,image_url,is_active,category").eq("is_active", true).order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        PRODUCTS = [];
        setCatalogError(error.message);
        setCatalogStatus("error");
        setCatalogVersion((version) => version + 1);
        return;
      }
      const previous = PRODUCTS;
      const next: Product[] = ((data ?? []) as DbProductRow[]).map((row) => ({ id: String(row.id), name: row.name, description: row.description ?? "", price: Number(row.price), image_url: row.image_url, emoji: /strawberry/i.test(row.name) ? "🍓" : /choco|chocolate/i.test(row.name) ? "🍫" : "🥐", category: row.category || "Bakery", available: row.is_active }));
      const remap = new Map<string,string>();
      previous.forEach((old) => { const match = next.find((item) => item.name.trim().toLowerCase() === old.name.trim().toLowerCase()); if (match) remap.set(old.id, match.id); });
      const chocoMatch = next.find((item) => /choco|chocolate/i.test(item.name));
      const strawberryMatch = next.find((item) => /strawberry/i.test(item.name));
      if (chocoMatch) remap.set("choco-pi-ta-byte", chocoMatch.id);
      if (strawberryMatch) remap.set("strawberry-pie", strawberryMatch.id);
      setCart((items) => items.map((item) => ({ ...item, productId: remap.get(item.productId) || item.productId })).filter((item) => next.some((product) => product.id === item.productId)));
      PRODUCTS = next;
      setCatalogError("");
      setCatalogStatus("ready");
      setCatalogVersion((version) => version + 1);
    };
    void loadCatalog();
    const refresh = () => { void loadCatalog(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("team-desalsal-catalog-refresh", refresh);
    return () => { cancelled = true; window.removeEventListener("focus", refresh); window.removeEventListener("team-desalsal-catalog-refresh", refresh); };
  }, []);

  const [orders, setOrders] = useState<Order[]>(() => {
    try { return JSON.parse(localStorage.getItem("team-desalsal-orders") || "[]") as Order[]; }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem("team-desalsal-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    let cancelled = false;
    const loadOrders = async () => {
      if (user) {
        const { data, error } = await supabase.from("store_orders").select("id,order_code,customer_name,phone,address,fulfillment_type,payment_method,notes,items,subtotal,discount,total,status,created_at").order("created_at", { ascending: false }).limit(200);
        if (cancelled || error || !data) return;
        const orderRows = data as unknown as DbStoreOrder[];
        const ids = orderRows.map((row) => row.id);
        const hr = ids.length ? await supabase.from("store_order_status_history").select("order_id,status,note,created_at").in("order_id", ids).order("created_at", { ascending: true }) : { data: [], error: null };
        const histories = new Map<string, OrderStatusEvent[]>();
        ((hr.data || []) as unknown as DbOrderHistoryRow[]).forEach((e) => histories.set(e.order_id, [...(histories.get(e.order_id) || []), { status: e.status, at: e.created_at, note: e.note ?? undefined }]));
        setOrders(orderRows.map((r) => ({ id: r.order_code, databaseId: r.id, customerName: r.customer_name, phone: r.phone, address: r.address, fulfillmentType: r.fulfillment_type, paymentMethod: r.payment_method, notes: r.notes || "", items: (r.items || []).map((i: DbOrderItem) => ({ productId: String(i.productId ?? i.product_id ?? ""), quantity: Number(i.quantity) })), subtotal: Number(r.subtotal), discount: Number(r.discount), total: Number(r.total), status: r.status, createdAt: r.created_at, statusHistory: histories.get(r.id) || [] })));
      } else {
        const refs = (() => { try { return JSON.parse(localStorage.getItem("team-desalsal-guest-orders") || "[]") as {id:string;token:string}[]; } catch { return []; } })();
        const found: Order[] = [];
        for (const ref of refs.slice(0, 30)) {
          const result = await supabase.rpc("get_guest_store_order", { p_order_id: ref.id, p_guest_token: ref.token });
          if (result.error || !result.data) continue;
          const r = result.data as unknown as DbStoreOrder;
          found.push({ id: r.order_code, databaseId: r.id, customerName: r.customer_name, phone: r.phone, address: r.address, fulfillmentType: r.fulfillment_type, paymentMethod: r.payment_method, notes: r.notes || "", items: (r.items || []).map((i: DbOrderItem) => ({ productId: String(i.productId ?? i.product_id ?? ""), quantity: Number(i.quantity) })), subtotal: Number(r.subtotal), discount: Number(r.discount), total: Number(r.total), status: r.status, createdAt: r.created_at, statusHistory: r.status_history || [] });
        }
        if (!cancelled) setOrders(found);
      }
    };
    void loadOrders();
    return () => { cancelled = true; };
  }, [user]);

  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(productId: string, quantity: number) {
    const safeQuantity = Math.max(1, Math.min(999, Math.floor(quantity)));

    setCart((previous) => {
      const existing = previous.find((item) => item.productId === productId);

      if (existing) {
        return previous.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: Math.min(999, item.quantity + safeQuantity),
              }
            : item,
        );
      }

      return [...previous, { productId, quantity: safeQuantity }];
    });
  }

  function updateCartQuantity(productId: string, quantity: number) {
    const safeQuantity = Math.max(1, Math.min(999, Math.floor(quantity)));

    setCart((previous) =>
      previous.map((item) =>
        item.productId === productId
          ? { ...item, quantity: safeQuantity }
          : item,
      ),
    );
  }

  function removeFromCart(productId: string) {
    setCart((previous) =>
      previous.filter((item) => item.productId !== productId),
    );
  }

  async function placeOrder(details: { customerName: string; phone: string; address: string; fulfillmentType: "Delivery" | "Pickup"; paymentMethod: string; notes: string }): Promise<string | null> {
    if (!cart.length) return null;
    const guestToken = user ? null : (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
    const { data, error } = await supabase.rpc("create_store_order", { p_order: { customer_name: details.customerName, phone: details.phone, address: details.address, fulfillment_type: details.fulfillmentType, payment_method: details.paymentMethod, notes: details.notes, items: cart.map((item) => ({ product_id: item.productId, quantity: item.quantity })) }, p_guest_token: guestToken });
    if (error || !data) { console.error("Order creation failed:", error?.message); return null; }
    const orderData = data as unknown as DbStoreOrder;
    if (!user && guestToken) {
      const refs = (() => { try { return JSON.parse(localStorage.getItem("team-desalsal-guest-orders") || "[]") as {id:string;token:string}[]; } catch { return []; } })();
      refs.unshift({ id: orderData.id, token: guestToken }); localStorage.setItem("team-desalsal-guest-orders", JSON.stringify(refs.slice(0,30)));
    }
    const saved: Order = { id: orderData.order_code, databaseId: orderData.id, customerName: details.customerName, phone: details.phone, address: details.address, fulfillmentType: details.fulfillmentType, paymentMethod: details.paymentMethod, notes: details.notes, items: (orderData.items || []).map((i: DbOrderItem) => ({ productId: String(i.productId ?? i.product_id ?? ""), quantity: Number(i.quantity) })), subtotal: Number(orderData.subtotal), discount: Number(orderData.discount), total: Number(orderData.total), status: orderData.status, createdAt: orderData.created_at, statusHistory: [{ status: orderData.status, at: orderData.created_at, note: "Order placed" }] };
    setOrders((prev) => [saved, ...prev.filter((o) => o.id !== saved.id)]); setCart([]); return saved.id;
  }

  async function cancelOrder(orderId: string) {
    const order = orders.find((item) => item.id === orderId);
    if (!order || order.status !== "Pending" || !order.databaseId) return;
    let token: string | null = null;
    if (!user) { const refs = (() => { try { return JSON.parse(localStorage.getItem("team-desalsal-guest-orders") || "[]") as {id:string;token:string}[]; } catch { return []; } })(); token = refs.find((ref) => ref.id === order.databaseId)?.token ?? null; if (!token) return; }
    const { error } = await supabase.rpc("cancel_store_order", { p_order_id: order.databaseId, p_guest_token: token });
    if (error) { console.error("Cancellation failed:", error.message); return; }
    const now = new Date().toISOString(); setOrders((prev) => prev.map((item) => item.id === orderId ? { ...item, status: "Cancelled", statusHistory: [...(item.statusHistory || []), { status: "Cancelled", at: now, note: "Cancelled by customer" }] } : item));
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = orders.find((item) => item.id === orderId); if (!order?.databaseId) return;
    const { error } = await supabase.rpc("admin_update_store_order_status", { p_order_id: order.databaseId, p_status: status, p_note: "Status updated by admin" });
    if (error) { console.error("Status update failed:", error.message); return; }
    const now = new Date().toISOString(); setOrders((prev) => prev.map((item) => item.id === orderId ? { ...item, status, statusHistory: [...(item.statusHistory || []), { status, at: now, note: "Status updated by admin" }] } : item));
  }

  function addReviewNote(orderId: string, note: string) {
    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? { ...order, violationNote: note.trim() || undefined }
          : order,
      ),
    );
  }
  
  return (
    <div className="app-shell">
      {page !== "Admin" && (
        <>
          {!user && <div className="announcement-bar" role="status">{guestAnnouncement}</div>}

          <Header
            page={page}
            setPage={setPage}
            cartQuantity={cartQuantity}
            orderCount={orders.length}
            isSignedIn={Boolean(user)}
            isAdmin={isAdmin}
          />
        </>
      )}

      {page === "Admin" && authReady && user && isAdmin && !roleCheckError && (
        <div className="admin-dashboard-topbar">
          <div className="admin-topbar-brand">
            <span className="shared-brand-mark logo-placeholder logo-image-wrap" aria-label="Team Desalsal logo"><span className="logo-fallback">TD</span><img src="/assets/team-desalsal-logo.png" alt="" onLoad={(event) => { const fallback = event.currentTarget.parentElement?.querySelector(".logo-fallback") as HTMLElement | null; if (fallback) fallback.style.display = "none"; }} onError={(event) => { event.currentTarget.style.display = "none"; }} /></span>
            <div><strong style={{ display: "block", color: "var(--text, #4a3038)" }}>
              Team Desalsal · Admin
            </strong>
            <span style={{ fontSize: "0.9rem", color: "var(--muted, #806b72)" }}>
              Signed in as {user.email}
            </span></div>
          </div>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <button
              className="button button-secondary"
              onClick={() => {
                setPage("Shop");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              View Store
            </button>
            <button
              className="button button-primary"
              onClick={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) {
                  setRoleCheckError(error.message);
                  return;
                }
                setIsAdmin(false);
                setPage("Shop");
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      <main>
        {page === "Home" && <HomePage setPage={setPage} addToCart={addToCart} catalogStatus={catalogStatus} catalogError={catalogError} />}

        {page === "Shop" && (
          <Shop cart={cart} addToCart={addToCart} setPage={setPage} catalogStatus={catalogStatus} catalogError={catalogError} />
        )}

        {page === "Cart" && (
          <Cart
            cart={cart}
            updateQuantity={updateCartQuantity}
            removeFromCart={removeFromCart}
            setPage={setPage}
          />
        )}

        {page === "Checkout" && (
          <Checkout
            cart={cart}
            placeOrder={placeOrder}
            setPage={setPage}
          />
        )}

        {page === "Orders" && (
          <Orders
            orders={orders}
            cancelOrder={cancelOrder}
            setPage={setPage}
          />
        )}

        {page === "Treat Passport" && <TreatPassport orders={orders} />}
        {page === "Reviews" && <CustomerReviews orders={orders} />}
        {page === "Promotions" && <CustomerPromotions />}
        {page === "Product Passports" && <ProductPassports />}
        {page === "Inbox" && (user ? <CustomerInbox userId={user.id} /> : <section className="section page-section"><div className="admin-login"><h1>Sign in to view your inbox</h1><p>Announcements are delivered to registered customer accounts.</p><button className="button button-primary full-width" onClick={() => setPage("Account")}>Sign in / Create account</button></div></section>)}

        {page === "About Us" && <AboutUs setPage={setPage} />}

        {page === "Contact" && <Contact />}

        {page === "Account" && (
          !authReady ? (
            <section className="section page-section"><p>Loading account...</p></section>
          ) : user ? (
            <section className="section page-section">
              <div className="admin-login">
                <h1>Your Account</h1>
                <p>You are signed in as <strong>{user.email}</strong>.</p>
                {typeof user.user_metadata?.full_name === "string" && (
                  <p>Name: {user.user_metadata.full_name}</p>
                )}
                <p className="small-note">
                  {isAdmin ? "Administrator access is enabled for this account." : "You are signed in as a customer."}
                </p>
                <button
                  className="button button-primary full-width"
                  onClick={async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                      setRoleCheckError(error.message);
                      return;
                    }
                    setPage("Shop");
                  }}
                >
                  Sign Out
                </button>
                {roleCheckError && <p className="form-warning" role="alert">{roleCheckError}</p>}
              </div>
            </section>
          ) : (
            <AuthPanel onDone={() => setPage("Shop")} />
          )
        )}

        {page === "Admin" && (
          !authReady ? (
            <section className="section page-section"><p>Checking administrator access...</p></section>
          ) : !user ? (
            <section className="section page-section">
              <div className="admin-login">
                <h1>Administrator Sign In</h1>
                <p>Please sign in with your authorized administrator account.</p>
                <button className="button button-primary full-width" onClick={() => setPage("Account")}>Go to Sign In</button>
              </div>
            </section>
          ) : roleCheckError ? (
            <section className="section page-section">
              <div className="admin-login">
                <h1>Could Not Verify Access</h1>
                <p className="form-warning">{roleCheckError}</p>
                <button className="button button-secondary" onClick={() => setPage("Account")}>Back to Account</button>
              </div>
            </section>
          ) : !isAdmin ? (
            <section className="section page-section">
              <div className="admin-login">
                <h1>Access Restricted</h1>
                <p>This account does not have administrator permissions.</p>
                <button className="button button-secondary" onClick={() => setPage("Shop")}>Return to Shop</button>
              </div>
            </section>
          ) : (
            <Admin
              userId={user.id}
              orders={orders}
              updateOrderStatus={updateOrderStatus}
              addReviewNote={addReviewNote}
            />
          )
        )}
      </main>

      {page !== "Admin" && <Footer />}

    </div>
  );
}

export default App;

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthPanel from "./components/AuthPanel";
import { supabase } from "./lib/supabase";
import "./App.css";

// ======================================================
// EDIT HERE: TEAM DESALSAL BUSINESS INFORMATION
// ======================================================

const BUSINESS_NAME = "Team Desalsal";
const BUSINESS_LOCATION = "Brgy. Maypangdan, Borongan City, Eastern Samar";
const BUSINESS_EMAIL = "EDIT_YOUR_EMAIL_HERE";
const BUSINESS_PHONE = "EDIT_YOUR_CONTACT_NUMBER_HERE";

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
};

const PRODUCTS: Product[] = [
  {
    id: "choco-pi-ta-byte",
    name: "Choco Pi Ta Byte",
    description: "Choco Pi Ta Byte wraps Flat Tops in sliced bread, coats it with egg and bread crumbs, then fries it until crispy with a warm chocolate center.",
    price: 10,
    emoji: "🍫",
    category: "Chocolate",
    available: true,
  },
  {
    id: "strawberry-pie",
    name: "Strawberry Pie",
    description: "A sweet strawberry-flavored pie made for sharing with classmates, teachers, and friends.",
    price: 10,
    emoji: "🍓",
    category: "Strawberry",
    available: true,
  },
];

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
  | "Completed"
  | "Cancelled";

type OrderStatusEvent = {
  status: OrderStatus;
  at: string;
  note?: string;
};

type Order = {
  id: string;
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

function makeOrderId() {
  return `TD-${Date.now().toString().slice(-8)}`;
}

// ======================================================
// EDIT HERE: NAVIGATION OPTIONS
// ======================================================

type Page =
  | "Shop"
  | "Cart"
  | "Checkout"
  | "Orders"
  | "About Us"
  | "Contact"
  | "Admin"
  | "Account";

const NAVIGATION: Page[] = [
  "Shop",
  "Cart",
  "Orders",
  "About Us",
  "Contact",
  "Account",
];

// ======================================================
// REUSABLE: HEADER
// ======================================================

type HeaderProps = {
  page: Page;
  setPage: (page: Page) => void;
  cartQuantity: number;
  orderCount: number;
};

function Header({ page, setPage, cartQuantity, orderCount }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function navigate(destination: Page) {
    setPage(destination);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          className="brand"
          onClick={() => navigate("Shop")}
          aria-label="Go to shop"
        >
          <span className="brand-icon">🥧</span>
          <span>
            <strong>{BUSINESS_NAME}</strong>
            <small>Sweet treats, happy hearts.</small>
          </span>
        </button>

        <button
          className="mobile-menu-button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

        <nav className={`main-nav ${mobileMenuOpen ? "nav-open" : ""}`}>
          {NAVIGATION.map((item) => (
            <button
              key={item}
              className={`nav-link ${page === item ? "active" : ""}`}
              onClick={() => navigate(item)}
            >
              {item === "Cart" ? `Cart (${cartQuantity})` : item === "Orders" ? `Orders (${orderCount})` : item}
            </button>
          ))}

          <button
            className="button button-primary header-order-button"
            onClick={() => navigate("Shop")}
          >
            Order Now
          </button>
        </nav>
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
          <h3>🥧 {BUSINESS_NAME}</h3>
          <p>Made with sweetness, shared with happiness.</p>
          <p>{BUSINESS_LOCATION}</p>
        </div>

        <div className="footer-links footer-business-note">
          <h4>Ordering Information</h4>
          <p>Delivery is limited to Brgy. Maypangdan, Borongan City.</p>
          <p>Self-pickup is available by arrangement.</p>
          <p className="small-note">Edit this section in the Footer component when your policies change.</p>
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


type ShopProps = {
  cart: CartItem[];
  addToCart: (productId: string, quantity: number) => void;
  setPage: (page: Page) => void;
};

function Shop({ cart, addToCart, setPage }: ShopProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");

  // EDIT HERE: MIX & MATCH DEFAULT QUANTITIES
  const [mixChoco, setMixChoco] = useState(3);
  const [mixStrawberry, setMixStrawberry] = useState(2);

  const MINIMUM_DELIVERY_QUANTITY = 5;
  const MAX_QUANTITY = 999;

  // EDIT HERE: MIX & MATCH PRICING
  const mixQuantity = mixChoco + mixStrawberry;
  const mixSubtotal = mixQuantity * 10;

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

    const chocoProduct = PRODUCTS.find(
      (product) => product.id === "choco-pi-ta-byte",
    );

    const strawberryProduct = PRODUCTS.find(
      (product) => product.id === "strawberry-pie",
    );

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

    if (mixChoco > 0) {
      addToCart("choco-pi-ta-byte", mixChoco);
    }

    if (mixStrawberry > 0) {
      addToCart("strawberry-pie", mixStrawberry);
    }

    setMessage(
      `Your Mix & Match bundle of ${mixQuantity} pieces has been added to your cart!`,
    );
  }

  return (
    <>
      {/* ==========================================
          SHOP HERO
      ========================================== */}
      <section className="shop-hero">
        <div className="shop-hero-content">
          <span className="eyebrow">
            WELCOME TO {BUSINESS_NAME.toUpperCase()}
          </span>

          <h1>A little sweetness goes a long way.</h1>

          <p>
            Discover your favorite treats, choose your quantity, and
            prepare your order with us.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() =>
                document
                  .getElementById("product-catalog")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore Products
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => setPage("About Us")}
            >
              Meet Our Team
            </button>
          </div>

          <div className="hero-highlights">
            <span>♡ Affordable treats</span>
            <span>♡ Bulk order discounts</span>
            <span>♡ Friendly service</span>
          </div>
        </div>

        <div className="hero-decoration" aria-hidden="true">
          <span className="floating-treat treat-one">🍓</span>
          <span className="floating-treat treat-two">🥧</span>
          <span className="floating-treat treat-three">🍫</span>

          <div className="hero-circle">
            <span>Made</span>
            <strong>with love</strong>
            <span>♡</span>
          </div>
        </div>
      </section>

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

                  <span className="product-emoji" aria-hidden="true">
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
          <div className="empty-state">
            <span>🔎</span>
            <h3>No products found</h3>
            <p>
              Try another search or select a different category.
            </p>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* ==========================================
            MIX & MATCH BUNDLE
        ========================================== */}
        <section className="mix-match-section">
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

              <h3>Choco Pi Ta Byte</h3>
              <p>₱10 per piece</p>

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

              <h3>Strawberry Pie</h3>
              <p>₱10 per piece</p>

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
        </section>

        {/* ==========================================
            DISCOUNT INFORMATION
        ========================================== */}
        <div className="discount-banner">
          <span className="discount-banner-icon">🎁</span>

          <div>
            <h3>Order more, save more!</h3>
            <p>
              5–9 pieces: 10% off. 10–14 pieces: 12% off.
              Larger orders may receive higher discounts, up to 20%.
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
  }) => string | null;
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

  function submitOrder(event: React.FormEvent<HTMLFormElement>) {
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

    const orderId = placeOrder({
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
  const historyStatuses: OrderStatus[] = ["Completed", "Cancelled"];

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
                ? "Completed and cancelled orders will be saved here."
                : "Completed and cancelled orders are available in Order History."}
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
                  className={`status-badge status-${order.status.toLowerCase()}`}
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
                      <span className={`timeline-dot status-${event.status.toLowerCase()}`} />
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
  // EDIT HERE: Replace the sample names and roles with your actual 10 members.
  // This list includes the team leader, for a total of 10 people.
  const teamMembers = [
    { role: "Team Leader / Manager", name: "EDIT: Team Leader Name", description: "Leads the team and coordinates overall business operations." },
    { role: "Assistant Team Leader", name: "EDIT: Member 2 Name", description: "Supports the leader and helps coordinate team tasks." },
    { role: "Secretary", name: "EDIT: Member 3 Name", description: "Records meetings, decisions, and important team information." },
    { role: "Treasurer", name: "EDIT: Member 4 Name", description: "Tracks expenses, sales, and financial records." },
    { role: "Production Lead", name: "EDIT: Member 5 Name", description: "Organizes product preparation and production schedules." },
    { role: "Production Member", name: "EDIT: Member 6 Name", description: "Helps prepare the pies and maintain product quality." },
    { role: "Quality & Packaging", name: "EDIT: Member 7 Name", description: "Checks product quality and prepares orders for customers." },
    { role: "Marketing", name: "EDIT: Member 8 Name", description: "Promotes Team Desalsal and creates product announcements." },
    { role: "Sales & Customer Service", name: "EDIT: Member 9 Name", description: "Answers customer questions and assists with orders." },
    { role: "Inventory & Logistics", name: "EDIT: Member 10 Name", description: "Monitors supplies and helps organize pickup or delivery." },
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
        <p>Replace the sample names and roles below with your actual members and responsibilities.</p>
      </div>
      <div className="team-tree">
        <div className="team-tree-root"><span>🥧</span><strong>Team Desalsal</strong><small>Student-led food business</small></div>
        <div className="team-tree-branches">
          {teamMembers.map((member) => <article className="team-member-card" key={member.role}>
            <span className="team-member-icon">♡</span><h3>{member.role}</h3><strong>{member.name}</strong><p>{member.description}</p>
          </article>)}
        </div>
      </div>

      <div className="section-heading"><span className="eyebrow">WHAT WE VALUE</span><h2>More than just a treat</h2></div>
      <div className="values-grid">
        <article className="value-card"><span>💗</span><h3>Customer Care</h3><p>We aim to make every interaction helpful, respectful, and welcoming.</p></article>
        <article className="value-card"><span>✨</span><h3>Creativity</h3><p>We keep learning how to present our products and business in better ways.</p></article>
        <article className="value-card"><span>🤝</span><h3>Teamwork</h3><p>We share responsibilities, communicate, and work toward common goals.</p></article>
      </div>
      <div className="location-panel"><span>📍</span><div><h3>Find Us</h3><p>{BUSINESS_LOCATION}</p><p className="small-note">Delivery is currently limited to Brgy. Maypangdan. Self-pickup is available by arrangement.</p></div></div>
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
              <p>{BUSINESS_PHONE}</p>
            </div>
          </div>

          <div className="contact-info-item">
            <span>✉️</span>
            <div>
              <strong>Email</strong>
              <p>{BUSINESS_EMAIL}</p>
            </div>
          </div>

          <p className="small-note">
            Edit the contact details at the top of App.tsx before publishing.
          </p>
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
// ADMIN DASHBOARD
// ======================================================

type AdminProps = {
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addReviewNote: (orderId: string, note: string) => void;
};

function Admin({
  orders,
  updateOrderStatus,
  addReviewNote,
}: AdminProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("All");

  const [statusFilter, setStatusFilter] = useState("All");


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
    ["Confirmed", "Preparing", "Ready"].includes(order.status),
  ).length;
  const completedOrders = orders.filter((order) => order.status === "Completed");
  const completedRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
  const completedPieces = completedOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const currentOriginalRevenue = completedOrders.reduce((sum, order) => sum + order.items.filter((item) => item.productId === "choco-pi-ta-byte").reduce((itemSum, item) => itemSum + item.quantity * (PRODUCTS.find((product) => product.id === item.productId)?.price ?? 0), 0), 0);
  const currentStrawberryRevenue = completedOrders.reduce((sum, order) => sum + order.items.filter((item) => item.productId === "strawberry-pie").reduce((itemSum, item) => itemSum + item.quantity * (PRODUCTS.find((product) => product.id === item.productId)?.price ?? 0), 0), 0);
  const lastWeekRevenue = 590;
  const totalRecordedRevenue = lastWeekRevenue + completedRevenue;
  const averageCompletedOrder = completedOrders.length ? completedRevenue / completedOrders.length : 0;
  const cancellationCount = orders.filter((order) => order.status === "Cancelled").length;

  return (
    <section className="section page-section">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">MANAGEMENT</span>
          <h1>Admin Dashboard</h1>
          <p>Review orders and update their status.</p>
        </div>
      </div>

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

      <section className="financial-section" aria-labelledby="financial-heading">
        <div className="section-heading financial-heading">
          <span className="eyebrow">ADMIN-ONLY BUSINESS RECORDS</span>
          <h2 id="financial-heading">Sales Records &amp; Business Analysis</h2>
          <p>Historical figures are entered manually. Current figures below update from orders marked Completed.</p>
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
          <p className="financial-note">These totals are calculated from orders currently saved in this website. Only orders marked Completed count as sales revenue; pending, cancelled, and in-progress orders are excluded.</p>
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
          <div className="analysis-highlight"><span>Combined recorded sales (last week + current completed orders)</span><strong>{formatPrice(totalRecordedRevenue)}</strong></div>
          <div className="analysis-grid">
            <article><span>Historical sales</span><strong>{formatPrice(lastWeekRevenue)}</strong><p>Manually recorded last week</p></article>
            <article><span>Current website sales</span><strong>{formatPrice(completedRevenue)}</strong><p>Completed orders only</p></article>
            <article><span>Order completion rate</span><strong>{orders.length ? `${Math.round((completedOrders.length / orders.length) * 100)}%` : "0%"}</strong><p>Completed orders divided by all website orders</p></article>
          </div>
          <p className="financial-disclaimer">This analysis combines the historical sales entry with completed orders stored by this website. Historical expenses are not deducted from current sales, and current ingredient expenses are not yet recorded automatically. The present project stores orders in this browser's local storage; shared multi-device backend recording requires connecting the PHP backend/database.</p>
        </div>
      </section>

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
            "Completed",
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
                  className={`status-badge status-${order.status.toLowerCase()}`}
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
                  "Completed",
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
        Preview mode: orders are saved in this browser's local storage, so they persist on this device but are not shared across devices. Connect the PHP backend and database for secure, shared live records.
      </p>
    </section>
  );
}

// ======================================================
// MAIN APP: SHARED STATE AND PAGE RENDERING
// ======================================================

function App() {
  const [page, setPage] = useState<Page>("Shop");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [roleCheckError, setRoleCheckError] = useState("");

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
      setIsAdmin(false);
      setRoleCheckError("");

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
  const [orders, setOrders] = useState<Order[]>(() => {
    try { return JSON.parse(localStorage.getItem("team-desalsal-orders") || "[]") as Order[]; }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem("team-desalsal-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("team-desalsal-orders", JSON.stringify(orders)); }, [orders]);

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

  function placeOrder(details: {
    customerName: string;
    phone: string;
    address: string;
    fulfillmentType: "Delivery" | "Pickup";
    paymentMethod: string;
    notes: string;
  }): string | null {
    const summary = calculateCart(cart);

    if (
      cart.length === 0 ||
      (details.fulfillmentType === "Delivery" && summary.quantity < MINIMUM_DELIVERY_QUANTITY)
    ) {
      return null;
    }

    const orderId = makeOrderId();

    const newOrder: Order = {
      id: orderId,
      customerName: details.customerName,
      phone: details.phone,
      address: details.address,
      fulfillmentType: details.fulfillmentType,
      paymentMethod: details.paymentMethod,
      notes: details.notes,
      items: cart.map((item) => ({ ...item })),
      subtotal: summary.subtotal,
      discount: summary.discount,
      total: summary.total,
      status: "Pending",
      createdAt: new Date().toISOString(),
      statusHistory: [{ status: "Pending", at: new Date().toISOString(), note: "Order placed" }],
    };

    setOrders((previous) => [newOrder, ...previous]);
    setCart([]);

    return orderId;
  }

  function cancelOrder(orderId: string) {
    setOrders((previous) =>
      previous.map((order) => {
        if (order.id !== orderId) return order;

        if (order.status !== "Pending") {
          return order;
        }

        const now = new Date().toISOString();
        return { ...order, status: "Cancelled", statusHistory: [...(order.statusHistory ?? [{ status: order.status, at: order.createdAt }]), { status: "Cancelled", at: now, note: "Cancelled by customer" }] };
      }),
    );
  }

  function updateOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((previous) =>
      previous.map((order) => {
        if (order.id !== orderId || order.status === status) return order;
        const now = new Date().toISOString();
        return { ...order, status, statusHistory: [...(order.statusHistory ?? [{ status: order.status, at: order.createdAt }]), { status, at: now, note: "Status updated by admin" }] };
      }),
    );
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
      <div className="announcement-bar">
        ✨ Sweet treats from Team Desalsal — bulk discounts available!
      </div>

      <Header
        page={page}
        setPage={setPage}
        cartQuantity={cartQuantity}
        orderCount={orders.length}
      />

      <main>
        {page === "Shop" && (
          <Shop cart={cart} addToCart={addToCart} setPage={setPage} />
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

        {page === "About Us" && <AboutUs setPage={setPage} />}

        {page === "Contact" && <Contact />}

        {page === "Account" && (
          !authReady ? (
            <section className="section page-section"><p>Loading account...</p></section>
          ) : user ? (
            <section className="section page-section">
              <div className="admin-login">
                <span className="eyebrow">TEAM DESALSAL ACCOUNT</span>
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
              orders={orders}
              updateOrderStatus={updateOrderStatus}
              addReviewNote={addReviewNote}
            />
          )
        )}
      </main>

      <Footer />

      <button
        className="admin-shortcut"
        onClick={() => {
          setPage("Admin");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        title="Open Admin Dashboard"
        aria-label="Open Admin Dashboard"
      >
        ⚙
      </button>
    </div>
  );
}

export default App;

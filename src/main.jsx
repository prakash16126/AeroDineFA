import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { categories, formatPrice, menu } from './data/menu.js';
import { imageManifest, imageValidationReport } from './data/imageManifest.js';
import { calculatePercentageDiscount, calculateSubtotal } from './utils/pricing.js';
import './styles.css';

const CART_KEY = 'aerodine-demo-cart';
const THEME_KEY = 'aerodine-theme';
const money = formatPrice;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, '') || '';
const RESERVATION_API_URL = process.env.REACT_APP_RESERVATION_API_URL || (API_BASE_URL ? `${API_BASE_URL}/api/reservations` : '');
const ORDER_API_URL = process.env.REACT_APP_ORDER_API_URL || (API_BASE_URL ? `${API_BASE_URL}/api/orders` : '');

function createReference(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 10).toUpperCase()
    || Math.random().toString(36).slice(2, 12).toUpperCase();
  return `${prefix}-${suffix}`;
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
  return true;
}

async function responseJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || `Request failed (${response.status}).`);
  return body;
}

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function getThemePreference() {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function normalizeCart(savedCart) {
  if (!savedCart || typeof savedCart !== 'object' || Array.isArray(savedCart)) return {};
  return Object.fromEntries(Object.entries(savedCart).flatMap(([id, line]) => {
    const dish = menu.find((item) => item.id === id);
    if (!dish || !line || !Number.isSafeInteger(line.quantity) || line.quantity < 1) return [];
    const validPrice = Number.isSafeInteger(line.unitPriceInPaise) && line.unitPriceInPaise >= 0;
    return [[id, {
      quantity: Math.min(line.quantity, 50),
      unitPriceInPaise: validPrice ? line.unitPriceInPaise : dish.priceInPaise,
      priceNeedsReview: Boolean(line.priceNeedsReview) || !validPrice,
      instructions: typeof line.instructions === 'string' ? line.instructions.slice(0, 160) : '',
    }]];
  }));
}

function Header({ count, theme, setTheme }) {
  return <>
    <div className="notice">Hitech City, Hyderabad <span>•</span> Hours pending confirmation</div>
    <header className="site-header">
      <a className="brand" href="/" aria-label="AeroDine home"><span className="brand-mark">A</span><span>Aero<span className="brand-light">Dine</span><small>FRESHLY CRAFTED, ALWAYS WELCOMING</small></span></a>
      <nav aria-label="Main navigation">
        <a href="/">Home</a><a href="/menu">Menu</a><a href="/reservations">Reservations</a>
      </nav>
      <div className="header-actions">
        <button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? '☼' : '◐'}</button>
        <a className="cart-link" href="/cart" aria-label={`Cart, ${count} items`}>Bag <span>{count}</span></a>
      </div>
    </header>
  </>;
}

function Image({ dish, className = '' }) {
  const [failed, setFailed] = useState(false);
  const image = imageManifest.find((entry) => entry.dishId === dish?.id);
  if (!dish || !image?.verified || !image.imageUrl || failed) {
    return <div className={`image-fallback ${className}`} role="img" aria-label={image?.alt || `${dish?.name || 'Dish'} photograph awaiting verification`}><span>{failed ? 'Photograph unavailable' : 'Dish photo'}<br />{failed ? 'Please try again later' : 'awaiting verification'}</span></div>;
  }
  return <img className={className} src={image.imageUrl} srcSet={image.srcSet} sizes="(max-width: 580px) 50vw, (max-width: 850px) 50vw, 33vw" alt={image.alt} loading="lazy" onError={() => setFailed(true)} />;
}

function DishCard({ dish, add, open, quantity = 0, update }) {
  return <article className="dish-card">
    <button className="dish-photo-button" onClick={() => open(dish)} aria-label={`View ${dish.name} details`}><Image dish={dish} className="dish-photo" /><span className="image-review-tag">{imageManifest.find((image) => image.dishId === dish.id)?.verified ? 'Verified photo' : 'Photo awaiting review'}</span></button>
    <div className="dish-card-content">
      <div className="dish-category">{dish.category}</div>
      <h3>{dish.name}</h3>
      <p>{dish.description}</p>
      <div className="dish-card-bottom"><strong>{money(dish.priceInPaise)}</strong>{quantity > 0 ? <div className="quantity card-quantity" aria-label={`${quantity} ${dish.name} in bag`}><button aria-label={`Decrease ${dish.name}`} onClick={() => update(dish.id, { quantity: quantity - 1 })}>−</button><span>{quantity}</span><button aria-label={`Increase ${dish.name}`} disabled={quantity >= 50} onClick={() => add(dish.id)}>+</button></div> : <button className="add-button" onClick={() => add(dish.id)}>Add <span aria-hidden="true">+</span></button>}</div>
    </div>
  </article>;
}

function SectionTitle({ eyebrow, title, copy }) {
  return <div className="section-title"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>;
}

function Home({ add, open, cart, update }) {
  const dishesWithPhotos = menu.filter((dish) => imageManifest.some((image) => image.dishId === dish.id && image.verified));
  const featured = [
    ...dishesWithPhotos.filter((dish) => dish.isFeatured),
    ...dishesWithPhotos.filter((dish) => !dish.isFeatured),
  ].slice(0, 6);
  return <main className="home-main ambient-page">
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow">A LITTLE MORE DELICIOUS</span><h1>Good food.<br /><em>Elevated moments.</em></h1><p>Thoughtful flavours from Hyderabad and beyond. Freshly made, comfortably priced, and always served with a warm welcome.</p><div className="hero-actions"><a className="button button-primary" href="/menu">Explore the menu <span>↗</span></a><a className="button button-quiet" href="/reservations">Reserve a table</a></div><div className="hero-caption"><span className="caption-line"></span> A table worth gathering around</div></div>
      <div className="hero-image"><img src="/images/photo-1517248135467-4c7edcad34c4.jpg" alt="Warmly lit restaurant dining room" /><div className="hero-image-label"><span>THE AERODINE EXPERIENCE</span><strong>Made for good company.</strong></div></div>
    </section>
    <section className="home-section featured-section"><SectionTitle eyebrow="THE HOUSE FAVOURITES" title="A few reasons to linger" copy="A first taste of the menu. Every dish is prepared fresh when you order." /><div className="dish-grid">{featured.map((dish) => <DishCard key={dish.id} dish={dish} add={add} open={open} quantity={cart[dish.id]?.quantity || 0} update={update} />)}</div><a className="text-link" href="/menu">More <span>→</span></a></section>
    <section className="category-band"><div className="category-band-title"><span className="eyebrow">SOMETHING FOR EVERY CRAVING</span><h2>Find your kind of flavour.</h2></div><div className="category-chips">{categories.map((category) => <a key={category.id} href={`/menu?category=${encodeURIComponent(category.name)}`}>{category.name}<span>↗</span></a>)}</div></section>
    <section className="experience home-section"><SectionTitle eyebrow="AERODINE, IN GOOD COMPANY" title="The good things are in the details." /><div className="experience-grid"><article><span>01</span><h3>Room to unwind</h3><p>Warm lighting, comfortable seats and an easy-going setting made for long lunches and unhurried evenings.</p></article><article><span>02</span><h3>Fresh from the kitchen</h3><p>From the tandoor to the wok, our menu is made to order. Restaurant practices are subject to confirmation.</p></article><article><span>03</span><h3>Good food, fair prices</h3><p>A generous mix of familiar favourites and new discoveries, at illustrative menu prices you can feel good about.</p></article></div></section>
    <section className="location-strip"><div><span className="eyebrow">COME FIND US</span><h2>Hitech City, Hyderabad</h2><p>Walk-ins welcome. Address and operating hours will be published once verified.</p></div><a href="/reservations" className="button button-outline">Plan a visit</a></section>
  </main>;
}

function MenuPage({ add, open, cart, update }) {
  const params = new URLSearchParams(location.search);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(params.get('category') || 'All dishes');
  const [diet, setDiet] = useState('All');
  const [sort, setSort] = useState('popular');
  const results = useMemo(() => {
    let items = menu.filter((dish) => (category === 'All dishes' || dish.category === category) &&
      (diet === 'All' || (diet === 'Vegetarian' ? dish.vegetarian : !dish.vegetarian)) &&
      `${dish.name} ${dish.description}`.toLowerCase().includes(query.toLowerCase()));
    if (sort === 'price-low') items = [...items].sort((a, b) => a.priceInPaise - b.priceInPaise);
    if (sort === 'price-high') items = [...items].sort((a, b) => b.priceInPaise - a.priceInPaise);
    if (sort === 'name') items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [category, diet, query, sort]);
  return <main className="page-wrap menu-page ambient-page">
    <div className="page-heading"><span className="eyebrow">MADE FRESH, ORDERED YOUR WAY</span><h1>Our menu<span className="heading-period">.</span></h1><p>84 dishes across twelve kitchens of flavour. Prices are illustrative and subject to confirmation.</p></div>
    <div className="menu-toolbar"><label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dishes..." aria-label="Search dishes" /></label><label className="select-field"><span className="sr-only">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All dishes</option>{categories.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label className="select-field"><span className="sr-only">Diet preference</span><select value={diet} onChange={(event) => setDiet(event.target.value)}><option>All</option><option>Vegetarian</option><option>Non-vegetarian</option></select></label><label className="select-field"><span className="sr-only">Sort dishes</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A to Z</option></select></label></div>
    <div className="results-caption"><span>{results.length} dishes</span><span>Illustrative prices · INR</span></div>
    {results.length ? <div className="dish-grid">{results.map((dish) => <DishCard key={dish.id} dish={dish} add={add} open={open} quantity={cart[dish.id]?.quantity || 0} update={update} />)}</div> : <div className="empty-state"><span className="eyebrow">NO MATCHES JUST YET</span><h2>Nothing on the menu by that name.</h2><p>Try a different search or browse all dishes.</p><button className="button button-primary" onClick={() => { setQuery(''); setCategory('All dishes'); }}>Show all dishes</button></div>}
  </main>;
}

function CartPage({ cart, update, remove }) {
  const entries = Object.entries(cart)
    .map(([id, value]) => ({ dish: menu.find((item) => item.id === id), ...value }))
    .filter((line) => line.dish);
  const subtotal = calculateSubtotal(entries.map((line) => ({
    priceInPaise: line.unitPriceInPaise ?? line.dish.priceInPaise,
    quantity: line.quantity,
  })));
  const staleEntries = entries.filter((line) => line.priceNeedsReview || (line.unitPriceInPaise != null && line.unitPriceInPaise !== line.dish.priceInPaise));
  const [couponInput, setCouponInput] = useState(() => readStorage('aerodine-demo-coupon', ''));
  const [coupon, setCoupon] = useState(() => readStorage('aerodine-demo-coupon', ''));
  const [couponError, setCouponError] = useState('');
  const discount = coupon === 'AERO10' ? calculatePercentageDiscount(subtotal, 10) : 0;
  function applyCoupon(event) {
    event.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (code !== 'AERO10') {
      setCoupon('');
      localStorage.removeItem('aerodine-demo-coupon');
      setCouponError('That code is not valid in this local demo.');
      return;
    }
    setCoupon(code);
    setCouponError('');
    localStorage.setItem('aerodine-demo-coupon', JSON.stringify(code));
  }
  return <main className="page-wrap">
    <div className="page-heading"><span className="eyebrow">YOUR TABLE, YOUR PICKS</span><h1>Your bag<span className="heading-period">.</span></h1><p>Review your selection before continuing.</p></div>
    {entries.length ? <div className="cart-layout">
      <div className="cart-lines">
        {staleEntries.length > 0 && <div className="notice-box" role="status">A menu price changed since this item was added. Review and accept the current price before checkout.</div>}
        {entries.map(({ dish, quantity, instructions, unitPriceInPaise, priceNeedsReview }) => {
          const changed = unitPriceInPaise != null && unitPriceInPaise !== dish.priceInPaise;
          const linePrice = unitPriceInPaise ?? dish.priceInPaise;
          return <article className="cart-line" key={dish.id}>
            <Image dish={dish} className="cart-thumb" />
            <div className="cart-line-main"><span className="dish-category">{dish.category}</span><h3>{dish.name}</h3>
              {priceNeedsReview ? <div className="price-change">Saved price unavailable. Current menu price: {money(dish.priceInPaise)} <button onClick={() => update(dish.id, { unitPriceInPaise: dish.priceInPaise, priceNeedsReview: false })}>Accept</button></div> : changed && <div className="price-change">Price changed: {money(linePrice)} → {money(dish.priceInPaise)} <button onClick={() => update(dish.id, { unitPriceInPaise: dish.priceInPaise })}>Accept</button></div>}
              <label className="instructions-label">Kitchen note <input value={instructions || ''} maxLength="160" placeholder="Optional" onChange={(event) => update(dish.id, { instructions: event.target.value })} /></label>
            </div>
            <div className="cart-controls"><strong>{money(linePrice * quantity)}</strong><div className="quantity"><button aria-label={`Decrease ${dish.name}`} onClick={() => update(dish.id, { quantity: quantity - 1 })}>−</button><span>{quantity}</span><button aria-label={`Increase ${dish.name}`} onClick={() => update(dish.id, { quantity: quantity + 1 })}>+</button></div><button className="remove-link" onClick={() => remove(dish.id)}>Remove</button></div>
          </article>;
        })}
      </div>
      <aside className="summary-card">
        <span className="eyebrow">ORDER SUMMARY</span>
        <div className="summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        <form className="coupon-form" onSubmit={applyCoupon}><label htmlFor="coupon-code">Demo coupon</label><div><input id="coupon-code" value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Try AERO10" /><button type="submit">Apply</button></div>{couponError && <p role="status">{couponError}</p>}{coupon && <p role="status">Demo code AERO10 applied (10% off items).</p>}</form>
        {discount > 0 && <div className="summary-row"><span>Demo discount</span><strong>−{money(discount)}</strong></div>}
        <div className="summary-row muted"><span>Delivery & taxes</span><span>Calculated when configured</span></div>
        <div className="summary-total"><span>Estimated total</span><strong>{money(subtotal - discount)}</strong></div>
        <p className="small-note">Delivery availability, fees and taxes are not configured in this local demo. The coupon is preview-only.</p>
        {staleEntries.length ? <button className="button button-primary full-button" disabled>Review changed prices</button> : <a className="button button-primary full-button" href="/checkout">Continue to checkout <span>→</span></a>}
      </aside>
    </div> : <div className="empty-state"><span className="eyebrow">A FRESH PAGE</span><h2>Your bag is waiting.</h2><p>Pick something delicious from the menu.</p><a className="button button-primary" href="/menu">Browse the menu</a></div>}
  </main>;
}

function OrderConfirmation({ order, onBrowse }) {
  const demo = order.mode === 'demo';
  const items = order.items || [];
  const address = typeof order.address === 'string'
    ? order.address
    : order.address && typeof order.address === 'object'
      ? Object.values(order.address).filter((value) => typeof value === 'string' && value).join(', ')
      : 'Available in order details';
  return <section className="confirmation-card order-confirmation" aria-live="polite">
    <span className="status-pill">{demo ? 'DEMO MODE · NO REAL ORDER OR PAYMENT' : `SERVER RESPONSE · ${order.status || 'RECEIVED'}`}</span>
    <span className="confirmation-mark" aria-hidden="true">{demo ? 'A' : '✓'}</span>
    <span className="eyebrow">AERODINE · HITECH CITY</span>
    <h2>{demo ? 'Your order has been placed in demo mode!' : 'Your order request was received.'}</h2>
    <p>{demo
      ? 'Thank you for choosing AeroDine. Your order details have been saved locally for demonstration purposes. No payment has been processed and the restaurant has not received this order.'
      : 'The server received your order. Its status and payment state below are supplied by the backend.'}</p>
    <div className="confirmation-details">
      <div><span>Order reference</span><strong>{order.reference}</strong></div>
      <div><span>Order status</span><strong>{demo ? 'Demo preview only' : order.status}</strong></div>
      <div><span>Payment status</span><strong>{demo ? 'Not processed' : (order.paymentStatus || 'Pending')}</strong></div>
      <div><span>Delivery address</span><strong>{address}</strong></div>
    </div>
    <div className="confirmation-items">{items.map((item, index) => { const unitPrice = item.unitPriceInPaise ?? item.unit_price_in_paise ?? item.priceInPaise ?? 0; return <div className="summary-row" key={`${item.dishId || item.name || item.dishNameSnapshot || item.dish_name_snapshot}-${index}`}><span>{item.quantity} × {item.name || item.dishNameSnapshot || item.dish_name_snapshot}</span><strong>{money(unitPrice * item.quantity)}</strong></div>; })}</div>
    <div className="summary-row"><span>Subtotal</span><strong>{money(order.subtotalInPaise ?? order.totalInPaise)}</strong></div>
    {order.deliveryFeeInPaise > 0 && <div className="summary-row"><span>Delivery</span><strong>{money(order.deliveryFeeInPaise)}</strong></div>}
    {order.discountInPaise > 0 && <div className="summary-row"><span>Discount</span><strong>−{money(order.discountInPaise)}</strong></div>}
    {order.taxInPaise > 0 && <div className="summary-row"><span>Tax</span><strong>{money(order.taxInPaise)}</strong></div>}
    <div className="summary-total"><span>{demo ? 'Illustrative total' : 'Server total'}</span><strong>{money(order.totalInPaise)}</strong></div>
    <div className="confirmation-actions"><button className="button button-primary" onClick={onBrowse}>Continue browsing</button><a className="button button-outline" href="/">Return Home</a></div>
  </section>;
}

function Checkout({ cart, clearCart }) {
  const idempotencyKey = useRef(createReference('ORDER'));
  const entries = Object.entries(cart)
    .map(([id, value]) => ({ dish: menu.find((item) => item.id === id), ...value }))
    .filter((line) => line.dish);
  const stale = entries.some((line) => line.priceNeedsReview || (line.unitPriceInPaise != null && line.unitPriceInPaise !== line.dish.priceInPaise));
  const subtotal = calculateSubtotal(entries.map((line) => ({
    priceInPaise: line.unitPriceInPaise ?? line.dish.priceInPaise,
    quantity: line.quantity,
  })));
  const coupon = readStorage('aerodine-demo-coupon', '');
  const discount = coupon === 'AERO10' ? calculatePercentageDiscount(subtotal, 10) : 0;
  const total = subtotal - discount;
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(ORDER_API_URL ? 'cod' : 'demo');
  const isLive = Boolean(ORDER_API_URL);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || !entries.length || stale || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      if (isLive) {
        const body = await responseJson(await fetch(ORDER_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey.current },
          body: JSON.stringify({
            customer: {
              name: form.elements.fullName.value.trim(),
              phone: form.elements.phone.value.trim(),
              email: form.elements.email.value.trim() || null,
            },
            deliveryAddress: {
              house: form.elements.house.value.trim(),
              street: form.elements.street.value.trim(),
              landmark: form.elements.landmark.value.trim() || null,
              city: form.elements.city.value.trim(),
              state: form.elements.state.value.trim(),
              pincode: form.elements.pincode.value.trim(),
              instructions: form.elements.instructions.value.trim() || null,
            },
            items: entries.map(({ dish, quantity, instructions }) => ({
              dishId: dish.id,
              quantity,
              specialInstructions: instructions || null,
            })),
            couponCode: coupon || null,
            paymentMethod,
          }),
        }));
        const serverOrder = body.order || body;
        const reference = serverOrder.orderNumber || serverOrder.reference || serverOrder.id;
        if (!reference || typeof serverOrder.status !== 'string' || !Number.isSafeInteger(serverOrder.totalInPaise)) {
          throw new Error('The order service returned an incomplete response. Please contact support before retrying.');
        }
        const completed = {
          ...serverOrder,
          reference,
          items: serverOrder.items || serverOrder.orderItems || [],
          address: serverOrder.deliveryAddress || serverOrder.delivery_address_snapshot,
          mode: 'live',
        };
        setConfirmation(completed);
        saveStorage('aerodine-last-live-order', { reference });
      } else {
        const reference = createReference('DEMO');
        const address = `${form.elements.house.value.trim()}, ${form.elements.street.value.trim()}${form.elements.landmark.value.trim() ? `, near ${form.elements.landmark.value.trim()}` : ''}, ${form.elements.city.value.trim()}, ${form.elements.state.value.trim()} ${form.elements.pincode.value.trim()}`;
        const demoOrder = {
          reference,
          name: form.elements.fullName.value.trim(),
          phone: form.elements.phone.value.trim(),
          email: form.elements.email.value.trim(),
          address,
          subtotalInPaise: subtotal,
          deliveryFeeInPaise: 0,
          discountInPaise: discount,
          taxInPaise: 0,
          totalInPaise: total,
          paymentMethod: 'demo',
          paymentStatus: 'Not processed',
          status: 'Demo preview only',
          items: entries.map(({ dish, quantity, unitPriceInPaise, instructions }) => ({
            dishId: dish.id,
            name: dish.name,
            quantity,
            priceInPaise: unitPriceInPaise ?? dish.priceInPaise,
            specialInstructions: instructions || '',
          })),
          mode: 'demo',
          createdAt: new Date().toISOString(),
        };
        const requests = readStorage('aerodine-demo-orders', {});
        requests[reference] = demoOrder;
        if (!saveStorage('aerodine-demo-orders', requests)) {
          throw new Error('This browser could not save the demo order. Check available storage and try again.');
        }
        setConfirmation(demoOrder);
      }
      clearCart();
      try {
        localStorage.removeItem('aerodine-demo-coupon');
      } catch {
        setError('Order was saved, but this browser could not clear the demo coupon.');
      }
    } catch (requestError) {
      setError(requestError.message || 'We could not submit your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }
  return <main className="page-wrap narrow-page">
    <div className="page-heading"><span className="eyebrow">{isLive ? 'SECURE ORDER REQUEST' : 'DEMO CHECKOUT'}</span><h1>Delivery details<span className="heading-period">.</span></h1><p>{isLive ? 'The server validates serviceability and recalculates the total before creating an order.' : 'Demo checkout stores a preview in this browser only. No order is sent and no payment is processed.'}</p></div>
    {confirmation ? <OrderConfirmation order={confirmation} onBrowse={() => { window.location.assign('/menu'); }} />
      : entries.length ? <form className="form-card" onSubmit={submit}>
      <h2>Your details</h2>
      {error && <div className="notice-box error-box" role="alert">{error}</div>}
      <div className="form-grid"><label>Full name<input name="fullName" autoComplete="name" required minLength="2" /></label><label>Mobile number<input name="phone" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" placeholder="10-digit Indian number" required /></label><label className="span-two">Email <span className="optional">(optional)</span><input name="email" type="email" autoComplete="email" /></label></div>
      <h2>Delivery address</h2><p className="form-hint">{isLive ? 'The server will verify serviceability for this address.' : 'Delivery serviceability has not been checked in this demo.'}</p><div className="form-grid"><label>House or flat number<input name="house" autoComplete="address-line1" required /></label><label>Street and locality<input name="street" required /></label><label>Landmark <span className="optional">(optional)</span><input name="landmark" /></label><label>City<input name="city" defaultValue="Hyderabad" required /></label><label>State<input name="state" defaultValue="Telangana" required /></label><label>PIN code<input name="pincode" inputMode="numeric" pattern="[0-9]{6}" autoComplete="postal-code" required /></label><label className="span-two">Delivery instructions <span className="optional">(optional)</span><textarea name="instructions" rows="2" /></label></div>
      <h2>Payment method</h2>
      {isLive ? <label className="payment-select">Choose a payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="cod">Cash on delivery</option><option value="razorpay">Online payment (handled by secure payment provider)</option></select><small>The server verifies supported methods and payment status.</small></label> : <div className="demo-payment"><span className="radio-dot"></span><span><strong>Demo only — no payment</strong><small>Cash on delivery and online payment are unavailable until a secure backend and provider are configured.</small></span></div>}
      {stale && <div className="notice-box">A saved item needs price review. Return to your bag to confirm the current menu price.</div>}
      <div className="checkout-total"><span>Items subtotal</span><strong>{money(subtotal)}</strong></div>{discount > 0 && <div className="summary-row"><span>{isLive ? 'Coupon discount (server verified)' : 'Demo coupon discount'}</span><strong>−{money(discount)}</strong></div>}<div className="summary-row muted"><span>Delivery fee and tax</span><span>{isLive ? 'Calculated by server' : 'Not configured'}</span></div><div className="checkout-total"><span>{isLive ? 'Estimated total' : 'Illustrative total'}</span><strong>{money(total)}</strong></div>
      <p className="small-note">{isLive ? 'Displayed totals are estimates. The server recalculates the authoritative order total.' : 'This demo total excludes unconfigured delivery fees and taxes. No payment or delivery serviceability check occurs.'}</p>
      {stale ? <a className="button button-outline full-button" href="/cart">Review your bag</a> : <button className="button button-primary full-button" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : isLive ? 'Place order' : 'Save demo order'} <span>→</span></button>}
    </form> : <div className="empty-state"><h2>Your bag is empty.</h2><a className="button button-primary" href="/menu">Browse menu</a></div>}
  </main>;
}

function Reservations() {
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isLive = Boolean(RESERVATION_API_URL);
  async function submit(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity() || submitting) return;
    const form = event.currentTarget;
    const request = {
      customerName: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      email: form.elements.email.value.trim() || null,
      reservationDate: form.elements.date.value,
      startTime: form.elements.time.value,
      guestCount: Number(form.elements.guests.value),
      seatingPreference: form.elements.seating.value,
      occasion: form.elements.occasion.value,
      specialRequests: form.elements.requests.value.trim() || null,
    };
    setError('');
    setSubmitting(true);
    try {
      let result;
      if (isLive) {
        const body = await responseJson(await fetch(RESERVATION_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }));
        const reservation = body.reservation || body;
        if (!reservation.reference || !['confirmed', 'pending'].includes(reservation.status)) {
          throw new Error('The booking service returned an incomplete response. Please try again.');
        }
        result = { ...request, reference: reservation.reference, status: reservation.status, mode: 'live' };
      } else {
        result = { ...request, reference: createReference('DEMO'), status: 'pending', mode: 'demo' };
        const pending = readStorage('aerodine-reservation-requests', []);
        pending.push(result);
        if (!saveStorage('aerodine-reservation-requests', pending)) {
          throw new Error('This browser could not save the demo reservation. Check available storage and try again.');
        }
      }
      setConfirmation(result);
      form.reset();
    } catch (requestError) {
      setError(requestError.message || 'We could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return <main className="page-wrap reservation-page ambient-page">
    <div className="page-heading"><span className="eyebrow">A PLACE AT THE TABLE</span><h1>Make it a gathering<span className="heading-period">.</span></h1><p>Tell us what you have in mind. Restaurant hours and availability are pending confirmation.</p></div>
    {confirmation ? <section className="confirmation-card" aria-live="polite">
      <span className="status-pill">{confirmation.mode === 'demo' ? 'DEMO MODE · NOT A CONFIRMED BOOKING' : confirmation.status === 'confirmed' ? 'BOOKING CONFIRMED BY THE RESTAURANT' : 'REQUEST RECEIVED · PENDING CONFIRMATION'}</span>
      <span className="confirmation-mark" aria-hidden="true">{confirmation.mode === 'live' && confirmation.status === 'confirmed' ? '✓' : 'A'}</span>
      <span className="eyebrow">AERODINE · HITECH CITY</span>
      <h2>{confirmation.mode === 'demo' ? 'Your reservation request is saved!' : confirmation.status === 'confirmed' ? 'Your table is confirmed.' : 'Your request is received.'}</h2>
      <p>{confirmation.mode === 'demo'
        ? 'Thank you for choosing AeroDine. Your reservation details have been saved in this demo. Since live booking is not connected, your table is not yet confirmed.'
        : confirmation.status === 'confirmed'
          ? 'The restaurant booking service confirmed your reservation.'
          : 'The restaurant received your request. Your table is not confirmed yet; please wait for the restaurant to confirm.'}</p>
      <div className="confirmation-details">
        <div><span>Reference</span><strong>{confirmation.reference}</strong></div>
        <div><span>Name</span><strong>{confirmation.customerName}</strong></div>
        <div><span>Date</span><strong>{confirmation.reservationDate}</strong></div>
        <div><span>Preferred time</span><strong>{confirmation.startTime}</strong></div>
        <div><span>Guests</span><strong>{confirmation.guestCount}</strong></div>
        <div><span>Seating</span><strong>{confirmation.seatingPreference}</strong></div>
      </div>
      <div className="confirmation-actions"><a className="button button-primary" href="/">Return Home</a><button className="button button-outline" onClick={() => setConfirmation(null)}>Make another reservation</button></div>
    </section> : <div className="reservation-layout">
      <form className="form-card" onSubmit={submit}>
        <h2>Reservation request</h2>
        {error && <div className="notice-box error-box" role="alert">{error}</div>}
        <div className="form-grid">
          <label>Your name<input name="name" autoComplete="name" required minLength="2" /></label>
          <label>Mobile number<input name="phone" type="tel" inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" placeholder="10-digit Indian number" required /></label>
          <label>Email <span className="optional">(optional)</span><input name="email" type="email" autoComplete="email" /></label>
          <label>Guests<select name="guests" required defaultValue=""><option value="" disabled>Select guests</option>{[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label>Date<input name="date" type="date" min={minDate} required /></label>
          <label>Preferred time<input name="time" type="time" required /></label>
          <label>Seating preference<select name="seating" defaultValue="No preference"><option>No preference</option><option>Indoor</option><option>Window</option></select></label>
          <label>Occasion <span className="optional">(optional)</span><select name="occasion" defaultValue="None"><option>None</option><option>Birthday</option><option>Anniversary</option><option>Other</option></select></label>
          <label className="span-two">Special requests <span className="optional">(optional)</span><textarea name="requests" rows="3" maxLength="300" /></label>
        </div>
        <p className="small-note">{isLive ? 'The restaurant service checks availability before returning a request status.' : 'Demo mode saves a local request only; it does not reserve a table.'}</p>
        <button className="button button-primary full-button" type="submit" disabled={submitting}>{submitting ? 'Sending request…' : isLive ? 'Send reservation request' : 'Save demo request'}</button>
      </form>
      <aside className="reservation-note"><span className="eyebrow">BEFORE YOU PLAN</span><h2>Hours are being confirmed.</h2><p>The supplied operating-hours note is unverified. {isLive ? 'The booking service must verify the time slot before confirming.' : 'This demo cannot check live table availability.'}</p><div className="notice-box">Hitech City, Hyderabad<br />Hours: pending confirmation<br />Booking: {isLive ? 'server availability check' : 'demo preview only'}</div></aside>
    </div>}
  </main>;
}

function OrderDetails() {
  const reference = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
  const [order, setOrder] = useState(() => reference.startsWith('DEMO-') ? readStorage('aerodine-demo-orders', {})[reference] : null);
  const [loading, setLoading] = useState(Boolean(ORDER_API_URL && !reference.startsWith('DEMO-')));
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ORDER_API_URL || reference.startsWith('DEMO-')) return undefined;
    const controller = new AbortController();
    fetch(`${ORDER_API_URL.replace(/\/+$/, '')}/${encodeURIComponent(reference)}`, { signal: controller.signal })
      .then(responseJson)
      .then((body) => {
        const result = body.order || body;
        const resultReference = result.orderNumber || result.reference || result.id;
        if (!resultReference || typeof result.status !== 'string' || !Number.isSafeInteger(result.totalInPaise)) {
          throw new Error('The order service returned incomplete details.');
        }
        setOrder({
          ...result,
          reference: resultReference,
          items: result.items || result.orderItems || result.order_items || [],
          address: result.deliveryAddress || result.delivery_address_snapshot,
          paymentStatus: result.paymentStatus || result.payment_status,
          subtotalInPaise: result.subtotalInPaise ?? result.subtotal_in_paise,
          deliveryFeeInPaise: result.deliveryFeeInPaise ?? result.delivery_fee_in_paise,
          discountInPaise: result.discountInPaise ?? result.discount_in_paise,
          taxInPaise: result.taxInPaise ?? result.tax_in_paise,
          totalInPaise: result.totalInPaise ?? result.total_in_paise,
          mode: 'live',
        });
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message || 'Could not load this order.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [reference]);
  return <main className="page-wrap narrow-page"><div className="page-heading"><span className="eyebrow">ORDER LOOKUP</span><h1>Order details<span className="heading-period">.</span></h1></div>{loading ? <div className="empty-state" role="status">Loading order details…</div> : error ? <div className="notice-box error-box" role="alert">{error}</div> : order ? <OrderConfirmation order={{ ...order, mode: order.mode || 'demo' }} onBrowse={() => window.location.assign('/menu')} /> : <div className="empty-state"><h2>We couldn't find this order.</h2><p>Demo orders are available only in the browser where they were placed.</p><a className="button button-primary" href="/menu">Back to menu</a></div>}</main>;
}

function Account() {
  return <main className="page-wrap narrow-page"><div className="page-heading"><span className="eyebrow">YOUR AERODINE</span><h1>Account<span className="heading-period">.</span></h1><p>Guest preview</p></div><div className="form-card"><div className="status-pill">Authentication not configured</div><h2>Account services are not connected.</h2><p>Sign-in, saved addresses and order history require Supabase Auth and server-side policies. Guest browsing is available in this demo.</p><a className="button button-primary" href="/menu">Explore the menu</a></div></main>;
}

function Admin() {
  const savedRequests = readStorage('aerodine-reservation-requests', []);
  const requests = Array.isArray(savedRequests) ? savedRequests : [];
  return <main className="page-wrap"><div className="page-heading"><span className="eyebrow">STAFF WORKSPACE PREVIEW</span><h1>Admin overview<span className="heading-period">.</span></h1><p>This is a non-secure local preview, not an administration system.</p></div><div className="notice-box">Admin controls are intentionally read-only until server-side authentication and role checks are configured. Do not use this preview to manage live orders, customers, prices or bookings.</div><div className="admin-cards"><article><span className="eyebrow">MENU PREVIEW</span><strong>{menu.length}</strong><p>Seeded dish records</p></article><article><span className="eyebrow">IMAGE REVIEW</span><strong>{imageValidationReport.unverifiedImages.length}</strong><p>Photographs pending verification</p></article><article><span className="eyebrow">RESERVATION PREVIEWS</span><strong>{requests.length}</strong><p>Saved in this browser only</p></article></div></main>;
}

function Footer() {
  return <footer className="site-footer"><div className="footer-main"><a className="brand" href="/"><span className="brand-mark">A</span><span>Aero<span className="brand-light">Dine</span><small>FRESHLY CRAFTED, ALWAYS WELCOMING</small></span></a><p>Good food. Unhurried moments.<br />Hitech City, Hyderabad, Telangana.</p><div className="footer-links"><a href="/menu">Menu</a><a href="/reservations">Reservations</a><a href="/account">My account</a><a href="/admin">Admin preview</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} AeroDine</span><span>Business hours and service details pending verification.</span></div></footer>;
}

function App() {
  const [cart, setCart] = useState(() => normalizeCart(readStorage(CART_KEY, {})));
  const [theme, setTheme] = useState(getThemePreference);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState('');
  useEffect(() => {
    saveStorage(CART_KEY, cart);
  }, [cart]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      return;
    }
  }, [theme]);
  useEffect(() => {
    function onStorage(event) {
      if (event.key === CART_KEY) setCart(normalizeCart(readStorage(CART_KEY, {})));
      if (event.key === THEME_KEY && (event.newValue === 'light' || event.newValue === 'dark')) setTheme(event.newValue);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    if (!selected) return undefined;
    function onKeyDown(event) { if (event.key === 'Escape') setSelected(null); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);
  const count = Object.values(cart).reduce((sum, line) => sum + line.quantity, 0);
  function add(id) {
    const dish = menu.find((item) => item.id === id);
    if (!dish) return;
    if ((cart[id]?.quantity || 0) >= 50) {
      setToast(`Maximum quantity reached for ${dish.name}.`);
      return;
    }
    setCart((current) => {
      const currentQuantity = current[id]?.quantity || 0;
      if (currentQuantity >= 50) return current;
      return {
        ...current,
        [id]: {
          quantity: currentQuantity + 1,
          unitPriceInPaise: current[id]?.unitPriceInPaise ?? dish.priceInPaise,
          priceNeedsReview: current[id]?.priceNeedsReview || false,
          instructions: current[id]?.instructions || '',
        },
      };
    });
    setToast(`${dish.name} added to your bag.`);
  }
  function update(id, patch) {
    setCart((current) => {
      const previous = current[id];
      if (!previous) return current;
      if (patch.quantity !== undefined && (!Number.isSafeInteger(patch.quantity) || patch.quantity > 50)) return current;
      const quantity = patch.quantity ?? previous.quantity;
      if (patch.quantity !== undefined && quantity < 1) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: { ...previous, ...patch } };
    });
  }
  function remove(id) {
    setCart((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }
  const path = location.pathname;
  let page;
  if (path === '/menu') page = <MenuPage add={add} open={setSelected} cart={cart} update={update} />;
  else if (path === '/cart') page = <CartPage cart={cart} update={update} remove={remove} />;
  else if (path === '/checkout') page = <Checkout cart={cart} clearCart={() => setCart({})} />;
  else if (path === '/reservations') page = <Reservations />;
  else if (path.startsWith('/orders/')) page = <OrderDetails />;
  else if (path === '/account') page = <Account />;
  else if (path === '/admin') page = <Admin />;
  else page = <Home add={add} open={setSelected} cart={cart} update={update} />;
  return <><Header count={count} theme={theme} setTheme={setTheme} />{page}<Footer />{toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}{selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="dish-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close dish details">×</button><Image dish={selected} className="modal-photo" /><div className="modal-copy"><span className="eyebrow">{selected.category} · {selected.vegetarian ? 'Vegetarian' : 'Non-vegetarian'}</span><h2 id="modal-title">{selected.name}</h2><p>{selected.description}</p><p className="small-note">Ingredients, allergens and dietary certification have not been verified.</p><div className="dish-card-bottom"><strong>{money(selected.priceInPaise)}</strong><button className="button button-primary" onClick={() => { add(selected.id); setSelected(null); }}>Add to bag</button></div></div></section></div>}</>;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
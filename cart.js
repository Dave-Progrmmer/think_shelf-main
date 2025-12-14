/**
 * THINKERS SHELF CART LOGIC
 * Re-written for robustness, relative path handling, and UI updates.
 */

(function () {
  const CART_KEY = "thinkers_shelf_cart_v2";

  // Helper: Resolve image paths based on current location
  // If we are in 'details/' (depth 1), paths starting with 'assets' need '../'
  // This is a simple heuristic. A more robust way is to store absolute paths or root-relative paths starting with /
  // but since this is a local file system site without a web server root, we use relative adjustments.
  function resolveImagePath(rawPath) {
    if (!rawPath) return "";
    // If path is already resolved or absolute-ish (http), leave it.
    if (rawPath.startsWith("http") || rawPath.startsWith("//")) return rawPath;

    const isDetailsPage = window.location.pathname.includes("/details/");
    const hasParentTraversal = rawPath.startsWith("../");

    if (isDetailsPage && !hasParentTraversal) {
      return "../" + rawPath;
    }
    if (!isDetailsPage && hasParentTraversal) {
      return rawPath.replace("../", "");
    }
    return rawPath;
  }

  // Helper: Normalize path for storage (strip ../)
  function normalizePathForStorage(path) {
    return path.replace(/^\.\.\//, "");
  }

  function getCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Cart parse error", e);
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update all elements with data-cart-count
    const elements = document.querySelectorAll("[data-cart-count]");
    elements.forEach((el) => {
      // Check if it's just a number badge or text
      if (el.tagName === "SPAN" || el.classList.contains("count-badge")) {
        el.textContent = count;
      } else {
        el.textContent = `Cart (${count})`;
      }
    });
  }

  function addToCart(product) {
    const cart = getCart();
    const existing = cart.find((x) => x.id === product.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        ...product,
        image: normalizePathForStorage(product.image), // Store clean path
        quantity: 1,
      });
    }

    saveCart(cart);

    // Visual feedback
    const btn = document.querySelector(`[data-id="${product.id}"]`);
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = "Added!";
      btn.classList.add("text-gold");
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove("text-gold");
      }, 1000);
    }
  }

  function removeFromCart(id) {
    console.log("Removing", id);
    const cart = getCart().filter((x) => x.id !== id);
    saveCart(cart);
    renderCart(); // Re-render if on cart page
  }

  function updateQuantity(id, delta) {
    const cart = getCart();
    const item = cart.find((x) => x.id === id);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity < 1) item.quantity = 1;

    saveCart(cart);
    renderCart();
  }

  function formatCurrency(amount) {
    return "₦" + amount.toLocaleString("en-NG");
  }

  // Renders the cart items table/list
  function renderCart() {
    const mount = document.getElementById("cart-mount");
    if (!mount) return;

    const cart = getCart();
    const totalEl = document.getElementById("cart-total-amount"); // Specific ID for price

    if (cart.length === 0) {
      mount.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">Your cart is empty. <a href="books.html" class="text-blue">Browse books</a></div>`;
      if (totalEl) totalEl.textContent = formatCurrency(0);
      return;
    }

    let total = 0;

    mount.innerHTML = cart
      .map((item) => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;
        const displayImage = resolveImagePath(item.image);

        return `
            <div class="cart-item">
                <img src="${displayImage}" alt="${item.title}">
                <div class="cart-info">
                    <h3 class="book-title" style="margin:0">${item.title}</h3>
                    <p class="text-secondary" style="font-size:0.9rem">${formatCurrency(
                      item.price
                    )} each</p>
                    <div class="cart-controls">
                        <button class="btn btn-outline" style="padding:4px 12px" onclick="window.__Cart.updateQuantity('${
                          item.id
                        }', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="btn btn-outline" style="padding:4px 12px" onclick="window.__Cart.updateQuantity('${
                          item.id
                        }', 1)">+</button>
                        <button class="btn btn-outline" style="margin-left:auto; border-color:var(--danger); color:var(--danger)" onclick="window.__Cart.removeFromCart('${
                          item.id
                        }')">Remove</button>
                    </div>
                </div>
                <div class="text-gold" style="font-weight:700; font-size:1.1rem; text-align:right;">
                    ${formatCurrency(lineTotal)}
                </div>
            </div>
            `;
      })
      .join("");

    if (totalEl) totalEl.textContent = formatCurrency(total);
  }

  // Renders the checkout summary
  function renderCheckout() {
    const mount = document.getElementById("checkout-mount");
    if (!mount) return;

    const cart = getCart();
    const totalEl = document.getElementById("checkout-total");

    if (cart.length === 0) {
      mount.innerHTML = `<div style="text-align:center;">Your cart is empty. <a href="books.html">Go back to books</a></div>`;
      if (totalEl) totalEl.textContent = formatCurrency(0);
      return;
    }

    let total = 0;
    mount.innerHTML = cart
      .map((item) => {
        const lineTotal = item.price * item.quantity;
        total += lineTotal;
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding: 1rem 0;">
                <div style="display:flex; align-items:center; gap: 1rem;">
                    <img src="${resolveImagePath(item.image)}" alt="${
          item.title
        }" style="width:50px; height:70px; object-fit:cover; border-radius:4px;">
                    <div>
                        <div style="font-weight:600;">${item.title}</div>
                        <div class="text-secondary" style="font-size:0.9rem;">${
                          item.quantity
                        } x ${formatCurrency(item.price)}</div>
                    </div>
                </div>
                <div style="font-weight:700;">${formatCurrency(lineTotal)}</div>
            </div>
            `;
      })
      .join("");

    if (totalEl) totalEl.textContent = formatCurrency(total);
  }

  function clearCart() {
    saveCart([]);
    renderCart();
  }

  // Initialize triggers
  function init() {
    // Find all add-to-cart buttons
    document.body.addEventListener("click", (e) => {
      // Check for direct attr or bubble up
      const btn = e.target.closest("[data-add-to-cart]");
      if (btn) {
        e.preventDefault();
        const product = {
          id: btn.dataset.id,
          title: btn.dataset.title,
          price: Number(btn.dataset.price),
          image: btn.dataset.image,
        };
        addToCart(product);
      }
    });

    // Initial render
    updateCartCount();
    renderCart();
    renderCheckout();
  }

  // Expose API for inline onclick handlers
  window.__Cart = {
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

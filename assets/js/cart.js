import { supabase } from "./supabaseClient.js";

function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    cartCount.textContent = total;
    cartCount.style.display = total === 0 ? "none" : "flex";
  }
}

// ── Undo toast ──
// Tracks the single most recently removed item so it can be restored.
let lastRemoved = null; // { item, index }
let undoTimeout = null;

function showUndoToast(itemName) {
  let toast = document.getElementById('cart-undo-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cart-undo-toast';
    toast.className = 'cart-undo-toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <span>${itemName} removed from cart.</span>
    <button id="cart-undo-btn" type="button">Undo</button>
  `;
  toast.classList.add('show');

  document.getElementById('cart-undo-btn').addEventListener('click', () => {
    if (!lastRemoved) return;
    const cart = getCart();
    const insertAt = Math.min(lastRemoved.index, cart.length);
    cart.splice(insertAt, 0, lastRemoved.item);
    saveCart(cart);
    renderCart();

    if (window.emieReact) {
      window.emieReact("assets/gifs/kilig_emie.gif", `Phew, got it back!`, 1800);
    }

    toast.classList.remove('show');
    clearTimeout(undoTimeout);
    lastRemoved = null;
  });

  clearTimeout(undoTimeout);
  undoTimeout = setTimeout(() => {
    toast.classList.remove('show');
    lastRemoved = null;
  }, 5000);
}

function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-items');
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">Your cart is empty. Start shopping!</p>';
    document.getElementById('cart-subtotal').textContent = '₱0.00';
    document.getElementById('cart-total').textContent = '₱0.00';
    document.getElementById('checkout-btn').disabled = true;
    return;
  }

  document.getElementById('checkout-btn').disabled = false;

  let subtotal = 0;

  cart.forEach((item, index) => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;

    const row = document.createElement('div');
    row.classList.add('cart-item');
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-details">
        <span class="cart-item-category">${item.category}</span>
        <h3 class="cart-item-name">${item.name}</h3>
        <span class="cart-item-price">₱${item.price}</span>
        <span class="cart-item-line">₱${item.price.toFixed(2)} × ${item.quantity} = <strong>₱${lineTotal.toFixed(2)}</strong></span>
      </div>
      <div class="cart-item-controls">
        <div class="qty-group">
          <button class="qty-btn qty-decrease" data-index="${index}">−</button>
          <span class="qty-display">${item.quantity}</span>
          <button class="qty-btn qty-increase" data-index="${index}">+</button>
        </div>
        <button class="remove-btn" data-index="${index}">Remove</button>
      </div>
    `;

    // Clicking anywhere on the card jumps back to the product page —
    // except the qty controls and Remove button, which do their own thing.
    row.addEventListener('click', (e) => {
      if (e.target.closest('.qty-group') || e.target.closest('.remove-btn')) return;
      window.location.href = `product.html?id=${item.id}`;
    });

    container.appendChild(row);
  });

  document.getElementById('cart-subtotal').textContent = `₱${subtotal.toFixed(2)}`;
  document.getElementById('cart-total').textContent = `₱${subtotal.toFixed(2)}`;
}

document.addEventListener('click', (e) => {
  const cart = getCart();

  if (e.target.classList.contains('qty-increase')) {
    const index = parseInt(e.target.dataset.index);
    cart[index].quantity += 1;
    
    if (window.emieReact) {
      window.emieReact(
        "assets/gifs/kilig_emie.gif",
        `More ${cart[index].name}? I like it!`,
        2000
      );
    }
    
    saveCart(cart);
    renderCart();
  }

  if (e.target.classList.contains('qty-decrease')) {
    const index = parseInt(e.target.dataset.index);
    let didRemove = false;
    
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
      
      if (window.emieReact) {
        window.emieReact(
          "assets/gifs/trans_emie.gif",
          `Okay, less it is...`,
          1800
        );
      }
    } else {
      lastRemoved = { item: { ...cart[index] }, index };
      didRemove = true;
      cart.splice(index, 1);
      
      if (window.emieReact) {
        window.emieReact(
          "assets/gifs/jelous_emie.gif",
          `You're removing it? 😢`,
          2000
        );
      }
    }
    
    saveCart(cart);
    renderCart();

    if (didRemove) {
      showUndoToast(lastRemoved.item.name);
    }
  }

  if (e.target.classList.contains('remove-btn')) {
    const index = parseInt(e.target.dataset.index);
    const itemName = cart[index].name;
    lastRemoved = { item: { ...cart[index] }, index };
    cart.splice(index, 1);
    
    if (window.emieReact) {
      window.emieReact(
        "assets/gifs/angry_emie.gif",
        `You removed ${itemName}!`,
        2200
      );
    }
    
    saveCart(cart);
    renderCart();
    showUndoToast(itemName);
  }
});

// Checkout button
document.getElementById('checkout-btn').addEventListener('click', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    localStorage.setItem('redirectAfterLogin', 'checkout.html');
    window.location.href = 'account.html';
    return;
  }
  window.location.href = 'checkout.html';
});

// Initial render
renderCart();
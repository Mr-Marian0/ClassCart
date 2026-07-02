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
    subtotal += item.price * item.quantity;

    const row = document.createElement('div');
    row.classList.add('cart-item');
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-details">
        <span class="cart-item-category">${item.category}</span>
        <h3 class="cart-item-name">${item.name}</h3>
        <span class="cart-item-price">₱${item.price}</span>
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
  }

  if (e.target.classList.contains('remove-btn')) {
    const index = parseInt(e.target.dataset.index);
    const itemName = cart[index].name;
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
  }
});

// Checkout button
document.getElementById('checkout-btn').addEventListener('click', () => {
  const user = localStorage.getItem('loggedInUser');
  if (!user) {
    localStorage.setItem('redirectAfterLogin', 'checkout.html');
    window.location.href = 'account.html';
    return;
  }
  window.location.href = 'checkout.html';
});

// Initial render
renderCart();

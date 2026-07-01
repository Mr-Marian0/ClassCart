function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function renderCart() {
  const cart = getCart();
  const container = document.getElementById('cart-items');
  container.innerHTML = '';

  if (cart.length === 0) {
    container.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    document.getElementById('cart-subtotal').textContent = '₱0.00';
    document.getElementById('cart-total').textContent = '₱0.00';
    return;
  }

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
        <button class="qty-btn" data-index="${index}" data-action="decrease">-</button>
        <span>${item.quantity}</span>
        <button class="qty-btn" data-index="${index}" data-action="increase">+</button>
      </div>
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;
    container.appendChild(row);
  });

  document.getElementById('cart-subtotal').textContent = `₱${subtotal.toFixed(2)}`;
  document.getElementById('cart-total').textContent = `₱${subtotal.toFixed(2)}`;
}

document.addEventListener('click', (e) => {
  const cart = getCart();

  if (e.target.classList.contains('qty-btn')) {
    const index = e.target.dataset.index;
    const action = e.target.dataset.action;

    if (action === 'increase') {
      cart[index].quantity += 1;
    } else if (action === 'decrease') {
      if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
      } else {
        cart.splice(index, 1);
      }
    }

    saveCart(cart);
    renderCart();
  }

  if (e.target.classList.contains('remove-btn')) {
    const index = e.target.dataset.index;
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  }
});

renderCart();

// ---------------------------------- Check out event ---------------------------------------------

document.querySelector('.checkout-btn').addEventListener('click', () => {
  const user = localStorage.getItem('loggedInUser');
  if (!user) {
    localStorage.setItem('redirectAfterLogin', 'checkout.html');
    window.location.href = 'account.html';
    return;
  }
  window.location.href = 'checkout.html';
});
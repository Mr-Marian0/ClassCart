// Product Details Section

const params = new URLSearchParams(window.location.search);
const productId = parseInt(params.get("id"));

fetch("data/products.json")
  .then((res) => res.json())
  .then((products) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      document.getElementById("product-title").textContent = "Product not found";
      return;
    }

    document.getElementById("product-title").textContent = product.name;
    document.getElementById("product-price").textContent = `₱${product.price}`;
    document.getElementById("product-category").textContent = product.category;

    // Stars
    const stars = Math.round(product.rating || 4);
    document.getElementById("product-rating").innerHTML =
      `<span class="stars">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</span> <span>(${product.rating || 4}.0)</span>`;

    // Build all images (sampleImage + additionalImages)
    const allImages = [product.sampleImage, ...(product.additionalImages || [])];

    // Main showcase
    const showcase = document.getElementById("img-showcase");
    showcase.innerHTML = allImages
      .map((img) => `<img src="${img}" alt="${product.name}">`)
      .join("");

    // Thumbnails
    const select = document.getElementById("img-select");
    select.innerHTML = allImages
      .map((img, index) => `
        <div class="img-item">
          <img src="${img}" alt="${product.name}" data-id="${index}" ${index === 0 ? 'class="active"' : ''}>
        </div>
      `)
      .join("");

    // Thumbnail click sliding
    document.querySelectorAll(".img-item img").forEach((img) => {
      img.addEventListener("click", (e) => {
        e.preventDefault();
        
        // Update active state
        document.querySelectorAll(".img-item img").forEach(i => i.classList.remove("active"));
        img.classList.add("active");
        
        const imgId = img.dataset.id;
        const displayWidth = document.querySelector(".img-showcase img:first-child").clientWidth;
        document.querySelector(".img-showcase").style.transform =
          `translateX(${-(imgId) * displayWidth}px)`;
      });
    });

    // Add to cart button
    document.getElementById("add-to-cart-btn").addEventListener("click", () => {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const quantity = parseInt(document.getElementById("product-quantity").value) || 1;

      const item = {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        image: product.sampleImage,
        quantity: quantity,
      };

      const existing = cart.find((p) => p.id === item.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        cart.push(item);
      }

      localStorage.setItem("cart", JSON.stringify(cart));

      // Update cart count in header
      const cartCount = document.getElementById("cart-count");
      if (cartCount) {
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = total;
        cartCount.style.display = total === 0 ? "none" : "flex";
      }

      // Trigger Emie reaction
      if (window.emieReact) {
        window.emieReact(
          "assets/gifs/kilig_emie.gif",
          `Ooh! I love ${product.name}!`,
          2500
        );
      }

      // Reset quantity
      document.getElementById("product-quantity").value = 1;

      // Show success message (you can replace with a toast notification if preferred)
      const btn = document.getElementById("add-to-cart-btn");
      const originalText = btn.textContent;
      btn.textContent = "✓ Added!";
      btn.style.background = "var(--cc-leaf)";
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = "var(--cc-yellow)";
      }, 2000);
    });
  });

// Handle window resize for image slider
window.addEventListener("resize", () => {
  const active = document.querySelector(".img-item img.active");
  if (!active) return;
  const imgId = active.dataset.id;
  const displayWidth = document.querySelector(".img-showcase img:first-child").clientWidth;
  document.querySelector(".img-showcase").style.transform =
    `translateX(${-(imgId) * displayWidth}px)`;
});

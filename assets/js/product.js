// ------------------------------------- Product Details Section ------------------------------------

const params = new URLSearchParams(window.location.search);
const productId = parseInt(params.get("id"));

fetch("../data/products.json")
  .then((res) => res.json())
  .then((products) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    document.getElementById("product-title").textContent = product.name;
    document.getElementById("product-price").textContent = `₱${product.price}`;
    document.getElementById("product-category").textContent = product.category;

    // Stars
    const stars = Math.round(product.rating);
    document.getElementById("product-rating").innerHTML =
      "★".repeat(stars) +
      "☆".repeat(5 - stars) +
      ` <span>${product.rating}</span>`;

    // Build all images (sampleImage + additionalImages)
    const allImages = [product.sampleImage, ...product.additionalImages];

    // Main showcase
    const showcase = document.getElementById("img-showcase");
    showcase.innerHTML = allImages
      .map(
        (img) => `
      <img src="../${img}" alt="${product.name}">
    `,
      )
      .join("");

    // Thumbnails
    const select = document.getElementById("img-select");
    select.innerHTML = allImages
      .map(
        (img, index) => `
      <div class="img-item">
        <a href="#" data-id="${index + 1}">
          <img src="../${img}" alt="${product.name}">
        </a>
      </div>
    `,
      )
      .join("");

    // Thumbnail click sliding
    document.querySelectorAll(".img-select a").forEach((imgItem) => {
      imgItem.addEventListener("click", (e) => {
        e.preventDefault();
        const imgId = imgItem.dataset.id;
        const displayWidth = document.querySelector(
          ".img-showcase img:first-child",
        ).clientWidth;
        document.querySelector(".img-showcase").style.transform =
          `translateX(${-(imgId - 1) * displayWidth}px)`;
      });
    });

    document.querySelector(".btn").addEventListener("click", () => {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const quantity = parseInt(
        document.querySelector(".purchase-info input").value,
      );

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

      // Update cart count instantly
      const total = cart.reduce((sum, item) => sum + item.quantity, 0);
      const cartCount = document.getElementById("cart-count");
      if (cartCount) {
        cartCount.textContent = total;
        cartCount.style.display = total === 0 ? "none" : "inline";
      }

      alert(`${product.name} added to cart!`);
    });
  });

window.addEventListener("resize", () => {
  const active = document.querySelector(".img-select a.active");
  if (!active) return;
  const imgId = active.dataset.id;
  const displayWidth = document.querySelector(
    ".img-showcase img:first-child",
  ).clientWidth;
  document.querySelector(".img-showcase").style.transform =
    `translateX(${-(imgId - 1) * displayWidth}px)`;
});

import { createTimeline, stagger, utils, splitText } from "https://cdn.jsdelivr.net/npm/animejs/+esm";
import { supabase } from "./supabaseClient.js";

// Top Seller Section
supabase
  .from("products")
  .select("*")
  .then(({ data: products, error }) => {
    if (error) {
      console.error("Error loading products:", error);
      return;
    }
    // Find top seller by sold_count
    const topSeller = products.reduce((max, product) => 
      product.sold_count > max.sold_count ? product : max
    );

    renderTopSeller(topSeller);
    renderFeatured(products, "Writing Tools");

    // Featured tabs
    document.querySelectorAll(".featured-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".featured-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        renderFeatured(products, tab.dataset.category);
      });
    });

    // Welcome Emie on homepage (2-3 second delay)
    setTimeout(() => {
      if (window.showEmieWelcome) {
        window.showEmieWelcome();
      }
    }, 2500);
  });

function renderTopSeller(product) {
  const card = document.getElementById("top-seller-card");
  
  card.innerHTML = `
    <!-- Best Seller Badge - Top Right Corner of the whole card -->
    <img src="assets/images/best-seller.png" 
         alt="Best Seller" 
         class="best-seller-badge">

    <div class="top-seller-image">
      <img src="${product.sample_image}" alt="${product.name}">
      <div class="top-seller-badge">Hot Pick of the Month!</div>
    </div>
    
    <div class="top-seller-details">
      <h2 class="top-seller-title">${product.name}</h2>
      <span class="top-seller-price">₱${product.price}</span>
      <div class="top-seller-sold">
        <span>Customers are loving it:</span>
        <span class="top-seller-sold-badge">${product.sold_count.toLocaleString()}+ sold</span>
      </div>
      
      <div class="top-seller-cta-group">
        <button class="top-seller-cta" data-product-id="${product.id}">Add to Cart</button>
        <button class="top-seller-view-btn" data-product-id="${product.id}">View Product</button>
      </div>
    </div>
  `;

  // Add to Cart
  const addBtn = card.querySelector(".top-seller-cta");
  addBtn.addEventListener("click", () => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const item = {
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.sample_image,
      quantity: 1,
    };

    const existing = cart.find((p) => p.id === item.id);
    if (existing) existing.quantity += 1;
    else cart.push(item);

    localStorage.setItem("cart", JSON.stringify(cart));

    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
      const total = cart.reduce((sum, item) => sum + item.quantity, 0);
      cartCount.textContent = total;
      cartCount.style.display = total === 0 ? "none" : "flex";
    }

    if (window.emieReact) {
      window.emieReact(
        "assets/gifs/kilig_emie.gif",
        `🔥 Great choice! ${product.name} is flying off the shelves!`,
        2500
      );
    }

    const originalText = addBtn.textContent;
    addBtn.textContent = "✓ Added!";
    addBtn.style.background = "var(--cc-leaf)";
    
    setTimeout(() => {
      addBtn.textContent = originalText;
      addBtn.style.background = "var(--cc-yellow)";
    }, 2000);
  });

  const viewBtn = card.querySelector(".top-seller-view-btn");
  viewBtn.addEventListener("click", () => {
    window.location.href = `product.html?id=${product.id}`;
  });

}

function renderFeatured(products, category) {
  const grid = document.getElementById("featured-grid");
  const filtered = products.filter((p) => p.category === category).slice(0, 4);

  grid.classList.add("flip");

  setTimeout(() => {
    grid.innerHTML = "";

    filtered.forEach((product) => {
      const card = document.createElement("div");
      card.classList.add("product-card");
      card.innerHTML = `
        <img src="${product.sample_image}" alt="${product.name}">
        <div class="product-card-details">
          <h3 class="product-card-name">${product.name}</h3>
          <span class="product-card-price">₱${product.price}</span>
          <button class="product-add-btn">Add to Cart</button>
        </div>
      `;
      grid.appendChild(card);

      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
    window.location.href = `product.html?id=${product.id}`;
  });
    });

    grid.classList.remove("flip");
  }, 400);
}

// ================= HERO TEXT ANIMATION =================

document.addEventListener("DOMContentLoaded", () => {

    const hero = document.querySelector(".hero");
    const heroTitle = document.querySelector(".hero-content h1");
    const heroSubhead = document.querySelector(".hero-subhead");

    if (!hero || !heroTitle || !heroSubhead) return;

    function splitWords(element) {

        const text = element.textContent.trim();

        element.innerHTML = "";

        text.split(" ").forEach(word => {

            const wrapper = document.createElement("span");
            wrapper.className = "word-wrapper";

            const span = document.createElement("span");
            span.className = "word";
            span.textContent = word;

            wrapper.appendChild(span);
            element.appendChild(wrapper);

            element.append(" ");

        });

    }

    splitWords(heroTitle);
    splitWords(heroSubhead);

    const words = document.querySelectorAll(".word");

    let visible = false;

    function intro() {

        createTimeline({
            defaults: {
                duration: 650,
                ease: "out(3)"
            }
        })

        .add(words, {
            y: ["100%", "0%"],
            opacity: [0, 1]
        }, stagger(60))

        .init();

    }

    function outro() {

        createTimeline({
            defaults: {
                duration: 450,
                ease: "in(3)"
            }
        })

        .add(words, {
            y: ["0%", "-100%"],
            opacity: [1, 0]
        }, stagger(25))

        .init();

    }

    const observer = new IntersectionObserver(entries => {

        entries.forEach(entry => {

            if (entry.isIntersecting && !visible) {

                visible = true;
                intro();

            }

            if (!entry.isIntersecting && visible) {

                visible = false;
                outro();

            }

        });

    }, {

        threshold: 0.35

    });

    observer.observe(hero);

});
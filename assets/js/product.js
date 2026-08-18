// Product Details Section
import { supabase } from "./supabaseClient.js";

const params = new URLSearchParams(window.location.search);
const productId = parseInt(params.get("id"));

supabase.from("products")
  .select("*")
  .eq("id", productId)
  .eq("is_active", true)
  .single()
  .then(async ({ data: product, error }) => {
    if (error || !product) {
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
    const allImages = [product.sample_image, ...(product.additional_images || [])];

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
    let currentImageIndex = 0;

    document.querySelectorAll(".img-item img").forEach((img) => {
      img.addEventListener("click", (e) => {
        e.preventDefault();
        
        // Update active state
        document.querySelectorAll(".img-item img").forEach(i => i.classList.remove("active"));
        img.classList.add("active");
        
        const imgId = img.dataset.id;
        currentImageIndex = Number(imgId);
        const displayWidth = document.querySelector(".img-showcase img:first-child").clientWidth;
        document.querySelector(".img-showcase").style.transform =
          `translateX(${-(imgId) * displayWidth}px)`;
      });
    });

    // ── Tags/keywords ──
    const tagsContainer = document.getElementById("product-tags");
    tagsContainer.innerHTML = (product.tags || [])
      .map((tag) => `<span class="product-tag">${tag}</span>`)
      .join("");

    // ── Image zoom lightbox ──
    const lightbox = document.getElementById("img-lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxPrev = document.getElementById("lightbox-prev");
    const lightboxNext = document.getElementById("lightbox-next");

    function openLightbox(index) {
      currentImageIndex = index;
      lightboxImg.src = allImages[currentImageIndex];
      lightboxImg.classList.remove("zoomed");
      lightboxImg.style.transform = "scale(1)";
      lightboxPrev.disabled = currentImageIndex === 0;
      lightboxNext.disabled = currentImageIndex === allImages.length - 1;
      lightbox.classList.add("active");
    }

    function closeLightbox() {
      lightbox.classList.remove("active");
      lightboxImg.classList.remove("zoomed");
      lightboxImg.style.transform = "scale(1)";
    }

    document.getElementById("img-zoom-hint").addEventListener("click", () => openLightbox(currentImageIndex));
    document.querySelector(".img-showcase").addEventListener("click", () => openLightbox(currentImageIndex));

    document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox(); // click outside the image
    });

    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("active")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && !lightboxPrev.disabled) showLightboxImage(currentImageIndex - 1);
      if (e.key === "ArrowRight" && !lightboxNext.disabled) showLightboxImage(currentImageIndex + 1);
    });

    function showLightboxImage(index) {
      if (index < 0 || index >= allImages.length) return;
      currentImageIndex = index;
      lightboxImg.classList.remove("zoomed");
      lightboxImg.style.transform = "scale(1)";
      lightboxImg.src = allImages[currentImageIndex];
      lightboxPrev.disabled = currentImageIndex === 0;
      lightboxNext.disabled = currentImageIndex === allImages.length - 1;
    }

    lightboxPrev.addEventListener("click", () => showLightboxImage(currentImageIndex - 1));
    lightboxNext.addEventListener("click", () => showLightboxImage(currentImageIndex + 1));

    // Click the image itself to toggle zoom, centered on click position
    lightboxImg.addEventListener("click", (e) => {
      const isZoomed = lightboxImg.classList.contains("zoomed");

      if (isZoomed) {
        lightboxImg.classList.remove("zoomed");
        lightboxImg.style.transform = "scale(1)";
        return;
      }

      const rect = lightboxImg.getBoundingClientRect();
      const originX = ((e.clientX - rect.left) / rect.width) * 100;
      const originY = ((e.clientY - rect.top) / rect.height) * 100;
      lightboxImg.style.transformOrigin = `${originX}% ${originY}%`;
      lightboxImg.classList.add("zoomed");
      lightboxImg.style.transform = "scale(2.2)";
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
        image: product.sample_image,
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

    // Wishlist toggle (per logged-in user; account.js sets ccUserId on login)
    const wishlistBtn = document.getElementById("wishlist-toggle-btn");

    let wishlistRowId = null; // set once we know this product is saved

    async function refreshWishlistBtn() {
      const uid = localStorage.getItem("ccUserId");
      if (!uid) {
        wishlistRowId = null;
        wishlistBtn.classList.remove("saved");
        wishlistBtn.setAttribute("aria-pressed", "false");
        return;
      }

      const { data, error } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", uid)
        .eq("product_id", product.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to check wishlist status:", error);
        return;
      }

      wishlistRowId = data ? data.id : null;
      wishlistBtn.classList.toggle("saved", !!wishlistRowId);
      wishlistBtn.setAttribute("aria-pressed", String(!!wishlistRowId));
    }

    refreshWishlistBtn();

    wishlistBtn.addEventListener("click", async () => {
      const uid = localStorage.getItem("ccUserId");
      if (!uid) {
        alert("Please log in to save items to your wishlist.");
        window.location.href = "account.html";
        return;
      }

      wishlistBtn.disabled = true;

      if (wishlistRowId) {
        const { error } = await supabase.from("wishlist").delete().eq("id", wishlistRowId);
        wishlistBtn.disabled = false;
        if (error) {
          alert("Couldn't update your wishlist: " + error.message);
          return;
        }
        if (window.emieReact) {
          window.emieReact("assets/gifs/kilig_emie.gif", `Removed from wishlist.`, 2000);
        }
      } else {
        const { error } = await supabase
          .from("wishlist")
          .insert({ user_id: uid, product_id: product.id });
        wishlistBtn.disabled = false;
        if (error) {
          alert("Couldn't update your wishlist: " + error.message);
          return;
        }
        if (window.emieReact) {
          window.emieReact("assets/gifs/kilig_emie.gif", `Saved ${product.name} to your wishlist!`, 2000);
        }
      }

      await refreshWishlistBtn();
    });

    // ── Reviews ──
    await initReviews(product.id);
  });

async function initReviews(productId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myProfile = null;
  if (user) {
    const { data } = await supabase
      .from("profile")
      .select("is_review_banned")
      .eq("id", user.id)
      .maybeSingle();
    myProfile = data;
  }

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load reviews:", error);
    return;
  }

  // Look up reviewer display names via the safe RPC (only exposes id+name)
  const userIds = [...new Set(reviews.map((r) => r.user_id))];
  let nameMap = {};
  if (userIds.length > 0) {
    const { data: names, error: nameError } = await supabase.rpc("get_reviewer_names", {
      user_ids: userIds,
    });
    if (nameError) {
      console.error("Failed to load reviewer names:", nameError);
    } else {
      nameMap = Object.fromEntries(names.map((n) => [n.id, n.name]));
    }
  }

  renderReviewSummary(reviews);
  renderReviewsList(reviews, nameMap);
  renderReviewForm(productId, user, myProfile, reviews);
}

function starString(rating) {
  const rounded = Math.round(rating);
  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function renderReviewSummary(reviews) {
  const scoreEl = document.getElementById("reviews-avg-score");
  const starsEl = document.getElementById("reviews-avg-stars");
  const countEl = document.getElementById("reviews-count");

  if (reviews.length === 0) {
    scoreEl.textContent = "—";
    starsEl.textContent = "";
    countEl.textContent = "0 reviews";
    return;
  }

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  scoreEl.textContent = avg.toFixed(1);
  starsEl.textContent = starString(avg);
  countEl.textContent = `${reviews.length} review${reviews.length === 1 ? "" : "s"}`;
}

function renderReviewsList(reviews, nameMap) {
  const list = document.getElementById("reviews-list");
  const empty = document.getElementById("reviews-empty");
  list.innerHTML = "";

  if (reviews.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  reviews.forEach((r) => {
    const card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML = `
      <div class="review-card-head">
        <span class="review-author">${nameMap[r.user_id] || "Customer"}</span>
        <span class="review-stars">${starString(r.rating)}</span>
        <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
      </div>
      <p class="review-comment">${r.comment}</p>
      ${
        r.admin_response
          ? `<div class="review-admin-response">
               <span class="responder">Response from ClassCart</span>
               <p>${r.admin_response}</p>
             </div>`
          : ""
      }
    `;
    list.appendChild(card);
  });
}

function renderReviewForm(productId, user, myProfile, reviews) {
  const box = document.getElementById("review-form-box");

  if (!user) {
    box.innerHTML = `<p class="review-notice">Please <a href="account.html">log in</a> to leave a review.</p>`;
    return;
  }

  if (myProfile?.is_review_banned) {
    box.innerHTML = `<p class="review-notice">You're currently unable to post reviews on this account.</p>`;
    return;
  }

  const alreadyReviewed = reviews.some((r) => r.user_id === user.id);
  if (alreadyReviewed) {
    box.innerHTML = `<p class="review-notice">You've already reviewed this product. Thanks for sharing your thoughts!</p>`;
    return;
  }

  let selectedRating = 0;

  box.innerHTML = `
    <div class="star-picker" id="review-star-picker">
      ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-value="${n}">★</button>`).join("")}
    </div>
    <textarea id="review-comment-input" placeholder="What did you think of this product?"></textarea>
    <button type="button" class="btn" id="review-submit-btn">Submit Review</button>
  `;

  const stars = box.querySelectorAll(".star-picker button");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = Number(star.dataset.value);
      stars.forEach((s) => s.classList.toggle("filled", Number(s.dataset.value) <= selectedRating));
    });
  });

  document.getElementById("review-submit-btn").addEventListener("click", async () => {
    const comment = document.getElementById("review-comment-input").value.trim();

    if (selectedRating === 0) {
      alert("Please select a star rating.");
      return;
    }
    if (!comment) {
      alert("Please write a short comment.");
      return;
    }

    const btn = document.getElementById("review-submit-btn");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating: selectedRating,
      comment,
    });

    if (error) {
      console.error("Failed to submit review:", error);
      alert("Couldn't submit your review: " + error.message);
      btn.disabled = false;
      btn.textContent = "Submit Review";
      return;
    }

    if (window.emieReact) {
      window.emieReact("assets/gifs/kilig_emie.gif", "Thanks for your review!", 2200);
    }

    await initReviews(productId);
  });
}

// Handle window resize for image slider
window.addEventListener("resize", () => {
  const active = document.querySelector(".img-item img.active");
  if (!active) return;
  const imgId = active.dataset.id;
  const displayWidth = document.querySelector(".img-showcase img:first-child").clientWidth;
  document.querySelector(".img-showcase").style.transform =
    `translateX(${-(imgId) * displayWidth}px)`;
});
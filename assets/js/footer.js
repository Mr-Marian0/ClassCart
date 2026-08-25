// =========================================
// FOOTER COMPONENT
// =========================================

fetch("components/footer.html")
  .then((res) => res.text())
  .then((html) => {
    document.getElementById("footer-placeholder").innerHTML = html;

    // =========================================
    // EMAIL SUBSCRIPTION
    // =========================================

    const emailInput = document.querySelector(".footer-email input");
    const emailBtn = document.querySelector(".footer-email button");

    if (emailBtn) {
      emailBtn.addEventListener("click", () => {
        const email = emailInput.value.trim();

        if (!email) {
          alert("Please enter your email.");
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
          alert("Please enter a valid email.");
          return;
        }

        if (window.emieReact) {
          window.emieReact(
            "assets/gifs/kilig_emie.gif",
            `Thanks for subscribing, ${email}! You'll get great deals!`,
            2500
          );
        }

        alert("Thanks for subscribing!");
        emailInput.value = "";
      });

      if (emailInput) {
        emailInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            emailBtn.click();
          }
        });
      }
    }

    // =========================================
    // CAREERS & AFFILIATES MODAL
    // =========================================

    const footerModal = document.getElementById("footer-info-modal");
    const footerModalTitle = document.getElementById("footer-modal-title");
    const footerModalText = document.getElementById("footer-modal-text");
    const footerModalClose = document.getElementById("footer-modal-close");
    const footerModalOk = document.getElementById("footer-modal-ok");

    // Open modal
    function openFooterModal(title, message) {
      if (!footerModal) return;

      footerModalTitle.textContent = title;
      footerModalText.textContent = message;

      footerModal.classList.add("show");
    }

    // Close modal
    function closeFooterModal() {
      if (!footerModal) return;

      footerModal.classList.remove("show");
    }

    // Careers
    const careersLink = document.getElementById("careers-link");

    if (careersLink) {
      careersLink.addEventListener("click", (e) => {
        e.preventDefault();

        openFooterModal(
          "Interested in Working With Us?",
          "For available job opportunities, please contact the admins for more information."
        );
      });
    }

    // Affiliates
    const affiliatesLink = document.getElementById("affiliates-link");

    if (affiliatesLink) {
      affiliatesLink.addEventListener("click", (e) => {
        e.preventDefault();

        openFooterModal(
          "Interested in Becoming an Affiliate?",
          "For available commission opportunities and affiliate details, please contact the admins."
        );
      });
    }

    // Close button
    if (footerModalClose) {
      footerModalClose.addEventListener("click", closeFooterModal);
    }

    // Got It button
    if (footerModalOk) {
      footerModalOk.addEventListener("click", closeFooterModal);
    }

    // Click outside modal
    if (footerModal) {
      footerModal.addEventListener("click", (e) => {
        if (e.target === footerModal) {
          closeFooterModal();
        }
      });
    }

    // ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeFooterModal();
      }
    });
  })
  .catch((error) => {
    console.error("Error loading footer:", error);
  });


// =========================================
// HELPER: ARE WE ON THE LANDING PAGE?
// =========================================

function isLandingPage() {
  return (
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname === "/" ||
    window.location.pathname.endsWith("/")
  );
}


// =========================================
// HELPER: SMOOTH SCROLL
// =========================================

function smoothScrollToSection(sectionId) {
  const section = document.getElementById(sectionId);

  if (!section) {
    return false;
  }

  section.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  return true;
}


// =========================================
// ABOUT US
// =========================================
// Landing page:
//     Smooth scroll → #about-me
//
// Other pages:
//     Redirect → index.html#about-me
// =========================================

document.addEventListener("click", (e) => {
  const aboutUsLink = e.target.closest("#about-us-link");

  if (!aboutUsLink) {
    return;
  }

  e.preventDefault();

  if (isLandingPage()) {
    smoothScrollToSection("about-me");
  } else {
    window.location.href = "index.html#about-me";
  }
});


// =========================================
// MY ACCOUNT
// =========================================
// Always redirect to account.html
// =========================================

document.addEventListener("click", (e) => {
  const accountLink = e.target.closest("#account-link");

  if (!accountLink) {
    return;
  }

  e.preventDefault();

  window.location.href = "account.html";
});


// =========================================
// CONTACT US
// =========================================
// Landing page:
//     Smooth scroll → #about-me
//     Automatically select Contact tab
//
// Other pages:
//     Redirect → index.html#about-me
// =========================================

document.addEventListener("click", (e) => {
  const contactLink = e.target.closest("#contact-link");

  if (!contactLink) {
    return;
  }

  e.preventDefault();

  if (isLandingPage()) {
    const aboutMeSection = document.getElementById("about-me");
    const contactButton = document.querySelector(
      '.about-me-nav-btn[data-panel="contact"]'
    );

    // Select Contact tab
    if (contactButton) {
      contactButton.click();
    }

    // Smoothly scroll to About Me
    if (aboutMeSection) {
      aboutMeSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  } else {
    window.location.href = "index.html#about-me";
  }
});


// =========================================
// ORDERING GUIDE
// =========================================
// Landing page:
//     Smooth scroll → #how-it-works
//
// Other pages:
//     Redirect → index.html#how-it-works
// =========================================

document.addEventListener("click", (e) => {
  const orderingLink = e.target.closest("#ordering-link");

  if (!orderingLink) {
    return;
  }

  e.preventDefault();

  if (isLandingPage()) {
    smoothScrollToSection("how-it-works");
  } else {
    window.location.href = "index.html#how-it-works";
  }
});


// =========================================
// NEW ARRIVALS
// =========================================
// Always redirect to shop.html
// =========================================

document.addEventListener("click", (e) => {
  const newArrivalsLink = e.target.closest("#new-link");

  if (!newArrivalsLink) {
    return;
  }

  e.preventDefault();

  window.location.href = "shop.html";
});


// =========================================
// BEST SELLERS
// =========================================
// Same functionality as Ordering Guide
//
// Landing page:
//     Smooth scroll → #how-it-works
//
// Other pages:
//     Redirect → index.html#how-it-works
// =========================================

document.addEventListener("click", (e) => {
  const bestSellersLink = e.target.closest("#bestsellers-link");

  if (!bestSellersLink) {
    return;
  }

  e.preventDefault();

  if (isLandingPage()) {
    smoothScrollToSection("top-seller-card");
  } else {
    window.location.href = "index.html#top-seller-card";
  }
});
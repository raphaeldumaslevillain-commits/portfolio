/* ============================================================
   Raphaël Dumas Levillain — Portfolio interactions
   ============================================================ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Preloader ---------- */
  window.addEventListener("load", () => {
    const pre = document.getElementById("preloader");
    if (pre) setTimeout(() => pre.classList.add("is-done"), 1300);
  });

  /* ---------- Year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Image fallbacks (mark parent when image is missing) ---------- */
  document.querySelectorAll("img[src]").forEach((img) => {
    const flag = () => img.closest(".hero__portrait-img, .project__media")?.classList.add("img-missing");
    if (img.complete && img.naturalWidth === 0) flag();
    img.addEventListener("error", flag);
    img.addEventListener("load", () => {
      if (img.naturalWidth === 0) flag();
    });
  });

  /* ---------- Custom cursor ---------- */
  const cursor = document.getElementById("cursor");
  const dot = document.getElementById("cursorDot");
  if (cursor && dot && window.matchMedia("(hover: hover)").matches) {
    let mx = 0, my = 0, cx = 0, cy = 0;
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });
    const loop = () => {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    document.querySelectorAll("[data-cursor]").forEach((el) => {
      const type = el.getAttribute("data-cursor");
      el.addEventListener("mouseenter", () => cursor.classList.add(type === "view" ? "is-view" : "is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-view", "is-hover"));
    });
  }

  /* ---------- Nav scroll state + progress ---------- */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("scrollProgress");
  const onScroll = () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle("is-scrolled", y > 40);
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");
  if (burger && mobileMenu) {
    const toggle = (open) => {
      burger.classList.toggle("is-open", open);
      mobileMenu.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    burger.addEventListener("click", () => toggle(!burger.classList.contains("is-open")));
    mobileMenu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => toggle(false)));
  }

  /* ---------- Split hero name into chars ---------- */
  document.querySelectorAll(".hero__name .char-wrap").forEach((wrap, wi) => {
    const words = wrap.textContent.split(" ");
    wrap.textContent = "";
    let ci = 0;
    words.forEach((word, widx) => {
      const wordSpan = document.createElement("span");
      wordSpan.style.display = "inline-block";
      wordSpan.style.whiteSpace = "nowrap";
      [...word].forEach((ch) => {
        const span = document.createElement("span");
        span.className = "name-char";
        span.textContent = ch;
        span.style.display = "inline-block";
        span.style.transform = prefersReduced ? "none" : "translateY(110%)";
        span.style.transition = `transform .8s var(--ease) ${wi * 0.15 + ci * 0.03}s`;
        wordSpan.appendChild(span);
        ci++;
      });
      wrap.appendChild(wordSpan);
      if (widx < words.length - 1) wrap.appendChild(document.createTextNode(" "));
    });
  });
  // trigger hero name after a tick
  setTimeout(() => {
    document.querySelectorAll(".hero__name .name-char").forEach((s) => (s.style.transform = "translateY(0)"));
  }, 1400);

  /* ---------- Split reveal-words titles ---------- */
  document.querySelectorAll(".reveal-words").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    words.forEach((w, i) => {
      const word = document.createElement("span");
      word.className = "word";
      const inner = document.createElement("span");
      inner.textContent = w;
      inner.style.transitionDelay = i * 0.05 + "s";
      word.appendChild(inner);
      el.appendChild(word);
      el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---------- Intersection reveal ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(".reveal-up, .reveal-line, .reveal-words, .reveal-portrait").forEach((el, i) => {
    el.style.transitionDelay = Math.min((i % 5) * 0.06, 0.3) + "s";
    io.observe(el);
  });

  /* ---------- Animated counters ---------- */
  const counters = document.querySelectorAll(".stat__num[data-count]");
  const counterIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.getAttribute("data-count"), 10);
        let cur = 0;
        const dur = 1400;
        const start = performance.now();
        const step = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        counterIO.unobserve(el);
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((c) => counterIO.observe(c));

  /* ---------- Hero word rotator ---------- */
  const rotator = document.getElementById("rotator");
  if (rotator && !prefersReduced) {
    const words = [...rotator.querySelectorAll("span")];
    let idx = 0;
    words[0].classList.add("is-active");
    setInterval(() => {
      const current = words[idx];
      current.classList.remove("is-active");
      current.classList.add("is-out");
      setTimeout(() => current.classList.remove("is-out"), 500);
      idx = (idx + 1) % words.length;
      words[idx].classList.add("is-active");
    }, 2400);
  } else if (rotator) {
    rotator.querySelector("span").classList.add("is-active");
  }

  /* ---------- Project accordion ---------- */
  document.querySelectorAll(".project__info").forEach((info) => {
    info.addEventListener("click", () => {
      info.closest(".project").classList.toggle("is-open");
    });
  });

  /* ---------- Magnetic buttons ---------- */
  if (window.matchMedia("(hover: hover)").matches && !prefersReduced) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });
  }

  /* ---------- Hero parallax on portrait ---------- */
  const portrait = document.getElementById("portrait");
  if (portrait && window.matchMedia("(hover: hover)").matches && !prefersReduced) {
    window.addEventListener("mousemove", (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 18;
      const y = (e.clientY / window.innerHeight - 0.5) * 18;
      portrait.style.transform = `rotateY(${x * 0.4}deg) rotateX(${-y * 0.4}deg) translate(${x}px, ${y}px)`;
    });
  }
})();

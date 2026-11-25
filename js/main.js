/* Builds the shared header/footer and fills pages from js/content.js. */
(() => {
  "use strict";

  const SITE = window.SITE || {};
  const PROJECTS = window.PROJECTS || [];
  const root = document.documentElement;
  const page = document.body.dataset.page;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  /* ---------- helpers ---------- */

  // Small DOM builder. Strings become text nodes, so content is never parsed as HTML.
  function el(tag, props, ...kids) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value === true ? "" : value);
    }
    kids.flat().forEach((kid) => kid != null && node.append(kid));
    return node;
  }

  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        /* storage unavailable: the choice just won't persist */
      }
    },
  };

  /* ---------- icons (static, trusted markup) ---------- */

  const solid = (d) =>
    `<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
  const line = (inner) =>
    `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

  const ICONS = {
    github: solid(
      "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
    ),
    linkedin: solid(
      "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
    ),
    mail: line('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    link: line(
      '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>'
    ),
    sun: line(
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'
    ),
    moon: line('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
    external: line('<path d="M7 17 17 7M8 7h9v9"/>'),
    download: line('<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>'),
  };

  function icon(name) {
    const tpl = document.createElement("template");
    tpl.innerHTML = ICONS[name] || ICONS.link;
    const svg = tpl.content.firstElementChild;
    svg.classList.add(`icon-${name}`);
    return svg;
  }

  /* ---------- shared pieces ---------- */

  const mailto = () => `mailto:${SITE.email || ""}`;

  function socialList(withEmail) {
    const items = (SITE.socials || []).map((s) =>
      el(
        "li",
        null,
        el(
          "a",
          { href: s.url, target: "_blank", rel: "noopener noreferrer", "aria-label": s.label, title: s.label },
          icon(s.icon || String(s.label || "").toLowerCase())
        )
      )
    );
    if (withEmail && SITE.email) {
      items.push(
        el("li", null, el("a", { href: mailto(), "aria-label": "Email", title: "Email" }, icon("mail")))
      );
    }
    return el("ul", { class: "social-list" }, items);
  }

  function tagList(tags) {
    return el(
      "ul",
      { class: "tag-list", "aria-label": "Tools and topics" },
      (tags || []).map((t) => el("li", { class: "tag", text: t }))
    );
  }

  function projectTile(p) {
    return el(
      "a",
      { class: "tile", href: `project.html?p=${encodeURIComponent(p.slug)}` },
      p.tileImage || p.image
        ? el("img", { class: "tile-img", src: p.tileImage || p.image, alt: "", loading: "lazy", width: 1200, height: 750 })
        : null,
      el(
        "div",
        { class: "tile-body" },
        el("h3", { class: "tile-title", text: p.title }),
        p.result || p.year ? el("p", { class: "tile-meta", text: [p.result, p.year].filter(Boolean).join(" · ") }) : null,
        tagList((p.tags || []).slice(0, 3))
      )
    );
  }

  // On a group page the year's main project is a full-width card, and its parts are small tiles under it.
  function featureTile(p) {
    return el(
      "a",
      { class: "feature-tile", href: `project.html?p=${encodeURIComponent(p.slug)}` },
      p.tileImage || p.image ? el("img", { class: "feature-img", src: p.tileImage || p.image, alt: "", loading: "lazy", width: 1200, height: 750 }) : null,
      el(
        "div",
        { class: "feature-body" },
        el("h3", { class: "feature-title", text: p.title }),
        p.result || p.status ? el("p", { class: "feature-meta", text: [p.result, p.status].filter(Boolean).join(" · ") }) : null,
        p.summary ? el("p", { class: "feature-summary", text: p.summary }) : null,
        tagList((p.tags || []).slice(0, 4))
      )
    );
  }

  // A project that is not written yet is one small line, so it is easy to scroll past.
  function soonTile(p) {
    return el(
      "a",
      { class: "soon-tile", href: `project.html?p=${encodeURIComponent(p.slug)}` },
      p.tileImage || p.image ? el("img", { class: "soon-img", src: p.tileImage || p.image, alt: "", loading: "lazy", width: 120, height: 75 }) : null,
      el(
        "div",
        { class: "soon-body" },
        el("h3", { class: "soon-title", text: p.title }),
        el("p", { class: "soon-label", text: p.tileLabel || p.status || "Coming soon" }),
        p.tileBlurb ? el("p", { class: "soon-blurb", text: p.tileBlurb }) : null
      )
    );
  }

  function miniTile(p) {
    return el(
      "a",
      { class: "mini-tile", href: `project.html?p=${encodeURIComponent(p.slug)}` },
      p.tileImage || p.image ? el("img", { class: "mini-img", src: p.tileImage || p.image, alt: "", loading: "lazy", width: 600, height: 375 }) : null,
      el("span", { class: "mini-title", text: p.compact ? p.title.replace(/^SAE Aero /, "") : p.title.replace(/^SAE Aero (Micro|Advanced)( Class)?: /, "") }),
      p.compact && p.tileLabel ? el("span", { class: "mini-label", text: p.tileLabel }) : null
    );
  }

  // A group of projects (like SAE) shown as one large tile that opens the group's page.
  function groupTile(g) {
    const count = PROJECTS.filter((p) => p.group === g.slug).length; // every page linked from the group, sub-projects included
    const groupHref = `projects.html?group=${encodeURIComponent(g.slug)}`;
    // The SAE tile's picture is split in two (Advanced on top, Micro below); each half opens that class's project page.
    const SPLITS = {
      "sae-aero": [
        { slug: "sae-aero-advanced-vtol", label: "Advanced Class", image: "assets/library/aero-cover-advanced.jpg" },
        { slug: "sae-aero-micro-2025", label: "Micro Class", image: "assets/library/aero-cover-micro.jpg" },
      ],
    };
    const split = SPLITS[g.slug];
    if (split && g.image) {
      // Two separate photos, each with rounded corners and a gap between them like the other tiles, divided on a diagonal.
      // The shapes are drawn in the tile's own pixel size (redrawn when it resizes), so the corners stay round at any size.
      const NS = "http://www.w3.org/2000/svg";
      const mk = (tag, attrs) => {
        const n = document.createElementNS(NS, tag);
        Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
        return n;
      };
      const svg = mk("svg", { class: "split-zones", preserveAspectRatio: "none", role: "group" });
      const defs = mk("defs");
      const grad = mk("linearGradient", { id: "split-fade", gradientUnits: "userSpaceOnUse", x1: 0, x2: 0 });
      [["0", 0], ["0.45", 0.3], ["1", 0.9]].forEach(([o, a]) => grad.append(mk("stop", { offset: o, "stop-color": "#080a12", "stop-opacity": a })));
      defs.append(grad);
      svg.append(defs);
      const parts = split.map((z, n) => {
        const clip = mk("clipPath", { id: `split-clip-${n}` });
        const path = mk("path");
        clip.append(path);
        defs.append(clip);
        const a = mk("a", { href: `project.html?p=${encodeURIComponent(z.slug)}`, "aria-label": z.label, class: "split-half", "clip-path": `url(#split-clip-${n})` });
        const img = mk("image", { href: z.image, preserveAspectRatio: "none" });
        a.append(img);
        let fade = null;
        if (n === split.length - 1) {
          fade = mk("rect", { fill: "url(#split-fade)", "pointer-events": "none" });
          a.append(fade);
        }
        svg.append(a);
        return { path, img, fade };
      });
      const round = (pts, r) => {
        let d = "";
        pts.forEach((p, i) => {
          const prev = pts[(i + pts.length - 1) % pts.length];
          const next = pts[(i + 1) % pts.length];
          const toward = (q) => {
            const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
            const t = Math.min(r, len / 2) / len;
            return [p[0] + dx * t, p[1] + dy * t];
          };
          const a = toward(prev), b = toward(next);
          d += `${i ? "L" : "M"}${a[0]} ${a[1]}Q${p[0]} ${p[1]} ${b[0]} ${b[1]}`;
        });
        return d + "Z";
      };
      const layout = (W, H) => {
        if (!W || !H) return;
        const r = 16; // same corner radius as the other tiles
        const gap = 16; // same gap as between the other tiles
        const tan = Math.tan((9 * Math.PI) / 180); // the diagonal follows the pitch of the Micro aircraft
        const yc = 0.53 * H;
        const yl = yc + (W / 2) * tan;
        const yr = yc - (W / 2) * tan;
        const off = gap / 2 / Math.cos((9 * Math.PI) / 180);
        const top = [[0, 0], [W, 0], [W, yr - off], [0, yl - off]];
        const bottom = [[0, yl + off], [W, yr + off], [W, H], [0, H]];
        parts[0].path.setAttribute("d", round(top, r));
        parts[1].path.setAttribute("d", round(bottom, r));
        const sc = Math.max(W / 1600, H / 1000);
        const iw = 1600 * sc, ih = 1000 * sc;
        parts.forEach((pt) => {
          pt.img.setAttribute("width", iw);
          pt.img.setAttribute("height", ih);
          pt.img.setAttribute("x", (W - iw) / 2);
          pt.img.setAttribute("y", (H - ih) / 2);
          if (pt.fade) {
            pt.fade.setAttribute("width", W);
            pt.fade.setAttribute("height", H);
          }
        });
        grad.setAttribute("y1", H * 0.4);
        grad.setAttribute("y2", H);
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      };
      const tile = el(
        "div",
        { class: "tile tile-wide tile-split" },
        svg,
        el(
          "div",
          { class: "tile-body" },
          el("h3", { class: "tile-title" }, el("a", { href: groupHref, text: g.title })),
          el("p", { class: "tile-meta", text: `${count} project${count === 1 ? "" : "s"}` }),
          tagList((g.tags || []).slice(0, 3)),
          el("a", { class: "tile-cta", href: groupHref, text: "Click for more →" })
        )
      );
      if (window.ResizeObserver) new ResizeObserver((entries) => layout(entries[0].contentRect.width, entries[0].contentRect.height)).observe(tile);
      return tile;
    }
    return el(
      "a",
      { class: "tile tile-wide", href: groupHref },
      g.image ? el("img", { class: "tile-img", src: g.image, alt: "", loading: "lazy", width: 1200, height: 750 }) : null,
      el(
        "div",
        { class: "tile-body" },
        el("h3", { class: "tile-title", text: g.title }),
        el("p", { class: "tile-meta", text: `${count} project${count === 1 ? "" : "s"}` }),
        tagList((g.tags || []).slice(0, 3)),
        el("span", { class: "tile-cta", text: "Click for more →" })
      )
    );
  }

  /* ---------- header & footer ---------- */

  function renderHeader() {
    const mount = $('[data-component="header"]');
    if (!mount) return;

    const navLink = (label, href, state) =>
      el("a", {
        href,
        text: label,
        class: state ? "is-active" : null,
        "aria-current": state === "current" ? "page" : null,
      });

    // The SAE Aero Design group has its own tab. It is current on the group page and on any project page that belongs to it.
    const qs = new URLSearchParams(location.search);
    const projectGroup = page === "project" ? (PROJECTS.find((x) => x.slug === qs.get("p")) || {}).group : null;
    const onSae = (page === "projects" && qs.get("group") === "sae-aero") || projectGroup === "sae-aero";
    const NAV = [
      ["Home", "index.html", "home"],
      ["Projects", "projects.html", "projects"],
      ["SAE Aero", "projects.html?group=sae-aero", "sae"],
      ["About", "about.html", "about"],
      ["Contact", "contact.html", "contact"],
    ];
    const nav = el(
      "nav",
      { class: "main-nav", "aria-label": "Main" },
      NAV.map(([label, href, key]) =>
        navLink(
          label,
          href,
          key === "sae"
            ? onSae
              ? "current"
              : null
            : key === "projects" && onSae
              ? null
              : page === key
                ? "current"
                : key === "projects" && page === "project"
                  ? "section"
                  : null
        )
      )
    );

    const themeBtn = el("button", { type: "button", class: "icon-btn theme-toggle" }, icon("sun"), icon("moon"));
    const syncThemeBtn = () => {
      const label = root.dataset.theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
      themeBtn.setAttribute("aria-label", label);
      themeBtn.title = label;
    };
    themeBtn.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      store.set("theme", root.dataset.theme);
      syncThemeBtn();
    });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!store.get("theme")) {
        root.dataset.theme = e.matches ? "dark" : "light";
        syncThemeBtn();
      }
    });
    syncThemeBtn();

    const controls = el("div", { class: "header-controls" });
    if (SITE.showAccentPicker) controls.append(accentPicker());
    controls.append(themeBtn);

    mount.replaceChildren(
      el(
        "div",
        { class: "container header-inner" },
        el("a", { class: "brand", href: "index.html", text: SITE.name }),
        nav,
        controls
      )
    );
  }

  function accentPicker() {
    const options = [
      ["teal", "Teal"],
      ["lavender", "Light purple"],
    ];
    const group = el(
      "div",
      { class: "accent-picker", role: "group", "aria-label": "Preview accent color" },
      el("span", { class: "accent-picker-label", text: "Accent" })
    );
    const buttons = options.map(([value, label]) => {
      const btn = el("button", {
        type: "button",
        class: "swatch",
        "data-accent": value,
        "aria-label": `${label} accent`,
        title: label,
      });
      btn.addEventListener("click", () => {
        root.dataset.accent = value;
        store.set("accent", value);
        sync();
      });
      return btn;
    });
    const sync = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.accent === root.dataset.accent)));
    group.append(...buttons);
    sync();
    return group;
  }

  function renderFooter() {
    const mount = $('[data-component="footer"]');
    if (!mount) return;
    // SAE Aero pages carry a photo credit line at the bottom.
    const fq = new URLSearchParams(location.search);
    const fGroup = page === "project" ? (PROJECTS.find((x) => x.slug === fq.get("p")) || {}).group : null;
    const onSaePage = (page === "projects" && fq.get("group") === "sae-aero") || fGroup === "sae-aero";
    mount.replaceChildren(
      el(
        "div",
        { class: "container footer-inner" },
        onSaePage ? el("p", { class: "photo-credit", text: "Photos courtesy of Pilot Aeronautics, unless credited otherwise." }) : null,
        el("p", { text: `© ${new Date().getFullYear()} ${SITE.name}` }),
        socialList(true)
      )
    );
  }

  /* ---------- pages ---------- */

  function renderHome() {
    const photo = $('[data-site="photo"]');
    if (photo && SITE.photo) {
      photo.src = SITE.photo;
      photo.alt = SITE.photoAlt || "";
      if (SITE.photoFocus) photo.style.objectPosition = SITE.photoFocus;
    }
    $$text('[data-site="name"]', SITE.name);
    $$text('[data-site="title"]', SITE.title);
    $$text('[data-site="thanks"]', SITE.thanks);

    const bio = $('[data-render="bio"]');
    if (bio) bio.replaceChildren(...(SITE.bio || []).map((text) => el("p", { text })));

    const caption = $('[data-site="photoCaption"]');
    if (caption) {
      if (SITE.photoCaption) {
        caption.textContent = SITE.photoCaption;
        caption.hidden = false;
      }
    }

    renderQuickLinks();


    document.title = `${SITE.name} — ${SITE.title}`;
  }

  function $$text(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      if (value != null) node.textContent = value;
    });
  }

  function renderProjectsPage() {
    const grid = $('[data-render="all-projects"]');
    const groups = window.PROJECT_GROUPS || [];
    const slug = new URLSearchParams(location.search).get("group");
    const group = groups.find((g) => g.slug === slug);

    if (group) {
      // Inside a group: its heading, a way back, and only its projects.
      $(".page-head h1").textContent = group.title;
      $(".page-head .lead").textContent = group.summary || "";
      $(".page-head").before(el("a", { class: "back-link", href: "projects.html", text: "← All projects" }));

      // Intro first, then one section per year (newest first).
      const members = PROJECTS.filter((p) => p.group === group.slug);
      const years = (group.years || []).slice().sort((a, b) => b - a);
      const gphotos = group.photos || [];
      const section = (heading, items, photos = []) =>
        items.length || photos.length
          ? el(
              "section",
              { class: "year-section" },
              el("h2", { text: String(heading) }),
              items.some((p) => !p.parent)
                ? el("div", { class: "feature-grid" }, items.filter((p) => !p.parent).map((p) => (p.status === "Coming soon" || p.compact ? soonTile(p) : featureTile(p))))
                : null,
              items.some((p) => p.parent) ? el("div", { class: "mini-grid" }, items.filter((p) => p.parent).map(miniTile)) : null,
              photos.length ? el("div", { class: "about-photos year-photos" }, photos.map((ph) => aboutPhoto(ph))) : null
            )
          : null;
      const intro = (group.intro || []).length
        ? el(
            "section",
            { class: "group-intro" },
            el("h2", { text: group.introTitle || "About" }),
            group.intro.map((text) => el("p", { text }))
          )
        : null;
      const sections = years.map((y) =>
        section(y, members.filter((p) => p.season === y), gphotos.filter((ph) => ph.season === y))
      );
      sections.push(section("More", members.filter((p) => !years.includes(p.season)))); // anything without a matching year
      // One tall picture on the right runs alongside the heading, the summary, and "About the program".
      const head = $(".page-head");
      const text = el("div", { class: "group-top-text" });
      const pic = group.headerImage || group.image;
      const top = el(
        "div",
        { class: pic ? "group-top has-pic" : "group-top" },
        text,
        pic ? el("img", { class: "group-top-img", src: pic, alt: group.headerImageAlt || group.imageAlt || "", width: 600, height: 900 }) : null
      );
      head.replaceWith(top);
      // A prompt near the top so visitors do not have to scroll to find the projects.
      const firstSection = sections.find(Boolean);
      if (firstSection) firstSection.id = "group-projects";
      const jump = firstSection
        ? el("a", { class: "btn btn-primary group-cta", href: "#group-projects", text: "View the projects ↓" })
        : null;
      if (jump)
        jump.addEventListener("click", (e) => {
          e.preventDefault();
          const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          firstSection.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
        });
      text.append(head, jump, intro);
      grid.replaceWith(...sections.filter(Boolean));
      document.title = `${group.title} — ${SITE.name}`;
      return;
    }

    const used = groups.filter((g) => PROJECTS.some((p) => p.group === g.slug));
    // Chronological order, newest first (set NEWEST_FIRST to false to flip it). A group sorts by the earliest year of its projects;
    // projects from the same year keep the order they have in the data.
    const NEWEST_FIRST = true;
    const startYear = (p) => {
      const m = /\d{4}/.exec(String(p.year || p.season || ""));
      return m ? Number(m[0]) : 9999;
    };
    const entries = [
      ...used.map((g) => ({ key: Math.min(...PROJECTS.filter((p) => p.group === g.slug).map(startYear)), node: groupTile(g) })),
      ...PROJECTS.filter((p) => !p.group).map((p) => ({ key: startYear(p), node: projectTile(p) })),
    ];
    entries.forEach((e, i) => (e.i = i));
    // within one year, newest-first also reverses the data order (later projects in the list are the later ones)
    entries.sort((x, y) => (NEWEST_FIRST ? y.key - x.key || y.i - x.i : x.key - y.key || x.i - y.i));
    grid.replaceChildren(...entries.map((e) => e.node));
    document.title = `Projects — ${SITE.name}`;
  }

  // Engineering-report style overview: "## Heading", numbered figures ("Figure 2 - caption", caption below),
  // numbered tables ("Table 1 - caption", caption above), and references like {fig:file-name} and {tab:key}.
  function renderOverview(p, overview = p.overview) {
    const FIG = /^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/;
    const TAB = /^Table(?:\[([a-z0-9-]+)\])?:\s*([^\n]*)\n([\s\S]+)$/;
    const VID = /^Video:\s*(\S+)(?:\s+"([^"]*)")?(?:\s+(2x))?$/;
    const refs = { fig: {}, tab: {}, vid: {} };
    let f = p.image && p.imageCaption ? 2 : 1; // the page's main photo is Figure 1 when it has a caption
    let t = 1;
    let vn = 1;
    // "Collage: a.jpg, b.jpg, c.jpg "Caption"" shows several photos side by side as one numbered figure.
    const COL = /^Collage:\s*([^"]+?)\s+"([^"]*)"(?:\s+(small))?$/;
    // "Note[file.png "Caption"]: text" is a short note with a small figure beside it.
    const NOTE = /^Note\[([^\s\]]+)(?:\s+"([^"]*)")?\]:\s*([\s\S]+)$/;
    const items = overview.map((text) => {
      // "Stats:" then lines "- value | label" make a row of big numbers.
      if (/^Stats:/.test(text.trim())) {
        const rows = text
          .trim()
          .split("\n")
          .slice(1)
          .map((l) => l.trim())
          .filter((l) => l.startsWith("- "))
          .map((l) => l.slice(2).split("|").map((c) => c.trim()));
        return { kind: "stats", rows };
      }
      // "Callout: ## Heading" then the text on the next lines makes a shaded box.
      const co = /^Callout:\s*([\s\S]+)$/.exec(text.trim());
      if (co) return { kind: "callout", text: co[1] };
      const nm = NOTE.exec(text.trim());
      if (nm) {
        refs.fig[nm[1].replace(/\.[^.]+$/, "")] = f;
        return { kind: "note", file: nm[1], caption: nm[2] || "", text: nm[3], n: f++ };
      }
      const cm = COL.exec(text.trim());
      if (cm) {
        const files = cm[1].split(",").map((x) => x.trim()).filter(Boolean);
        files.forEach((fl) => (refs.fig[fl.replace(/\.[^.]+$/, "")] = f));
        return { kind: "col", files, caption: cm[2], small: !!cm[3], n: f++ };
      }
      const vm = VID.exec(text.trim());
      if (vm) {
        refs.vid[vm[1].split("/").pop().replace(/\.[^.]+$/, "")] = vn;
        return { kind: "vid", m: vm, n: vn++ };
      }
      const fm = FIG.exec(text.trim());
      if (fm) {
        refs.fig[fm[2].split("/").pop().replace(/\.[^.]+$/, "")] = f;
        return { kind: "fig", m: fm, n: f++ };
      }
      const tm = TAB.exec(text.trim());
      if (tm) {
        if (tm[1]) refs.tab[tm[1]] = t;
        return { kind: "tab", m: tm, n: t++ };
      }
      return { kind: "text", text };
    });
    const blocks = items.map((x) => {
      if (x.kind === "fig") {
        return el(
          "figure",
          { class: "inline-fig", id: `fig-${x.n}` },
          el("img", { src: x.m[2], alt: x.m[1], loading: "lazy" }),
          el("figcaption", null, el("strong", { text: x.m[3] ? `Figure ${x.n} \u2013 ` : `Figure ${x.n}` }), x.m[3] || "")
        );
      }
      if (x.kind === "stats") {
        return el(
          "div",
          { class: "stat-row" },
          x.rows.map((r) => el("div", { class: "stat" }, el("strong", { class: "stat-value", text: r[0] || "" }), el("span", { class: "stat-label", text: r[1] || "" })))
        );
      }
      if (x.kind === "callout") {
        let body = x.text;
        let heading = null;
        if (body.startsWith("## ")) {
          const nl = body.indexOf("\n");
          heading = nl < 0 ? body.slice(3) : body.slice(3, nl);
          body = nl < 0 ? "" : body.slice(nl + 1);
        }
        return el("div", { class: "callout" }, heading ? el("h4", { class: "callout-heading", text: heading }) : null, body ? el("p", null, inline(body, refs)) : null);
      }
      if (x.kind === "note") {
        return el(
          "div",
          { class: "note-with-fig" },
          // a first line "## Heading" becomes a heading inside the note
          (() => {
            let body = x.text;
            let heading = null;
            if (body.startsWith("## ")) {
              const nl = body.indexOf(String.fromCharCode(10));
              heading = nl < 0 ? body.slice(3) : body.slice(3, nl);
              body = nl < 0 ? "" : body.slice(nl + 1);
            }
            // blank lines split the note into paragraphs
            const paras = body ? body.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean) : [];
            return el("div", { class: "note-text" }, heading ? el("h4", { class: "note-heading", text: heading }) : null, ...paras.map((t) => el("p", null, inline(t, refs))));
          })(),
          el(
            "figure",
            { class: "inline-fig note-fig", id: `fig-${x.n}` },
            el("img", { src: `assets/library/${x.file}`, alt: x.caption, loading: "lazy" }),
            el("figcaption", null, el("strong", { text: "Figure " + x.n + " " + String.fromCharCode(8211) + " " }), x.caption)
          )
        );
      }
      if (x.kind === "col") {
        return el(
          "figure",
          { class: "inline-fig collage" + (x.small ? " collage-small" : ""), id: `fig-${x.n}` },
          // Photos keep their own shape (no cropping) and are dealt into columns; every other column starts lower, so the tiles are offset.
          el(
            "div",
            { class: "collage-grid" },
            (() => {
              const cols = x.files.length <= 3 ? x.files.length : x.files.length === 4 ? 2 : 3;
              const imgs = [];
              // The offset is only for photos of mixed shapes: when every photo has about the same aspect ratio, the tiles line up instead.
              const settle = () => {
                if (imgs.some((im) => !im.naturalWidth)) return;
                const r = imgs.map((im) => im.naturalWidth / im.naturalHeight);
                if (Math.max(...r) / Math.min(...r) < 1.15 && imgs[0].closest(".collage-grid")) imgs[0].closest(".collage-grid").classList.add("collage-even");
              };
              return Array.from({ length: cols }, (_, c) =>
                el(
                  "div",
                  { class: "collage-col" },
                  x.files.filter((_f, i) => i % cols === c).map((fl) => {
                    const im = el("img", { src: `assets/library/${fl}`, alt: "", loading: "lazy" });
                    imgs.push(im);
                    im.addEventListener("load", settle);
                    return im;
                  })
                )
              );
            })()
          ),
          el("figcaption", null, el("strong", { text: `Figure ${x.n} – ` }), x.caption)
        );
      }
      if (x.kind === "vid") {
        // Never autoplays and never blocks scrolling: the visitor presses play.
        // A button under the video switches between normal speed and 2x. It starts at normal speed.
        const video = el("video", { src: x.m[1], controls: true, preload: "metadata", playsinline: true, muted: true });
        const startFast = x.m[3] === "2x";
        if (startFast) {
          video.defaultPlaybackRate = 2;
          video.playbackRate = 2;
        }
        const speed = el("button", { type: "button", class: "speed-btn", "aria-pressed": String(startFast), text: startFast ? "Speed: 2×" : "Speed: 1×" });
        speed.addEventListener("click", () => {
          const fast = video.playbackRate !== 2;
          video.playbackRate = fast ? 2 : 1;
          speed.setAttribute("aria-pressed", String(fast));
          speed.textContent = fast ? "Speed: 2×" : "Speed: 1×";
        });
        return el(
          "figure",
          { class: "inline-fig inline-video", id: `vid-${x.n}` },
          video,
          speed,
          el("figcaption", null, el("strong", { text: `Video ${x.n} – ` }), x.m[2] || "")
        );
      }
      if (x.kind === "tab") return tableBlock(x.m, x.n);
      if (x.text.startsWith("## ")) return el("h3", { class: "sub-head", text: x.text.slice(3) });
      // Lines that all start with "- " make a bulleted list.
      const lines = x.text.split("\n").map((l) => l.trim());
      if (lines.length && lines.every((l) => l.startsWith("- "))) {
        return el("ul", { class: "overview-list" }, lines.map((l) => el("li", null, inline(l.slice(2), refs))));
      }
      return el("p", null, inline(x.text, refs));
    });
    // Videos that follow one another share a line, so they take little height.
    const out = [];
    blocks.forEach((e) => {
      if (e.classList && e.classList.contains("inline-video")) {
        const last = out[out.length - 1];
        if (last && last.classList && last.classList.contains("video-row")) last.append(e);
        else out.push(el("div", { class: "video-row" }, e));
      } else if (e.classList && e.classList.contains("callout")) {
        // callouts that follow one another sit in a compact grid
        const last = out[out.length - 1];
        if (last && last.classList && last.classList.contains("callout-grid")) last.append(e);
        else out.push(el("div", { class: "callout-grid" }, e));
      } else out.push(e);
    });
    return out;
  }

  function tableBlock(m, n) {
    const rows = m[3]
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.startsWith("|"))
      .map((r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
      .filter((r) => !r.every((c) => /^:?-+:?$/.test(c)));
    const [head, ...body] = rows;
    return el(
      "figure",
      { class: "inline-table", id: `tab-${n}` },
      el("figcaption", null, el("strong", { text: `Table ${n} \u2013 ` }), m[2]),
      el(
        "div",
        { class: "table-wrap" },
        el(
          "table",
          null,
          el("thead", null, el("tr", null, head.map((c) => el("th", { text: c })))),
          el("tbody", null, body.map((r) => el("tr", null, r.map((c) => el("td", { text: c })))))
        )
      )
    );
  }

  // Turns [link text](address) into a link. Only links to other pages of this site, to assets, or to http(s) addresses are allowed.
  function inline(text, refs) {
    // **bold** lead-ins make lists easy to scan
    if (text.includes("**")) {
      return text
        .split(/(\*\*[^*]+\*\*)/)
        .flatMap((part) => (/^\*\*[^*]+\*\*$/.test(part) ? el("strong", { text: part.slice(2, -2) }) : part ? inline(part, refs) : []));
    }
    if (refs) {
      const parts = text.split(/(\{(?:fig|tab|vid):[a-z0-9-]+\})/);
      if (parts.length > 1) {
        return parts.flatMap((part) => {
          const r = /^\{(fig|tab|vid):([a-z0-9-]+)\}$/.exec(part);
          if (!r) return inline(part);
          const n = refs[r[1]][r[2]];
          const word = { fig: "Figure", tab: "Table", vid: "Video" }[r[1]];
          return n ? el("a", { href: `#${r[1]}-${n}`, text: `${word} ${n}` }) : part;
        });
      }
    }
    const out = [];
    const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      const url = m[2];
      const ok = /^(project\.html\?p=[a-z0-9-]+|projects\.html(\?group=[a-z0-9-]+)?|assets\/\S+|https?:\/\/\S+)$/.test(url);
      if (!ok) continue;
      if (m.index > last) out.push(text.slice(last, m.index));
      const external = /^https?:/.test(url);
      out.push(el("a", { href: url, text: m[1], target: external ? "_blank" : null, rel: external ? "noopener noreferrer" : null }));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  function renderDetail() {
    const mount = $('[data-render="detail"]');
    const slug = new URLSearchParams(location.search).get("p");
    const index = PROJECTS.findIndex((p) => p.slug === slug);

    if (index < 0) {
      mount.replaceChildren(
        el("a", { class: "back-link", href: "projects.html", text: "← All projects" }),
        el("h1", { text: "Project not found" }),
        el("p", { text: "That project doesn’t exist. It may have been renamed or removed." })
      );
      document.title = `Project not found — ${SITE.name}`;
      return;
    }

    const p = PROJECTS[index];
    // Year, result, status, and a short role go in the title block as one line.
    let metaLine = "";

    const links = (p.links || []).map((l, i) =>
      el(
        "a",
        { class: `btn ${i === 0 ? "btn-primary" : "btn-ghost"}`, href: l.url, target: "_blank", rel: "noopener noreferrer" },
        l.label,
        icon("external")
      )
    );

    // The side panel is written once, on the project's main page, and every page of that project shows the same panel:
    // the pages in the project as links (the page you are on is marked), then a small, link-free note on what I did on each.
    const rootProject = PROJECTS.find((x) => x.slug === (p.parent || p.slug)) || p;
    const sectionAfter = (arr, heading) => {
      const i = arr.indexOf(heading);
      return i >= 0 ? arr[i + 1] || "" : "";
    };
    const roleText = sectionAfter(rootProject.overview || [], "## My role");
    const workedList = sectionAfter(rootProject.overview || [], "## What I worked on");
    const glanceList = p === rootProject ? sectionAfter(rootProject.overview || [], "## At a glance") : "";
    // On a project with linked pages these sections move to the side panel. On any other page they stay in the text.
    const hasPanel = /^- \[/.test(workedList);
    const overview = (p.overview || []).slice();
    // "Stats[top]:" puts a row of numbers right under the photo, above the overview text.
    const topIdx = overview.findIndex((b) => /^Stats\[top\]:/.test(b.trim()));
    const topStats = topIdx >= 0 ? overview.splice(topIdx, 1)[0].trim().replace(/^Stats\[top\]:/, "Stats:") : null;
    if (hasPanel) {
      ["## My role", "## What I worked on", "## At a glance"].forEach((h) => {
        const i = overview.indexOf(h);
        if (i >= 0) overview.splice(i, 2);
      });
    }
    const listLines = (text) =>
      text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("- "));
    const parseItem = (l) => {
      const t = /^- \[([^\]]+)\]\(([^)\s]+)\):\s*(.*)$/.exec(l);
      const ok = t && /^(project\.html\?p=[a-z0-9-]+|projects\.html(\?group=[a-z0-9-]+)?)$/.test(t[2]);
      return ok ? { title: t[1], href: t[2], text: t[3] } : { title: "", href: "", text: l.slice(2) };
    };
    const items = hasPanel ? listLines(workedList).map(parseItem) : [];
    // Panel: the overview link first, then "What I worked on:" and the other pages (links only, no extra text).
    const navItem = (it) => {
      const current = it.href === `project.html?p=${p.slug}`;
      return el("li", { class: current ? "is-current" : null }, el("a", { href: it.href, text: it.title, "aria-current": current ? "page" : null }));
    };
    const linked = items.filter((it) => it.href);
    const rootHref = `project.html?p=${rootProject.slug}`;
    const overviewItem = linked.find((it) => it.href === rootHref);
    const otherItems = linked.filter((it) => it !== overviewItem);
    const workedPanel = items.length
      ? el(
          "aside",
          { class: "worked-panel", "aria-label": "Pages in this project" },
          el("h2", { text: rootProject.navTitle || "Pages in this project" }),
          overviewItem ? el("ul", { class: "part-nav-list" }, navItem(overviewItem)) : null,
          otherItems.length ? el("p", { class: "worked-role-label", text: "Some of what I worked on:" }) : null,
          otherItems.length ? el("ul", { class: "part-nav-list" }, otherItems.map(navItem)) : null
        )
      : null;
    // a general line about my role, right above the overview (main page only)
    const glance =
      p === rootProject && roleText
        ? el("div", { class: "glance" }, el("h2", { text: "My role" }), el("p", { text: roleText }))
        : null;

    const body = el("div", { class: "detail-body" });
    if (topStats) {
      const statEls = renderOverview(p, [topStats]);
      statEls.forEach((e) => e.classList && e.classList.add("stat-lead"));
      body.append(...statEls);
    }
    if (glance) body.append(glance);
    if (overview.length) {
      body.append(
        el("h2", { text: "Overview" }),
        ...renderOverview(p, overview)
      );
    }
    if ((p.highlights || []).length) {
      body.append(el("h2", { text: "Highlights" }), el("ul", null, p.highlights.map((text) => el("li", null, inline(text)))));
    }

    metaLine = [p.year, p.result, p.status, !workedPanel && p.role && p.role.length <= 45 ? p.role : ""].filter(Boolean).join(" · ");
    const aside = links.length ? el("div", { class: "detail-side" }, el("div", { class: "detail-links" }, links)) : null;

    const siblings = PROJECTS.filter((x) => x.group === p.group);
    const pos = siblings.indexOf(p);
    const prev = siblings[pos - 1];
    const next = siblings[pos + 1];
    const grp = (window.PROJECT_GROUPS || []).find((g) => g.slug === p.group);
    const backLink = el("a", {
      class: "back-link",
      href: grp ? `projects.html?group=${encodeURIComponent(grp.slug)}` : "projects.html",
      text: grp ? `← ${grp.title}` : "← All projects",
    });
    const pagerLink = (project, cls, label) =>
      el(
        "a",
        { class: cls, href: `project.html?p=${encodeURIComponent(project.slug)}` },
        el("span", { class: "pager-label", text: label }),
        el("span", { class: "pager-title", text: project.title })
      );
    const pager =
      prev || next
        ? el(
            "nav",
            { class: "pager", "aria-label": "More projects" },
            prev ? pagerLink(prev, "prev", "← Previous") : null,
            next ? pagerLink(next, "next", "Next →") : null
          )
        : null;

    // "Related": the other sub-projects of the same class (Advanced or Micro), as small thumbnails.
    const relatedItems = p.group
      ? PROJECTS.filter((x) => x.group === p.group && x.parent && x.parent === (p.parent || p.slug) && x.slug !== p.slug && x.status !== "Coming soon")
          .slice()
          .sort((x, y) => Number(y.season || 0) - Number(x.season || 0))
      : [];
    // plus the overview page of the other class (Micro on Advanced pages, and the reverse)
    const otherOverviews = p.group
      ? PROJECTS.filter((x) => x.group === p.group && !x.parent && x.slug !== (p.parent || p.slug) && PROJECTS.some((c) => c.parent === x.slug))
      : [];
    otherOverviews.forEach((x) => relatedItems.push({ ...x, relatedTitle: `${(/(Micro|Advanced)/.exec(x.title) || ["", "Project"])[1]} Class overview` }));
    const related = relatedItems.length
      ? el(
          "section",
          { class: "related" },
          el("h2", { text: "Related projects" }),
          el(
            "div",
            { class: "mini-grid related-grid" },
            relatedItems.map((x) =>
              el(
                "a",
                { class: "mini-tile", href: `project.html?p=${encodeURIComponent(x.slug)}` },
                x.tileImage || x.image ? el("img", { class: "mini-img", src: x.tileImage || x.image, alt: "", loading: "lazy", width: 600, height: 375 }) : null,
                el("span", { class: "mini-title related-title", text: x.relatedTitle || x.title.replace(/^SAE Aero (Micro|Advanced)( Class)?: /, "") })
              )
            )
          )
        )
      : null;

    const hero = p.image
      ? el(
          "figure",
          { class: "detail-hero" },
          el("img", { src: p.image, alt: p.imageAlt || "", width: 1200, height: 750 }),
          p.imageCaption ? el("figcaption", null, el("strong", { text: "Figure 1 " + String.fromCharCode(8211) + " " }), p.imageCaption) : null
        )
      : null;
    // With a panel, the text sits in a wide column and the panel stays on screen beside it as you scroll.
    const layout = workedPanel
      ? el(
          "div",
          { class: "detail-layout" },
          el("div", { class: "detail-main" }, hero, el("div", { class: "detail-grid detail-grid-single" }, body)),
          el("div", { class: "detail-sticky" }, workedPanel, links.length ? el("div", { class: "detail-links" }, links) : null)
        )
      : el("div", { class: "detail-plain" }, hero, el("div", { class: aside ? "detail-grid" : "detail-grid detail-grid-single" }, body, aside));

    // replaceChildren turns a null into the text "null", so missing pieces are filtered out.
    mount.replaceChildren(...[
      backLink,
      el(
        "header",
        { class: "detail-header" },
        el("h1", { text: p.title }),
        el("p", { class: "lead", text: p.summary }),
        metaLine ? el("p", { class: "detail-meta-line", text: metaLine }) : null,
        tagList(p.tags)
      ),
      layout,
      (p.photos || []).length ? el("div", { class: "about-photos detail-photos" }, p.photos.map((ph) => aboutPhoto(ph))) : null,
      related,
      pager,
    ].filter(Boolean));

    // Moving between the pages of one project keeps the panel where it was on screen, so you do not lose your place.
    const sidePanel = $(".detail-sticky");
    if (sidePanel) {
      sidePanel.addEventListener("click", (e) => {
        const a = e.target.closest("a");
        if (a && (a.getAttribute("href") || "").startsWith("project.html")) {
          try {
            sessionStorage.setItem("panelTop", String(Math.round(sidePanel.getBoundingClientRect().top)));
          } catch (err) {
            /* the page just opens at the top */
          }
        }
      });
      let saved = null;
      try {
        saved = sessionStorage.getItem("panelTop");
        sessionStorage.removeItem("panelTop");
      } catch (err) {
        saved = null;
      }
      if (saved !== null) {
        if ("scrollRestoration" in history) history.scrollRestoration = "manual";
        const apply = () => window.scrollTo({ top: Math.max(0, sidePanel.getBoundingClientRect().top + window.scrollY - Number(saved)), behavior: "instant" });
        apply();
        window.addEventListener("load", apply, { once: true });
      }
    }

    document.title = `${p.title} — ${SITE.name}`;
    const desc = $('meta[name="description"]');
    if (desc) desc.setAttribute("content", p.summary);
  }

  /* ---------- Experience, Skills, About, Contact ---------- */

  const PAGES = window.PAGES || {};

  const pageHead = (title, lead) =>
    el("header", { class: "page-head" }, el("h1", { text: title }), lead ? el("p", { class: "lead", text: lead }) : null);

  const resumeButton = (primary) =>
    el(
      "a",
      { class: `btn ${primary ? "btn-primary" : "btn-ghost"}`, href: SITE.resume, download: true },
      icon("download"),
      "Download resume"
    );

  // Plain text link row under the intro: Resume, Email, then your social links.
  function renderQuickLinks() {
    const mount = $('[data-render="quick-links"]');
    if (!mount) return;
    const links = [];
    if (SITE.resume) links.push(el("a", { href: SITE.resume, download: true, text: "Resume" }));
    if (SITE.email) links.push(el("a", { href: mailto(), text: "Email" }));
    (SITE.socials || []).forEach((s) =>
      links.push(el("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", text: s.label }))
    );
    mount.replaceChildren(...links.map((a) => el("li", null, a)));
  }

  // One About photo. Once it loads we store its (slightly evened-out) shape in --ar, and the CSS
  // lines the photos up edge to edge in rows of equal height.
  function aboutPhoto(ph) {
    const img = el("img", { src: ph.src, alt: ph.alt || "" });
    const fig = el("figure", null, img, ph.caption ? el("figcaption", { text: ph.caption }) : null);
    const setRatio = () => {
      if (!img.naturalWidth) return;
      // Ease every photo's shape partway toward square (ratio^0.4). Tall and wide photos then
      // end up with similar areas, and each is only cropped a little. Use 1 for no cropping at
      // all, or 0 to make every photo the same shape.
      const EQUALIZE = 0.4;
      fig.style.setProperty("--ar", Math.pow(img.naturalWidth / img.naturalHeight, EQUALIZE).toFixed(4));
    };
    if (img.complete) setRatio();
    else img.addEventListener("load", setRatio);
    return fig;
  }

  function renderAbout() {
    const a = window.ABOUT || {};
    const mount = $('[data-render="page"]');
    const list = (items) => el("ul", { class: "plain-list" }, (items || []).map((text) => el("li", { text })));
    const intoSection =
      el(
        "section",
        { class: "about-into" },
        el("h2", { text: a.interestsTitle || "Interests" }),
        el(
          "ul",
          { class: "into-grid" },
          (a.interests || []).map((text, i) => el("li", { text }))
        )
      );
    mount.replaceChildren(
      pageHead("About", PAGES.about),
      el("div", { class: "about-body" }, (a.paragraphs || []).slice(0, 1).map((text) => el("p", { text }))),
      intoSection,
      el("div", { class: "about-body about-outside" }, (a.paragraphs || []).slice(1).map((text) => el("p", { text }))),
      // Photos keep their own shape (no cropping) and sit in offset columns, like the project collages.
      // Each column's width follows the square root of its photo's shape, so wide and tall photos end up with about the same area.
      (a.photos || []).length
        ? (() => {
            const cols = a.photos.length <= 4 ? a.photos.length : 3;
            const grid = el(
              "div",
              { class: "collage-grid about-collage" },
              Array.from({ length: cols }, (_, c) =>
                el(
                  "div",
                  { class: "collage-col" },
                  a.photos
                    .filter((_p, i) => i % cols === c)
                    .map((ph) =>
                      el("figure", { class: ph.caption ? "has-hover-caption" : null, tabindex: ph.caption ? "0" : null }, el("img", { src: ph.src, alt: ph.alt || "" }), ph.caption ? el("figcaption", { text: ph.caption }) : null)
                    )
                )
              )
            );
            grid.querySelectorAll(".collage-col").forEach((col, i) => (col.dataset.i = String(i)));
            // On a phone the photos sit in two staggered columns (1 and 3, then 2 and 4); on wider screens they run across.
            const phone = window.matchMedia("(max-width: 700px)");
            const arrange = () => {
              const cols = Array.from(grid.querySelectorAll(".collage-col")).sort((x, y) => Number(x.dataset.i) - Number(y.dataset.i));
              grid.querySelectorAll(".collage-half").forEach((h) => h.remove());
              if (phone.matches) {
                const left = el("div", { class: "collage-half" });
                const right = el("div", { class: "collage-half collage-half-offset" });
                cols.forEach((c, i) => (i % 2 === 0 ? left : right).append(c));
                grid.append(left, right);
              } else {
                cols.forEach((c) => grid.append(c));
              }
            };
            arrange();
            if (phone.addEventListener) phone.addEventListener("change", arrange);
            grid.querySelectorAll(".collage-col").forEach((col) => {
              const imgs = col.querySelectorAll("img");
              if (imgs.length !== 1) return;
              const img = imgs[0];
              const setWidth = () => {
                if (img.naturalWidth) col.style.flexGrow = String(Math.sqrt(img.naturalWidth / img.naturalHeight));
              };
              if (img.complete) setWidth();
              else img.addEventListener("load", setWidth);
            });
            return grid;
          })()
        : null
    );
    document.title = `About — ${SITE.name}`;
  }

  function renderContact() {
    const mount = $('[data-render="page"]');
    const link = (href, text, external) =>
      el("a", { href, text, target: external ? "_blank" : null, rel: external ? "noopener noreferrer" : null });
    const rows = [];
    if (SITE.email) rows.push(["Email", link(mailto(), SITE.email)]);
    (SITE.socials || []).forEach((s) =>
      rows.push([s.label, link(s.url, s.url.replace(/^https?:\/\/(www\.)?/, ""), true)])
    );
    if (SITE.location) rows.push(["Location", SITE.location]);
    if (SITE.resume) rows.push(["Resume", link(SITE.resume, "Download PDF", true)]);

    mount.replaceChildren(
      pageHead("Contact", PAGES.contact),
      el(
        "dl",
        { class: "contact-list" },
        rows.map(([k, v]) => el("div", null, el("dt", { text: k }), el("dd", null, v)))
      ),
      el(
        "div",
        { class: "hero-actions" },
        el("a", { class: "btn btn-primary", href: mailto() }, icon("mail"), "Email me"),
        SITE.resume ? resumeButton() : null
      )
    );
    document.title = `Contact — ${SITE.name}`;
  }

  /* ---------- init ---------- */

  renderHeader();
  renderFooter();
  const RENDERERS = {
    home: renderHome,
    projects: renderProjectsPage,
    project: renderDetail,
    about: renderAbout,
    contact: renderContact,
  };
  if (RENDERERS[page]) RENDERERS[page]();
})();

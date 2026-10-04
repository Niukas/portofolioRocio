(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const articles = [...document.querySelectorAll('.project')];
  const links = [...document.querySelectorAll('.side-nav a[data-id]')];

  /* ---------- Navegación lateral: obra activa ---------- */
  const navMap = Object.fromEntries(links.map(a => [a.dataset.id, a]));
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('is-active'));
      const a = navMap[e.target.dataset.id];
      if (a) a.classList.add('is-active');
    });
  }, { rootMargin: '-35% 0px -50% 0px', threshold: 0 });
  articles.forEach(el => navIO.observe(el));

  /* ---------- Barra de progreso de lectura ---------- */
  const bar = document.createElement('div');
  bar.className = 'progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  let ticking = false;
  const updateBar = () => {
    const max = root.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateBar); }
  }, { passive: true });
  updateBar();

  /* ---------- Aparición suave al hacer scroll ---------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealIO = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    document.querySelectorAll('.p-intro, .plate, .perfil, .idx-row, .p-next')
      .forEach(el => { el.classList.add('reveal'); revealIO.observe(el); });
  }

  /* ---------- Memoria plegable ---------- */
  const CLAMP_PX = 230;
  const memos = [...document.querySelectorAll('.p-text')].map((box, i) => {
    const paras = [...box.querySelectorAll(':scope > p:not(.lead)')];
    if (!paras.length) return null;
    const body = document.createElement('div');
    body.className = 'p-body';
    body.id = `memoria-${i}`;
    paras[0].before(body);
    paras.forEach(p => body.appendChild(p));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'p-toggle';
    btn.setAttribute('aria-controls', body.id);
    btn.hidden = true;
    body.after(btn);
    btn.addEventListener('click', () => {
      const open = body.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
      btn.textContent = open ? 'Ver menos' : 'Leer memoria completa';
    });
    return { body, btn };
  }).filter(Boolean);

  function measureMemos() {
    memos.forEach(({ body, btn }) => {
      if (body.classList.contains('is-open')) return;
      body.classList.remove('is-clamped');
      const long = body.scrollHeight > CLAMP_PX + 60;
      body.classList.toggle('is-clamped', long);
      btn.hidden = !long;
      if (long) { btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Leer memoria completa'; }
    });
  }
  measureMemos();
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(measureMemos);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(measureMemos, 150); });

  /* ---------- Anterior / siguiente obra ---------- */
  const info = articles.map(a => ({
    id: a.id,
    num: a.querySelector('.p-num')?.textContent.trim() || '',
    title: a.querySelector('h2')?.textContent.trim() || ''
  }));
  articles.forEach((a, i) => {
    const prev = info[i - 1], next = info[i + 1];
    const nav = document.createElement('nav');
    nav.className = 'p-next';
    nav.setAttribute('aria-label', 'Navegación entre obras');
    nav.innerHTML =
      (prev ? `<a class="prev" href="#${prev.id}"><small>‹ Anterior</small><span>${prev.num} — ${prev.title}</span></a>`
            : `<a class="prev" href="#indice"><small>‹ Volver</small><span>Índice</span></a>`) +
      (next ? `<a class="next" href="#${next.id}"><small>Siguiente ›</small><span>${next.num} — ${next.title}</span></a>`
            : `<a class="next" href="#perfil"><small>Fin ›</small><span>Perfil</span></a>`);
    a.appendChild(nav);
  });

  /* ---------- Índice: vista previa al pasar el mouse ---------- */
  if (canHover) {
    const pv = document.createElement('div');
    pv.className = 'idx-preview';
    pv.setAttribute('aria-hidden', 'true');
    const pvImg = document.createElement('img');
    pvImg.alt = '';
    pv.appendChild(pvImg);
    document.body.appendChild(pv);
    let px = 0, py = 0, raf = 0;
    const place = () => {
      const w = pv.offsetWidth, h = pv.offsetHeight;
      const x = Math.min(px + 28, innerWidth - w - 16);
      const y = Math.max(16, Math.min(py - h / 2, innerHeight - h - 16));
      pv.style.transform = `translate(${x}px, ${y}px)`;
      raf = 0;
    };
    document.querySelectorAll('.idx-row').forEach(row => {
      const target = document.getElementById(row.getAttribute('href').slice(1));
      const first = target?.querySelector('.plate img');
      if (!first) return;
      row.addEventListener('mouseenter', e => {
        pvImg.src = first.currentSrc || first.src;
        px = e.clientX; py = e.clientY; place();
        pv.classList.add('is-on');
      });
      row.addEventListener('mousemove', e => {
        px = e.clientX; py = e.clientY;
        if (!raf) raf = requestAnimationFrame(place);
      });
      row.addEventListener('mouseleave', () => pv.classList.remove('is-on'));
    });
  }

  /* ---------- Lightbox con zoom ---------- */
  const plates = [...document.querySelectorAll('.plate-frame')];
  const lb = document.getElementById('lb');
  const lbImg = document.getElementById('lbImg');
  const lbCap = document.getElementById('lbCap');
  const lbClose = document.getElementById('lbClose');
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Visor de imágenes');

  const MAX_SCALE = 5;
  let lbI = 0, scale = 1, tx = 0, ty = 0, lastFocus = null;

  const isOpen = () => lb.classList.contains('is-open');
  function apply(anim) {
    lbImg.classList.toggle('anim', !!anim && !reduceMotion);
    lbImg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    lb.classList.toggle('is-zoomed', scale > 1.001);
  }
  function clampPan() {
    const mx = Math.max(0, lbImg.offsetWidth * (scale - 1) / 2);
    const my = Math.max(0, lbImg.offsetHeight * (scale - 1) / 2);
    tx = Math.max(-mx, Math.min(mx, tx));
    ty = Math.max(-my, Math.min(my, ty));
  }
  function resetZoom(anim) { scale = 1; tx = ty = 0; apply(anim); }
  // Zoom manteniendo fijo el punto (cx, cy) de la pantalla
  function zoomAt(newScale, cx, cy, anim) {
    newScale = Math.max(1, Math.min(MAX_SCALE, newScale));
    const r = lbImg.getBoundingClientRect();
    const baseX = r.left + r.width / 2 - tx;
    const baseY = r.top + r.height / 2 - ty;
    const k = newScale / scale;
    tx = (cx - baseX) - ((cx - baseX) - tx) * k;
    ty = (cy - baseY) - ((cy - baseY) - ty) * k;
    scale = newScale;
    if (scale === 1) { tx = ty = 0; } else { clampPan(); }
    apply(anim);
  }
  const zoomCenter = f => zoomAt(scale * f, innerWidth / 2, innerHeight / 2, true);

  function openLb(i) {
    if (!isOpen()) lastFocus = document.activeElement;
    lbI = i;
    const el = plates[lbI];
    lbImg.src = el.querySelector('img').src;
    lbImg.alt = el.dataset.label;
    lbCap.textContent = el.dataset.label;
    resetZoom(false);
    lb.hidden = false;
    lb.classList.add('is-open');
    document.body.classList.add('lb-on');
    lbClose.focus({ preventScroll: true });
  }
  function closeLb() {
    lb.classList.remove('is-open');
    lb.hidden = true;
    document.body.classList.remove('lb-on');
    resetZoom(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  const prevLb = () => openLb((lbI - 1 + plates.length) % plates.length);
  const nextLb = () => openLb((lbI + 1) % plates.length);

  plates.forEach((el, i) => el.addEventListener('click', () => openLb(i)));
  lbClose.onclick = closeLb;
  document.getElementById('lbPrev').onclick = prevLb;
  document.getElementById('lbNext').onclick = nextLb;
  document.getElementById('lbZoomIn').onclick = () => zoomCenter(1.6);
  document.getElementById('lbZoomOut').onclick = () => zoomCenter(1 / 1.6);
  document.getElementById('lbZoomReset').onclick = () => resetZoom(true);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });

  document.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') prevLb();
    else if (e.key === 'ArrowRight') nextLb();
    else if (e.key === '+' || e.key === '=') zoomCenter(1.6);
    else if (e.key === '-') zoomCenter(1 / 1.6);
    else if (e.key === '0') resetZoom(true);
  });

  // Rueda / trackpad
  lb.addEventListener('wheel', e => {
    e.preventDefault();
    zoomAt(scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX, e.clientY, false);
  }, { passive: false });

  // Arrastrar, pellizcar, doble toque y deslizar
  const ptrs = new Map();
  let pinchD = 0, start = null, lastTap = { t: 0, x: 0, y: 0 };
  const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  const mid = () => { const [a, b] = [...ptrs.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };

  lbImg.addEventListener('pointerdown', e => {
    lbImg.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) pinchD = dist();
    start = { x: e.clientX, y: e.clientY, t: performance.now(), tx, ty, moved: false, type: e.pointerType };
    lbImg.classList.remove('anim');
    lb.classList.add('is-dragging');
  });
  lbImg.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const d = dist(), m = mid();
      if (pinchD) zoomAt(scale * d / pinchD, m.x, m.y, false);
      pinchD = d;
      if (start) start.moved = true;
      return;
    }
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) start.moved = true;
    if (scale > 1) {
      tx += e.clientX - prev.x;
      ty += e.clientY - prev.y;
      clampPan();
      apply(false);
    }
  });
  const endPtr = e => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinchD = 0;
    if (ptrs.size === 0) {
      lb.classList.remove('is-dragging');
      if (start && e.type === 'pointerup') {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        const now = performance.now();
        if (!start.moved) {
          // doble toque / doble clic: alterna zoom
          if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
            if (scale > 1.05) resetZoom(true); else zoomAt(2.6, e.clientX, e.clientY, true);
            lastTap.t = 0;
          } else {
            lastTap = { t: now, x: e.clientX, y: e.clientY };
          }
        } else if (scale === 1 && start.type !== 'mouse' && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          dx > 0 ? prevLb() : nextLb();
        }
      }
      start = null;
    }
  };
  lbImg.addEventListener('pointerup', endPtr);
  lbImg.addEventListener('pointercancel', endPtr);
})();

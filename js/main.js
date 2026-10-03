const links = [...document.querySelectorAll('.side-nav a[data-id]')];
const articles = [...document.querySelectorAll('.project')];
const map = Object.fromEntries(links.map(a => [a.dataset.id, a]));
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.remove('is-active'));
    const a = map[e.target.dataset.id];
    if (a) a.classList.add('is-active');
  });
}, { rootMargin: '-35% 0px -50% 0px', threshold: 0 });
articles.forEach(el => io.observe(el));

const plates = [...document.querySelectorAll('.plate-frame')];
const lb = document.getElementById('lb');
const lbImg = document.getElementById('lbImg');
const lbCap = document.getElementById('lbCap');
let lbI = 0;
function openLb(i) {
  lbI = i;
  const el = plates[lbI];
  const src = el.querySelector('img').src;
  lbImg.src = src;
  lbImg.alt = el.dataset.label;
  lbCap.textContent = el.dataset.label;
  lb.hidden = false;
  lb.classList.add('is-open');
  document.body.classList.add('lb-on');
}
function closeLb() {
  lb.classList.remove('is-open');
  lb.hidden = true;
  document.body.classList.remove('lb-on');
}
function prevLb() { openLb((lbI - 1 + plates.length) % plates.length); }
function nextLb() { openLb((lbI + 1) % plates.length); }
plates.forEach((el, i) => el.addEventListener('click', () => openLb(i)));
document.getElementById('lbClose').onclick = closeLb;
document.getElementById('lbPrev').onclick = prevLb;
document.getElementById('lbNext').onclick = nextLb;
lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', e => {
  if (!lb.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') prevLb();
  if (e.key === 'ArrowRight') nextLb();
});
let tx = 0;
lb.addEventListener('touchstart', e => { tx = e.changedTouches[0].clientX; }, {passive:true});
lb.addEventListener('touchend', e => {
  if (!lb.classList.contains('is-open')) return;
  const dx = e.changedTouches[0].clientX - tx;
  if (dx > 50) prevLb();
  if (dx < -50) nextLb();
}, {passive:true});

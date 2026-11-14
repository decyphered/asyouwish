// Paste your Formspree form ID here (the part after https://formspree.io/f/)
const FORMSPREE_ID = 'moeeaoyb';

const ENDPOINT = `https://formspree.io/f/${FORMSPREE_ID}`;
const STORAGE_KEY = 'dinner-2026-11-07';
const NAMES = {"scallion-oil-noodles":"Scallion Oil Noodles","thai-crispy-chicken":"Thai Crispy Chicken","spicy-creamy-udon":"Spicy Creamy Udon","breakfast":"Breakfast for dinner","takeout":"Takeout","chefs-choice":"Chef's pick for dinner"};
const DESSERTS = {"brownies":"Brownies + Ice Cream","cookie-sandwich":"Cookie Ice Cream Sandwich","surprise":"a surprise dessert"};
const KNOWN_SPOTS =['Yak and Yeti', "Jeepney's", 'Beartooth', 'El Jefe', 'Spenard Roadhouse', 'So Thai', 'Bombay', 'My Shawarma', 'Queen of Sheba', 'Meraki Grill', 'Crimson'];
const KNOWN_PROTEINS = ['Bacon', 'Sausage', 'Ham', 'Spam', 'You pick'];

const form = document.getElementById('pickForm');
const spotBox = document.getElementById('spotBox');
const proteinBox = document.getElementById('proteinBox');
const otherProteinEl = document.getElementById('otherProtein');
const otherProteinWrap = document.getElementById('otherProteinWrap');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const noteEl = document.getElementById('note');
const otherEl = document.getElementById('otherSpot');
const otherWrap = document.getElementById('otherWrap');
const wheel = document.getElementById('wheel');
const wheelWrap = document.getElementById('wheelWrap');
const wheelHint = document.getElementById('wheelHint');
let saved = null, dirty = false, saving = false, wheelTime = null;

const val = n => (form.querySelector(`input[name="${n}"]:checked`) || {}).value || null;
function spotVal(){ const s = val('spot'); return s === 'other' ? (otherEl.value.trim() || null) : s; }
const fmt = mins => { const h = Math.floor(mins / 60) % 24, m = mins % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
function timeVal(){ return wheelTime; }
function proteinVal(){ const s = val('protein'); return s === 'other' ? (otherProteinEl.value.trim() || null) : s; }
function label(p){
  if (p.dinner === 'takeout') return `Takeout from ${p.spot}`;
  if (p.dinner === 'breakfast') return p.protein === 'You pick' ? 'Breakfast for dinner (your pick of protein)' : `Breakfast for dinner with ${p.protein}`;
  return NAMES[p.dinner] || p.dinner;
}
function summary(p){ return label(p) + (p.time ? ` at ${p.time}` : '') +(p.dessert ? `, then ${DESSERTS[p.dessert]}` : ''); }

// Time wheel: every half hour of the day in a snap-scrolling column. It opens resting on 4:00 PM,
// but that only counts as a pick once she spins or taps it.
const ROW = 44, START = 960;
const SLOTS = Array.from({length: 48}, (_, i) => i * 30);
// Sunrise 8:44 AM, sunset 4:41 PM: marked on the first slot after each.
const SUN = {540: '🌄', 1020: '🌅'};
const pod = m => m < 360 ? 'late night' : m < 720 ? 'morning' : m < 1020 ? 'afternoon' : m < 1260 ? 'evening' : 'night';
wheel.innerHTML = '<div class="pad"></div>' + SLOTS.map((m, i) => {
  const [hm, ap] = fmt(m).split(' ');
  return `<div class="opt" role="option" id="w-${i}" data-i="${i}" aria-selected="false"><span>${hm}</span><span class="ampm">${ap}</span>` +
    `${SUN[m] ? `<span aria-hidden="true">${SUN[m]}</span>` : ''}<span class="pod" aria-hidden="true">${pod(m)}</span></div>`;
}).join('') + '<div class="pad"></div>';
const opts = [...wheel.querySelectorAll('.opt')];
let centre = -1, touched = false, settleTimer = 0, painting = false, keyTarget = null;

// Tilt and fade rows by their distance from the centre, like the iOS picker.
function paint(){
  painting = false;
  const pos = wheel.scrollTop / ROW;
  for (let i = Math.max(0, Math.floor(pos) - 4); i <= Math.min(opts.length - 1, Math.ceil(pos) + 4); i++) {
    const d = i - pos;
    opts[i].style.opacity = Math.max(.15, 1 - Math.abs(d) * .3);
    opts[i].style.transform = `perspective(500px) rotateX(${d * -18}deg)`;
  }
  const i = Math.min(opts.length - 1, Math.max(0, Math.round(pos)));
  if (i === centre) return;
  if (centre >= 0) { opts[centre].classList.remove('on'); opts[centre].setAttribute('aria-selected', 'false'); }
  opts[i].classList.add('on'); opts[i].setAttribute('aria-selected', 'true');
  wheel.setAttribute('aria-activedescendant', opts[i].id);
  centre = i;
}
function goTo(i, smooth){ wheel.scrollTo({top: i * ROW, behavior: smooth ? 'smooth' : 'auto'}); paint(); }
function pickWheel(i){
  const t = fmt(SLOTS[i]);
  if (t === wheelTime) return;
  wheelTime = t;
  dirty = true; statusEl.classList.remove('err', 'ok'); refresh();
}
wheel.addEventListener('scroll', () => {
  if (!painting) { painting = true; requestAnimationFrame(paint); }
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { paint(); keyTarget = null; if (touched) pickWheel(centre); }, 140);
}, {passive: true});
['pointerdown', 'touchstart', 'wheel'].forEach(e => wheel.addEventListener(e, () => touched = true, {passive: true}));
wheel.addEventListener('click', e => {
  const o = e.target.closest('.opt'); if (!o) return;
  touched = true;
  pickWheel(+o.dataset.i); goTo(+o.dataset.i, true);
});
wheel.addEventListener('keydown', e => {
  const step = {ArrowDown: 1, ArrowUp: -1, PageDown: 4, PageUp: -4}[e.key];
  if (step) {
    e.preventDefault(); touched = true;
    // Count from where the last press is heading, so quick presses add up mid-slide.
    const i = keyTarget = Math.min(opts.length - 1, Math.max(0, (keyTarget ?? centre) + step));
    pickWheel(i); goTo(i, true);
  }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickWheel(centre); }
});
goTo(SLOTS.indexOf(START));

function setStatus(t, kind){ statusEl.textContent = t; statusEl.classList.toggle('err', kind === true || kind === 'err'); statusEl.classList.toggle('ok', kind === 'ok'); }

function refresh(){
  const d = val('dinner');
  spotBox.hidden = d !== 'takeout';
  otherWrap.hidden = val('spot') !== 'other';
  proteinBox.hidden = d !== 'breakfast';
  otherProteinWrap.hidden = val('protein') !== 'other';
  wheelWrap.classList.toggle('picked', !!wheelTime);
  wheelHint.innerHTML = wheelTime ? `Starting at <b>${wheelTime}</b>.` : 'Spin to a time, or tap one.';
  const t = timeVal(), ds = val('dessert');
  const ready = d && t && ds && (d !== 'takeout' || spotVal()) && (d !== 'breakfast' || proteinVal());
  saveBtn.disabled = !ready || saving || (saved && !dirty);
  saveBtn.classList.toggle('is-saved', !!saved && !dirty && !saving);
  // Until all three steps are done, the button counts them so it never just looks dead.
  const steps = [t, d && (d !== 'takeout' || spotVal()) && (d !== 'breakfast' || proteinVal()), ds].filter(Boolean).length;
  saveBtn.textContent = saved && !dirty ? '✓ Saved' : !ready && steps ? `${steps} of 3 picked` : saved ? 'Update my pick' : 'Save my pick';
  if (saving || statusEl.classList.contains('err') || statusEl.classList.contains('ok')) return;
  if (!ready && d === 'takeout' && !spotVal()) setStatus(val('spot') === 'other' ? 'Type where you want takeout from.' : 'Pick a takeout spot.');
  else if (!ready && d === 'breakfast' && !proteinVal()) setStatus(val('protein') === 'other' ? 'Type the protein you want.' : 'Pick a protein.');
  else if (!ready && d && !t) setStatus('Pick a start time.');
  else if (!ready && (t || ds) && !d) setStatus('Pick a dinner.');
  else if (!ready && d && !ds) setStatus('Pick a dessert.');
  else if (!ready && ds && !t) setStatus('Pick a start time.');
  else if (!ready) setStatus('');
  else if (dirty) setStatus('Not saved yet.');
}

// "Add to my calendar": links to the hosted .ics for her start time (made by calendar.ps1). iOS Safari only
// offers "Add to Calendar" for a real .ics file, not one built in the page. Change the date every night.
const EVENT_DATE = '2026-11-07';
const CAL_KEY = STORAGE_KEY + '-calendar';
const calBtn = document.getElementById('calBtn'), calHint = document.getElementById('calHint');
function showCalendar(p){
  const t = /^(\d+):(\d+) (AM|PM)$/.exec(p.time || '');
  calBtn.hidden = !t;
  if (!t) return;
  const hh = String(t[1] % 12 + (t[3] === 'PM' ? 12 : 0)).padStart(2, '0');
  calBtn.href = `/calendar/${EVENT_DATE}/${hh}${t[2]}.ics`;
  let added = null; try { added = localStorage.getItem(CAL_KEY); } catch (e) {}
  const stale = !!added && added !== p.savedAt;
  calBtn.textContent = stale ? '📅 Add the updated event' : '📅 Add to my calendar';
  calHint.hidden = !stale;
}
calBtn.addEventListener('click', () => {
  try { if (saved) localStorage.setItem(CAL_KEY, saved.savedAt); } catch (e) {}
  setTimeout(() => { calBtn.textContent = '📅 Add to my calendar'; calHint.hidden = true; }, 0);
});

function showSaved(p){
  const box = document.getElementById('savedBox');
  if (!p || !p.dinner) { box.hidden = true; return; }
  box.hidden = false;
  const dessert = p.dessert === 'surprise' ? 'a surprise' : DESSERTS[p.dessert];
  document.getElementById('savedText').textContent =
    `Locked in: We start at ${p.time}, we'll decide dinner timing together, and dessert is ${dessert}! Excited to see the tiny spice!`;
  let when = '';
  try { when = 'Saved ' + new Date(p.savedAt).toLocaleString([], {weekday:'short', hour:'numeric', minute:'2-digit'}) + '.'; } catch (e) {}
  document.getElementById('savedWhen').textContent = when + (p.note ? ` Note: "${p.note}"` : '');
  showCalendar(p);
}

function applyToForm(p){
  const d = form.querySelector(`input[name="dinner"][value="${p.dinner}"]`); if (d) d.checked = true;
  const ds = form.querySelector(`input[name="dessert"][value="${p.dessert}"]`); if (ds) ds.checked = true;
  const ti = SLOTS.findIndex(m => fmt(m) === p.time);
  if (ti >= 0) { wheelTime = p.time; goTo(ti); }
  if (p.spot) {
    const known = KNOWN_SPOTS.includes(p.spot);
    form.querySelectorAll('input[name="spot"]').forEach(i => i.checked = known ? i.value === p.spot : i.value === 'other');
    otherEl.value = known ? '' : p.spot;
  }
  if (p.protein) {
    const known = KNOWN_PROTEINS.includes(p.protein);
    form.querySelectorAll('input[name="protein"]').forEach(i => i.checked = known ? i.value === p.protein : i.value === 'other');
    otherProteinEl.value = known ? '' : p.protein;
  }
  noteEl.value = p.note || '';
}

form.addEventListener('change', () => { dirty = true; statusEl.classList.remove('err', 'ok'); refresh(); });
noteEl.addEventListener('input', () => { dirty = true; statusEl.classList.remove('ok'); refresh(); });
otherEl.addEventListener('input', () => { dirty = true; statusEl.classList.remove('ok'); refresh(); });
document.getElementById('s-other').addEventListener('change', () => setTimeout(() => otherEl.focus(), 0));
otherProteinEl.addEventListener('input', () => { dirty = true; statusEl.classList.remove('ok'); refresh(); });
document.getElementById('p-other').addEventListener('change', () => setTimeout(() => otherProteinEl.focus(), 0));

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (saveBtn.disabled) return;
  const d = val('dinner');
  const pick = {
    dinner: d,
    time: timeVal(),
    spot: d === 'takeout' ? spotVal().slice(0, 60) : null,
    protein: d === 'breakfast' ? proteinVal().slice(0, 60) : null,
    dessert: val('dessert'),
    note: noteEl.value.trim().slice(0, 300),
    savedAt: new Date().toISOString()
  };
  saving = true; setStatus('Saving...'); refresh();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `Cat picked: ${summary(pick)}`,
        pick: summary(pick),
        start_time: pick.time,
        dinner: NAMES[pick.dinner],
        takeout_spot: pick.spot || '',
        protein: pick.protein || '',
        dessert: DESSERTS[pick.dessert],
        note: pick.note || '',
        saved_at: pick.savedAt
      })
    });
    if (!res.ok) throw new Error('bad status');
    saved = pick; dirty = false; showSaved(pick);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pick)); } catch (e) {}
    saving = false;
    setStatus('Noted, chef! 🍂', 'ok');
    // The calendar button sits in the saved box at the top; bring it into view.
    document.getElementById('savedBox').scrollIntoView({behavior: 'smooth', block: 'start'});
  } catch (err) {
    saving = false;
    setStatus("Couldn't save your pick. Check your connection and try again, or just text me.", true);
  }
  refresh();
});

// Remember her pick on this phone so the page shows it when she comes back.
try {
  const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (p && p.dinner) { saved = p; applyToForm(p); showSaved(p); }
} catch (e) {}
refresh();

// ---- Archive mode (appended by archive.ps1) ----
// This night is over, so the page is a read-only keepsake: nothing can be changed or sent.
(() => {
  const ARCHIVE = {"date":"2026-11-07","pick":{"dinner":"spicy-creamy-udon","time":"5:00 PM","spot":null,"protein":null,"dessert":"surprise","note":"Reduced spicy level please 🥰","savedAt":"2026-11-03T07:46:06.887Z"},"note":"The surprise dessert: Dutch apple pie, strawberry rhubarb pie, and ice cream."};
  const form = document.getElementById('pickForm');
  if (form) {
    form.addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);
    if (ARCHIVE.pick) { try { applyToForm(ARCHIVE.pick); refresh(); showSaved(ARCHIVE.pick); } catch (e) {} }
    form.inert = true;
  }
  document.querySelectorAll('.bar, .cal-btn, .cal-hint').forEach(b => b.style.display = 'none');
  const savedText = document.getElementById('savedText');
  if (savedText) savedText.textContent = savedText.textContent.replace(/^Locked in:/, 'She picked:');

  const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const when = new Date(ARCHIVE.date + 'T12:00:00').toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
  const style = document.createElement('style');
  style.textContent = `.archive-note{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:14px;
    background:var(--surface);border:1.5px dashed var(--accent)}
  .archive-note .k{font-size:.75rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
  .archive-note strong{font-family:var(--display);font-size:1.1rem}
  .archive-note p{margin:0;color:var(--muted)}
  .archive-note a{margin-top:4px;color:var(--accent);font-weight:600;text-decoration:none}`;
  document.head.appendChild(style);
  const note = document.createElement('aside');
  note.className = 'archive-note';
  note.innerHTML = `<span class="k">From the archive</span><strong>${when}</strong>` +
    (ARCHIVE.note ? `<p>${esc(ARCHIVE.note)}</p>` : '') + '<a href="../">All our dinner nights &rarr;</a>';
  const header = document.querySelector('.wrap header');
  header ? header.after(note) : document.body.prepend(note);
})();

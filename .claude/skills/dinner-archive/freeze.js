
// ---- Archive mode (appended by archive.ps1) ----
// This night is over, so the page is a read-only keepsake: nothing can be changed or sent.
(() => {
  const ARCHIVE = {{CONFIG}};
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

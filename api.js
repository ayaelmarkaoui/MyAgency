/* ============================================================
   api.js — Aurelia Voyage · Connecteur Frontend ↔ Backend
   Placez ce fichier dans le même dossier que votre index.html
   ============================================================ */

const API_BASE = 'http://localhost:3001/api'; // ← changer en prod

/* ── Utilitaires UI ─────────────────────────────────────────── */

function showToast(message, type = 'success') {
  const existing = document.getElementById('av-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'av-toast';
  toast.setAttribute('role', 'alert');
  toast.style.cssText = `
    position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(20px);
    background: ${type === 'success'
      ? 'linear-gradient(135deg,#0D1E42,#132552)'
      : 'linear-gradient(135deg,#2A0606,#420D0D)'};
    border: 1px solid ${type === 'success' ? 'rgba(212,175,85,.45)' : 'rgba(220,80,80,.45)'};
    color: ${type === 'success' ? '#E8CC7A' : '#F08080'};
    padding: 14px 28px; border-radius: 8px;
    font-family: 'Jost', sans-serif; font-size: .88rem; font-weight: 500;
    letter-spacing: .04em; text-align: center;
    box-shadow: 0 8px 32px rgba(0,0,0,.45);
    z-index: 9999; max-width: 90vw;
    opacity: 0; transition: opacity .3s ease, transform .3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 320);
  }, 4500);
}

function setLoading(btn, isLoading) {
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Envoi en cours…';
    btn.disabled = true;
    btn.style.opacity = '.65';
    btn.style.cursor = 'not-allowed';
  } else {
    btn.textContent = btn.dataset.originalText || 'Envoyer';
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.cursor = '';
  }
}

function showFieldError(input, message) {
  clearFieldError(input);
  input.style.borderColor = 'rgba(220,80,80,.7)';
  const err = document.createElement('small');
  err.className = 'av-field-error';
  err.style.cssText = 'color:#F08080;font-size:.74rem;margin-top:5px;display:block;';
  err.textContent = message;
  input.parentNode.insertBefore(err, input.nextSibling);
}

function clearFieldError(input) {
  input.style.borderColor = '';
  const prev = input.nextSibling;
  if (prev && prev.classList && prev.classList.contains('av-field-error')) prev.remove();
}

async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

/* ── Formulaire CONTACT / DEVIS ─────────────────────────────── */

function initContactForm() {
  // Le formulaire contact est dans #contact
  const section = document.getElementById('contact');
  if (!section) return;
  const form = section.querySelector('form.form-card');
  if (!form) return;

  const [inputNom, inputTel, selectService, inputMessage] = form.querySelectorAll('input, select');
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validation basique
    let valid = true;
    if (!inputNom.value.trim()) { showFieldError(inputNom, 'Votre nom est requis.'); valid = false; }
    else clearFieldError(inputNom);
    if (!inputTel.value.trim()) { showFieldError(inputTel, 'Votre téléphone est requis.'); valid = false; }
    else clearFieldError(inputTel);
    if (!selectService.value) { showFieldError(selectService, 'Choisissez un service.'); valid = false; }
    else clearFieldError(selectService);
    if (!valid) return;

    setLoading(btn, true);
    try {
      const data = await apiPost('/contact', {
        nom:      inputNom.value.trim(),
        telephone: inputTel.value.trim(),
        service:  selectService.value,
        message:  inputMessage ? inputMessage.value.trim() : '',
      });
      showToast(data.message || '✓ Demande envoyée ! Nous vous contactons sous 24h.', 'success');
      form.reset();
    } catch (err) {
      const msg = err?.errors?.[0]?.msg || err?.error || 'Une erreur est survenue. Réessayez.';
      showToast('⚠ ' + msg, 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

/* ── Formulaire VISA ─────────────────────────────────────────── */

function initVisaForm() {
  const section = document.getElementById('visa');
  if (!section) return;
  const form = section.querySelector('form.form-card');
  if (!form) return;

  const inputs  = form.querySelectorAll('input, select');
  // Ordre dans votre HTML : destination, type_visa, email, nationalite
  const inputDest  = inputs[0];
  const selectType = inputs[1];
  const inputNat   = inputs[3];
  const inputEmail = inputs[2];
  const btn        = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let valid = true;
    if (!inputDest?.value.trim())  { showFieldError(inputDest,  'Destination requise.');  valid = false; } else clearFieldError(inputDest);
    if (!selectType?.value)        { showFieldError(selectType, 'Type de visa requis.');  valid = false; } else clearFieldError(selectType);
    if (!inputNat?.value.trim())   { showFieldError(inputNat,   'Nationalité requise.');
    if (!inputEmail?.value.trim()) { showFieldError(inputEmail, 'Email requis.');          valid = false; } else clearFieldError(inputEmail);

        valid = false; } else clearFieldError(inputNat);
    if (!valid) return;

    setLoading(btn, true);
    try {
      const data = await apiPost('/visa', {
        destination: inputDest.value.trim(),
        type_visa:   selectType.value,
        nationalite: inputNat.value.trim(),
        email:       inputEmail.value.trim(),

      });
      showToast(data.message || '✓ Demande visa reçue ! Liste des documents sous 24h.', 'success');
      form.reset();
    } catch (err) {
      const msg = err?.errors?.[0]?.msg || err?.error || 'Une erreur est survenue.';
      showToast('⚠ ' + msg, 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

/* ── Formulaire OMRA (boutons Réserver / Demander un prix) ───── */

function initOmraButtons() {
  const section = document.getElementById('omra');
  if (!section) return;

  // On intercepte les clics sur les boutons Omra et on ouvre une modale légère
  section.querySelectorAll('.omra-card .btn').forEach(btn => {
    const card  = btn.closest('.omra-card');
    const badge = card?.querySelector('.omra-badge');
    const title = card?.querySelector('h3');
    const formule = (badge?.textContent.trim() || '') + ' — ' + (title?.textContent.trim() || '');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openOmraModal(formule);
    });
  });
}

function openOmraModal(formule) {
  const existing = document.getElementById('av-omra-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'av-omra-modal';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 8000;
    background: rgba(6,16,42,.88); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  `;

  overlay.innerHTML = `
    <div style="
      background: #0D1E42; border: 1px solid rgba(212,175,85,.35);
      border-radius: 12px; padding: 36px 32px; max-width: 480px; width: 100%;
      position: relative; box-shadow: 0 24px 60px rgba(0,0,0,.5);
    ">
      <button id="av-omra-close" style="
        position:absolute;top:14px;right:16px;background:none;border:none;
        color:rgba(246,241,230,.5);font-size:1.4rem;cursor:pointer;line-height:1;
      ">×</button>

      <div style="font-size:.68rem;letter-spacing:.20em;text-transform:uppercase;color:#D4AF55;margin-bottom:8px;">
        Réservation Omra
      </div>
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:600;color:#F6F1E6;margin-bottom:22px;">
        ${formule}
      </h3>

      <form id="av-omra-form">
        <label for="omra-nom" style="display:block;font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#D4AF55;margin-bottom:7px;">
          Nom complet *
        </label>
        <input id="omra-nom" name="nom" type="text" required placeholder="Votre nom" style="
          width:100%;background:rgba(246,241,230,.07);border:1px solid rgba(212,175,85,.30);
          border-radius:4px;padding:10px 13px;color:#F6F1E6;font-family:'Jost',sans-serif;
          font-size:.88rem;outline:none;margin-bottom:14px;
        "/>

        <label for="omra-tel" style="display:block;font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#D4AF55;margin-bottom:7px;">
          Téléphone *
        </label>
        <input id="omra-tel" name="telephone" type="tel" required placeholder="+212 6 00 00 00 00" style="
          width:100%;background:rgba(246,241,230,.07);border:1px solid rgba(212,175,85,.30);
          border-radius:4px;padding:10px 13px;color:#F6F1E6;font-family:'Jost',sans-serif;
          font-size:.88rem;outline:none;margin-bottom:14px;
        "/>

        <label for="omra-nb" style="display:block;font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#D4AF55;margin-bottom:7px;">
          Nombre de personnes
        </label>
        <input id="omra-nb" name="nb_personnes" type="number" min="1" max="50" value="1" style="
          width:100%;background:rgba(246,241,230,.07);border:1px solid rgba(212,175,85,.30);
          border-radius:4px;padding:10px 13px;color:#F6F1E6;font-family:'Jost',sans-serif;
          font-size:.88rem;outline:none;margin-bottom:14px;
        "/>

        <label for="omra-date" style="display:block;font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#D4AF55;margin-bottom:7px;">
          Date de départ souhaitée
        </label>
        <input id="omra-date" name="date_depart" type="date" style="
          width:100%;background:rgba(246,241,230,.07);border:1px solid rgba(212,175,85,.30);
          border-radius:4px;padding:10px 13px;color:#F6F1E6;font-family:'Jost',sans-serif;
          font-size:.88rem;outline:none;margin-bottom:22px;
        "/>

        <button type="submit" style="
          width:100%;background:linear-gradient(135deg,#D4AF55,#E8CC7A);
          color:#06102A;border:none;border-radius:4px;padding:13px;
          font-family:'Jost',sans-serif;font-size:.80rem;font-weight:600;
          letter-spacing:.14em;text-transform:uppercase;cursor:pointer;
        ">Confirmer la réservation</button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Fermeture
  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };
  document.getElementById('av-omra-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });

  // Soumission
  document.getElementById('av-omra-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd   = new FormData(e.target);
    const btn  = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);
    try {
      const data = await apiPost('/omra', {
        formule,
        nom:         fd.get('nom'),
        telephone:   fd.get('telephone'),
        nb_personnes: parseInt(fd.get('nb_personnes')) || 1,
        date_depart: fd.get('date_depart') || null,
      });
      close();
      showToast(data.message || '✓ Réservation reçue ! Notre équipe vous contacte rapidement.', 'success');
    } catch (err) {
      const msg = err?.errors?.[0]?.msg || err?.error || 'Erreur. Réessayez.';
      showToast('⚠ ' + msg, 'error');
      setLoading(btn, false);
    }
  });
}

/* ── Init global ─────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  initVisaForm();
  initOmraButtons();
  console.log('✅ Aurelia Voyage — API connectée sur', API_BASE);
});
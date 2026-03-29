import './style.css';

// ===== State =====
let currentStep = 1;
const totalSteps = 3;

// Google Apps Script URL — replace this after deploying your Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwaZJ04YnCidWAbw-ct_oy0zxTO4Z7BmcQfnd3xjcINlIBiyfDLGPYfCnCwRFGscppQQw/exec';

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  // Add event listeners for price calculation
  document.querySelectorAll('input[name="bakmie"]').forEach(el => el.addEventListener('change', calculateTotal));
  document.querySelectorAll('input[name="level"]').forEach(el => el.addEventListener('change', calculateTotal));
  document.querySelectorAll('input[name="topping"]').forEach(el => el.addEventListener('change', calculateTotal));

  // Create loading overlay
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loadingOverlay';
  overlay.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><div class="loading-text">Mengirim pesanan...</div></div>';
  document.body.appendChild(overlay);

  // Create toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.id = 'toast';
  document.body.appendChild(toast);

  updateProgress();

  // Cek status PO (buka/tutup)
  checkFormStatus();
});

// ===== Cek Status PO =====
window.checkFormStatus = async function () {
  if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') return; // Skip in demo mode

  try {
    const response = await fetch(SCRIPT_URL);
    const result = await response.json();

    const closedScreen = document.getElementById('closedScreen');
    const formContainer = document.querySelector('.form-container');
    const progressContainer = document.querySelector('.progress-container');

    if (result.status === 'closed') {
      // PO ditutup
      closedScreen.style.display = 'flex';
      formContainer.style.display = 'none';
      progressContainer.style.display = 'none';
      document.getElementById('closedMessage').textContent = result.message;
    } else {
      // PO buka
      closedScreen.style.display = 'none';
      formContainer.style.display = 'block';
      progressContainer.style.display = 'block';
    }
  } catch (error) {
    console.log('Status check failed, form stays open:', error);
  }
};

// ===== Navigation =====
window.nextStep = function (step) {
  if (!validateStep(currentStep)) return;

  // If going to step 3, build summary
  if (step === 3) {
    buildOrderSummary();
  }

  goToStep(step);
};

window.prevStep = function (step) {
  goToStep(step);
};

function goToStep(step) {
  // Hide floating total when leaving step 2
  const floatingTotal = document.getElementById('floatingTotal');
  if (currentStep === 2) {
    floatingTotal.classList.remove('visible');
  }

  // Hide current step
  document.getElementById(`step${currentStep}`).classList.remove('active');

  // Show new step
  currentStep = step;
  document.getElementById(`step${currentStep}`).classList.add('active');

  // Show floating total on step 2
  if (currentStep === 2) {
    const total = calculateTotal();
    if (total > 0) {
      floatingTotal.classList.add('visible');
    }
  }

  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Progress Bar =====
function updateProgress() {
  const fill = document.getElementById('progressFill');
  fill.style.width = `${(currentStep / totalSteps) * 100}%`;

  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    const stepNum = i + 1;
    dot.classList.remove('active', 'completed');
    if (stepNum === currentStep) {
      dot.classList.add('active');
    } else if (stepNum < currentStep) {
      dot.classList.add('completed');
    }
  });
}

// ===== Validation =====
function validateStep(step) {
  if (step === 1) {
    return validateStep1();
  } else if (step === 2) {
    return validateStep2();
  }
  return true;
}

function validateStep1() {
  let valid = true;
  const fields = [
    { id: 'nama', message: 'Nama harus diisi' },
    { id: 'lantai', message: 'Lantai harus diisi' },
    { id: 'unitKerja', message: 'Unit kerja harus diisi' }
  ];

  fields.forEach(field => {
    const input = document.getElementById(field.id);
    const group = input.closest('.form-group');

    // Remove existing error
    group.classList.remove('error');
    let errMsg = group.querySelector('.error-message');
    if (errMsg) errMsg.remove();

    if (!input.value.trim()) {
      valid = false;
      group.classList.add('error');
      errMsg = document.createElement('div');
      errMsg.className = 'error-message';
      errMsg.textContent = field.message;
      group.appendChild(errMsg);
      if (valid === false && fields.indexOf(field) === fields.findIndex(f => !document.getElementById(f.id).value.trim())) {
        input.focus();
        group.classList.add('shake');
        setTimeout(() => group.classList.remove('shake'), 500);
      }
    }
  });

  return valid;
}

function validateStep2() {
  let valid = true;
  const sections = [
    { name: 'bakmie', label: 'Bakmie' },
    { name: 'rasa', label: 'Rasa' },
    { name: 'level', label: 'Level Pedas' }
  ];

  sections.forEach(section => {
    const radios = document.querySelectorAll(`input[name="${section.name}"]`);
    const checked = Array.from(radios).some(r => r.checked);
    const container = radios[0].closest('.menu-section');

    container.classList.remove('error');

    if (!checked) {
      valid = false;
      container.classList.add('error');
      container.classList.add('shake');
      setTimeout(() => container.classList.remove('shake'), 500);
    }
  });

  if (!valid) {
    showToast('⚠️ Lengkapi semua pilihan menu');
  }

  return valid;
}

// ===== Price Calculation =====
function calculateTotal() {
  let total = 0;

  // Bakmie price
  const bakmie = document.querySelector('input[name="bakmie"]:checked');
  if (bakmie) total += parseInt(bakmie.dataset.price);

  // Level price
  const level = document.querySelector('input[name="level"]:checked');
  if (level) total += parseInt(level.dataset.price);

  // Topping prices
  document.querySelectorAll('input[name="topping"]:checked').forEach(t => {
    total += parseInt(t.dataset.price);
  });

  // Update displays
  document.getElementById('totalAmount').textContent = formatPrice(total);

  // Show/hide floating total
  const floatingTotal = document.getElementById('floatingTotal');
  if (currentStep === 2) {
    if (total > 0) {
      floatingTotal.classList.add('visible');
    } else {
      floatingTotal.classList.remove('visible');
    }
  }

  return total;
}

function formatPrice(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// ===== Order Summary =====
function buildOrderSummary() {
  const content = document.getElementById('summaryContent');
  const total = calculateTotal();

  const bakmie = document.querySelector('input[name="bakmie"]:checked');
  const rasa = document.querySelector('input[name="rasa"]:checked');
  const level = document.querySelector('input[name="level"]:checked');
  const toppings = document.querySelectorAll('input[name="topping"]:checked');

  let html = '';

  // Bakmie
  html += `<div class="summary-row">
    <span class="label">Bakmie</span>
    <span class="value">${bakmie.value} <span class="price">${formatPrice(parseInt(bakmie.dataset.price))}</span></span>
  </div>`;

  // Rasa
  html += `<div class="summary-row">
    <span class="label">Rasa</span>
    <span class="value">${rasa.value}</span>
  </div>`;

  // Level
  html += `<div class="summary-row">
    <span class="label">Level Pedas</span>
    <span class="value">${level.value} ${parseInt(level.dataset.price) > 0 ? '<span class="price">+' + formatPrice(parseInt(level.dataset.price)) + '</span>' : ''}</span>
  </div>`;

  // Toppings
  if (toppings.length > 0) {
    html += '<div class="summary-divider"></div>';
    toppings.forEach(t => {
      html += `<div class="summary-row">
        <span class="label">${t.value}</span>
        <span class="price">+${formatPrice(parseInt(t.dataset.price))}</span>
      </div>`;
    });
  }

  content.innerHTML = html;
  document.getElementById('summaryTotalAmount').textContent = formatPrice(total);
}

// ===== Copy Rekening =====
window.copyRekening = function () {
  const number = document.getElementById('accountNumber').textContent;
  navigator.clipboard.writeText(number).then(() => {
    const btn = document.getElementById('btnCopy');
    btn.classList.add('copied');
    btn.querySelector('.copy-text').textContent = '✅ Tersalin!';
    showToast('📋 Nomor rekening tersalin!');

    setTimeout(() => {
      btn.classList.remove('copied');
      btn.querySelector('.copy-text').textContent = 'Salin No. Rekening';
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = number;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('📋 Nomor rekening tersalin!');
  });
};

// ===== Toggle Submit =====
window.toggleSubmit = function () {
  const confirmed = document.getElementById('confirmPaid').checked;
  document.getElementById('btnSubmit').disabled = !confirmed;
};

// ===== Submit Order =====
window.submitOrder = async function () {
  if (!document.getElementById('confirmPaid').checked) return;

  const now = new Date();
  const timestamp = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const data = {
    timestamp: timestamp,
    deskripsi: '',
    nama: document.getElementById('nama').value.trim(),
    lantai: document.getElementById('lantai').value,
    unitKerja: document.getElementById('unitKerja').value.trim(),
    bakmie: document.querySelector('input[name="bakmie"]:checked').value,
    rasa: document.querySelector('input[name="rasa"]:checked').value,
    levelPedas: document.querySelector('input[name="level"]:checked').value,
    toppingAyamCharsiu: document.getElementById('topping1').checked ? '✓' : '-',
    toppingBaksoSapi: document.getElementById('topping2').checked ? '✓' : '-',
    toppingKripikPangsit: document.getElementById('topping3').checked ? '✓' : '-',
    total: calculateTotal(),
    statusBayar: 'Sudah Bayar (Konfirmasi Manual)'
  };

  // Show loading
  document.getElementById('loadingOverlay').classList.add('visible');

  try {
    if (SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data)
      });
      // no-cors mode: text/plain is a CORS-safe content type, so the body is actually sent
    } else {
      // Demo mode — simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('📦 Order data (demo mode):', data);
    }

    // Show success
    showSuccess(data);
  } catch (error) {
    console.error('Submit error:', error);
    showToast('❌ Gagal mengirim pesanan. Coba lagi.');
  } finally {
    document.getElementById('loadingOverlay').classList.remove('visible');
  }
};

// ===== Show Success =====
function showSuccess(data) {
  // Hide step 3
  document.getElementById('step3').classList.remove('active');

  // Build success details
  const details = document.getElementById('successDetails');
  details.innerHTML = `
    <div class="summary-row">
      <span class="label">Nama</span>
      <span class="value">${data.nama}</span>
    </div>
    <div class="summary-row">
      <span class="label">Pesanan</span>
      <span class="value">${data.bakmie}</span>
    </div>
    <div class="summary-row">
      <span class="label">Rasa</span>
      <span class="value">${data.rasa}</span>
    </div>
    <div class="summary-row">
      <span class="label">Level</span>
      <span class="value">${data.levelPedas}</span>
    </div>
    ${data.toppingAyamCharsiu === '✓' || data.toppingBaksoSapi === '✓' || data.toppingKripikPangsit === '✓' ? `<div class="summary-row">
      <span class="label">Topping</span>
      <span class="value">${[
        data.toppingAyamCharsiu === '✓' ? 'Ayam Charsiu' : '',
        data.toppingBaksoSapi === '✓' ? 'Bakso Sapi (2pcs)' : '',
        data.toppingKripikPangsit === '✓' ? 'Kripik Kulit Pangsit' : ''
      ].filter(t => t).join('<br>')}</span>
    </div>` : ''}
    <div class="summary-row">
      <span class="label">Total</span>
      <span class="value" style="color: var(--accent); font-family: var(--font-heading); font-weight: 700;">${formatPrice(data.total)}</span>
    </div>
  `;

  // Show success screen
  document.getElementById('stepSuccess').classList.add('active');

  // Update progress to complete
  document.getElementById('progressFill').style.width = '100%';
  document.querySelectorAll('.step-dot').forEach(dot => dot.classList.add('completed'));

  // Hide floating total
  document.getElementById('floatingTotal').classList.remove('visible');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Reset Form =====
window.resetForm = function () {
  // Hide success
  document.getElementById('stepSuccess').classList.remove('active');

  // Reset all form fields

  document.getElementById('nama').value = '';
  document.getElementById('lantai').value = '';
  document.getElementById('unitKerja').value = '';

  document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);

  document.getElementById('confirmPaid').checked = false;
  document.getElementById('btnSubmit').disabled = true;

  // Reset floating total
  document.getElementById('totalAmount').textContent = 'Rp 0';
  document.getElementById('floatingTotal').classList.remove('visible');

  // Clear errors
  document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.error-message').forEach(el => el.remove());

  // Go to step 1
  currentStep = 1;
  document.getElementById('step1').classList.add('active');
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ===== Toast =====
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

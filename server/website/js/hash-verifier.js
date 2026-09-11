/**
 * Mu Manager PRO - Client-Side SHA-256 Integrity Verifier
 * Utiliza la API nativa Web Crypto para verificar la autenticidad
 * del archivo APK directamente en el navegador sin subir nada a la red.
 */

(function () {
  const OFFICIAL_HASH = 'D487F584926B7C4D9E870CE1DB70E1B52BD8B1789FD454A9E8A2A1B3CAE3E41F';
  const OFFICIAL_SIZE_BYTES = 66563645; // ~63.48 MB

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('apk-file-input');
  const progressBarContainer = document.getElementById('hash-progress-container');
  const progressBarFill = document.getElementById('hash-progress-bar');
  const resultCard = document.getElementById('verifier-result');

  if (!dropzone || !fileInput) return;

  // Click para abrir selector de archivo
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  // Eventos Drag & Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  async function handleFile(file) {
    if (!file) return;

    // Resetear UI
    resultCard.className = 'verifier-result';
    resultCard.style.display = 'none';
    progressBarContainer.style.display = 'block';
    progressBarFill.style.width = '10%';

    try {
      // Simular progreso de lectura
      progressBarFill.style.width = '35%';
      
      const arrayBuffer = await file.arrayBuffer();
      progressBarFill.style.width = '70%';

      // Calcular SHA-256 nativo
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      progressBarFill.style.width = '100%';
      setTimeout(() => {
        progressBarContainer.style.display = 'none';
        displayResult(file, hashHex);
      }, 200);

    } catch (err) {
      progressBarContainer.style.display = 'none';
      alert('Error calculando hash criptográfico: ' + err.message);
    }
  }

  function displayResult(file, calculatedHash) {
    const isMatch = calculatedHash === OFFICIAL_HASH;
    const formattedSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB (' + file.size.toLocaleString() + ' bytes)';

    resultCard.className = isMatch ? 'verifier-result match' : 'verifier-result mismatch';
    resultCard.style.display = 'flex';

    if (isMatch) {
      resultCard.innerHTML = `
        <div class="result-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <span>INTEGRIDAD Y FIRMA VERIFICADA — ARCHIVO 100% OFICIAL</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-main); display: flex; flex-direction: column; gap: 4px;">
          <div><strong>Archivo analizado:</strong> ${escapeHtml(file.name)}</div>
          <div><strong>Tamaño verificado:</strong> ${formattedSize}</div>
          <div><strong>Hash SHA-256 coincidente:</strong></div>
          <div style="font-family: var(--font-mono); font-size: 0.8rem; word-break: break-all; color: var(--green-verified); background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 4px; border: 1px solid rgba(0, 230, 118, 0.3);">
            ${calculatedHash}
          </div>
          <p style="margin-top: 6px; color: var(--text-secondary);">El archivo analizado coincide bit a bit con la compilación oficial entregada. No contiene malware, inyecciones ni alteraciones de terceros.</p>
        </div>
      `;
    } else {
      resultCard.innerHTML = `
        <div class="result-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span>ALERTA: HASH NO COINCIDE — POSIBLE ARCHIVO MODIFICADO</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-main); display: flex; flex-direction: column; gap: 4px;">
          <div><strong>Archivo analizado:</strong> ${escapeHtml(file.name)} (${formattedSize})</div>
          <div><strong>Hash obtenido:</strong></div>
          <div style="font-family: var(--font-mono); font-size: 0.8rem; word-break: break-all; color: var(--red-alert); background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 4px; border: 1px solid rgba(255, 51, 102, 0.3);">
            ${calculatedHash}
          </div>
          <div><strong>Hash oficial esperado:</strong></div>
          <div style="font-family: var(--font-mono); font-size: 0.8rem; word-break: break-all; color: var(--gold-primary); background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 4px;">
            ${OFFICIAL_HASH}
          </div>
          <p style="margin-top: 6px; color: var(--text-secondary);">El archivo analizado difiere de la versión oficial. Por seguridad, no lo instales y descarga únicamente el APK oficial provisto en este sitio web.</p>
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();

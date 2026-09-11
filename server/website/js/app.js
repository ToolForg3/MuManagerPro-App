/**
 * Mu Manager PRO - Interactive App Controller (app.js)
 * Manejo de interacciones de UI, mockup dinámico de smartphone,
 * portapapeles, toasts, FAQs y modales.
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initMockupTabs();
  initCopyButtons();
  initFaqAccordion();
  initMobileMenu();
  initModals();
  updateDynamicYear();
  initSecretAdminAccess();
  initHeroParticles();
  initSpotlightCards();
  initCard3DTilt();
  initAnimatedCounters();
  initClassShowcase();
  initItemLab();
});

// 1. Selector de Pantallas del Mockup de Smartphone (Sincronización Bidireccional)
function initMockupTabs() {
  const switchView = (targetView) => {
    if (!targetView) return;

    // Actualizar botones superiores y pestañas inferiores
    document.querySelectorAll('.device-tab-btn, .apk-nav-item, .mockup-btn').forEach(btn => {
      if (btn.getAttribute('data-view') === targetView) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Actualizar pantallas visibles
    document.querySelectorAll('.apk-view, .mockup-view').forEach(view => {
      if (view.id === `view-${targetView}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });
  };

  // Escuchar clics en botones superiores
  document.querySelectorAll('.device-tab-btn, .mockup-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(btn.getAttribute('data-view'));
    });
  });

  // Escuchar clics en la barra de navegación inferior del teléfono (BottomTabs)
  document.querySelectorAll('.apk-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.getAttribute('data-view'));
    });
  });
}

// 2. Sistema de Copiado al Portapapeles con Toast Feedback
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('[data-copy]');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const textToCopy = btn.getAttribute('data-copy');
      const label = btn.getAttribute('data-label') || 'Texto';

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast(`✓ ${label} copiado al portapapeles`);
        }).catch(() => {
          fallbackCopy(textToCopy, label);
        });
      } else {
        fallbackCopy(textToCopy, label);
      }
    });
  });
}

function fallbackCopy(text, label) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(`✓ ${label} copiado al portapapeles`);
  } catch (err) {
    showToast(`Error al copiar texto`);
  }
  document.body.removeChild(textArea);
}

// 3. Notificación Toast Flotante
let toastTimeout;
function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

// 4. Acordeón de Preguntas Frecuentes (FAQ)
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Cerrar los demás para mantener interfaz limpia
      faqItems.forEach(i => i.classList.remove('active'));

      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// 5. Menú Móvil Desplegable
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links');

  if (!toggleBtn || !navLinks) return;

  toggleBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

  // Cerrar menú al hacer clic en un enlace
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
    });
  });
}

// 6. Manejador de Modales (Privacidad y Términos)
function initModals() {
  const modalTriggers = document.querySelectorAll('[data-modal]');
  const closeButtons = document.querySelectorAll('.modal-close');
  const modals = document.querySelectorAll('.modal-backdrop');

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = trigger.getAttribute('data-modal');
      const targetModal = document.getElementById(modalId);
      if (targetModal) {
        targetModal.style.display = 'flex';
      }
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modals.forEach(m => m.style.display = 'none');
    });
  });

  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

// 7. Año Dinámico
function updateDynamicYear() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// 8. Acceso Maestro Secreto a Administración (Sin enlaces públicos)
function initSecretAdminAccess() {
  let clickCount = 0;
  let clickTimer = null;
  const brandLogo = document.querySelector('.brand-logo');
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      clickCount++;
      clearTimeout(clickTimer);
      if (clickCount >= 7) {
        e.preventDefault();
        clickCount = 0;
        showToast('🔓 Abriendo consola maestra...');
        setTimeout(() => {
          window.location.href = '/admin';
        }, 600);
        return;
      }
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 3000);
    });
  }

  // Atajo de teclado maestro: Ctrl + Shift + A
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      showToast('🔓 Acceso de Administrador');
      setTimeout(() => {
        window.location.href = '/admin';
      }, 500);
    }
  });
}

// 9. Partículas de Fondo Épicas (Hero Particles Canvas)
function initHeroParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '1';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = container.offsetWidth);
  let height = (canvas.height = container.offsetHeight);

  window.addEventListener('resize', () => {
    if (!container) return;
    width = canvas.width = container.offsetWidth;
    height = canvas.height = container.offsetHeight;
  });

  const particles = [];
  const particleCount = Math.min(45, Math.floor(width / 30));

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.5 + 0.8,
      speedY: -(Math.random() * 0.45 + 0.15),
      speedX: (Math.random() - 0.5) * 0.25,
      opacity: Math.random() * 0.6 + 0.2,
      pulse: Math.random() * 0.02 + 0.005,
      color: Math.random() > 0.35 ? '245, 179, 53' : '0, 210, 255' // Gold / Cyan
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.opacity += Math.sin(Date.now() * p.pulse) * 0.005;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      const alpha = Math.max(0.1, Math.min(0.85, p.opacity));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
      ctx.shadowBlur = p.size * 3;
      ctx.shadowColor = `rgba(${p.color}, 0.6)`;
      ctx.fill();
    });

    requestAnimationFrame(render);
  }

  render();
}

// 10. Efecto Spotlight en Tarjetas Interactivas
function initSpotlightCards() {
  const cards = document.querySelectorAll('.spotlight-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.background = `radial-gradient(450px circle at ${x}px ${y}px, rgba(245, 179, 53, 0.06), var(--glass-card) 60%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.background = '';
    });
  });
}

// 11. Showcase Interactivo de Razas de MU Online (Class Roster)
const MU_CLASSES = {
  dk: {
    name: 'Dark Knight',
    evo3: 'Blade Master (3era Quest)',
    path: 'Dark Knight ➔ Blade Knight ➔ Blade Master',
    tag: 'Tanque Principal • Daño Físico & Combo',
    badge: 'GUERRERO DE ÉLITE',
    desc: 'El coloso indiscutible del cuerpo a cuerpo en Lorencia. Domina la secuencia de combo de tres habilidades continuas y potencia la salud de todo el grupo con el buff ancestral Greater Fortitude.',
    skills: ['Twisting Slash', 'Death Stab', 'Greater Fortitude', 'Rageful Blow', 'Combo System'],
    image: './assets/classes/dk.jpg',
    stats: { fuerza: 95, agilidad: 75, vitalidad: 90, energia: 40 },
    formula: 'Combo Físico: (Fuerza * 1.5) + (Agilidad * 1.2) + (Energía * 0.8)'
  },
  dw: {
    name: 'Dark Wizard',
    evo3: 'Grand Master (3era Quest)',
    path: 'Dark Wizard ➔ Soul Master ➔ Grand Master',
    tag: 'Magia Elemental • Control de Masas & Escudo',
    badge: 'ARCHIMAGO ARCANO',
    desc: 'Señor absoluto de la hechicería y el teletransporte en Davias. Despliega tormentas de hielo y descomposición tóxica, mientras su legendario Mana Shield absorbe hasta el 70% del daño entrante.',
    skills: ['Decay', 'Ice Storm', 'Mana Shield', 'Nova', 'Teleport'],
    image: './assets/classes/dw.jpg',
    stats: { fuerza: 25, agilidad: 65, vitalidad: 50, energia: 100 },
    formula: 'Absorción Mana Shield: 18% + (Agilidad / 50) + (Energía / 200)'
  },
  fe: {
    name: 'Fairy Elf',
    evo3: 'High Elf (3era Quest)',
    path: 'Fairy Elf ➔ Muse Elf ➔ High Elf',
    tag: 'Ataque a Distancia • Soporte & Buffs',
    badge: 'GUARDIANA CELESTIAL',
    desc: 'La arquera excelsa de los bosques de Noria. Dispara ráfagas continuas de flechas a velocidad ultrasónica y es el pilar de toda party gracias a sus bendiciones de Daño Adicional, Defensa y Curación.',
    skills: ['Multi-Shot', 'Five Shot', 'Greater Damage', 'Greater Defense', 'Infinity Arrow'],
    image: './assets/classes/fe.jpg',
    stats: { fuerza: 40, agilidad: 100, vitalidad: 55, energia: 80 },
    formula: 'Buff Ataque: (Energía / 7) + 3 | Buff Defensa: (Energía / 8) + 2'
  },
  mg: {
    name: 'Magic Gladiator',
    evo3: 'Duel Master (3era Quest)',
    path: 'Magic Gladiator ➔ Duel Master',
    tag: 'Híbrido Espada & Magia • Sin Casco',
    badge: 'DUELISTA HÍBRIDO',
    desc: 'Raza avanzada nacida de la alquimia prohibida. Puede equipar espadas colosales de Dark Knight o bastones mágicos de Dark Wizard, alcanzando una cadencia descomunal con Gigantic Storm y Power Slash.',
    skills: ['Power Slash', 'Fire Slash', 'Gigantic Storm', 'Flame Strike', 'Spiral Slash'],
    image: './assets/classes/mg.jpg',
    stats: { fuerza: 85, agilidad: 80, vitalidad: 65, energia: 85 },
    formula: 'Obtiene 7 puntos de atributo por nivel (frente a 5 de razas base)'
  },
  dl: {
    name: 'Dark Lord',
    evo3: 'Lord Emperor (3era Quest)',
    path: 'Dark Lord ➔ Lord Emperor',
    tag: 'Líder del Castillo • Dark Horse & Raven',
    badge: 'SOBERANO IMPERIAL',
    desc: 'El comandante supremo del Valle de Loren y Siege. Canaliza el atributo exclusivo de Comando para invocar el temible Fire Scream, potenciar el daño crítico del clan y montar a su corcel sagrado Dark Horse.',
    skills: ['Fire Scream', 'Chaotic Diseier', 'Critical Damage', 'Earthquake', 'Summon Party'],
    image: './assets/classes/dl.jpg',
    stats: { fuerza: 80, agilidad: 70, vitalidad: 70, energia: 95 },
    formula: 'Crítico: (Comando / 25) + (Energía / 30) de daño crítico adicional'
  },
  su: {
    name: 'Summoner',
    evo3: 'Dimension Master (3era Quest)',
    path: 'Summoner ➔ Bloody Summoner ➔ Dimension Master',
    tag: 'Maldiciones • Reflejo de Daño & Drenaje',
    badge: 'BRUJA DIMENSIONAL',
    desc: 'Mística proveniente de las tierras de Elbeland. Aplica maldiciones de sueño y reducción defensiva a sus enemigos, devuelve el daño recibido con Reflect y canaliza relámpagos y contaminación espectral.',
    skills: ['Pollution', 'Chain Lightning', 'Damage Reflect', 'Sleep', 'Innovation'],
    image: './assets/classes/su.jpg',
    stats: { fuerza: 30, agilidad: 65, vitalidad: 60, energia: 95 },
    formula: 'Reflejo: 30% + (Energía / 42)% de daño reflejado al atacante'
  },
  rf: {
    name: 'Rage Fighter',
    evo3: 'Fist Master (3era Quest)',
    path: 'Rage Fighter ➔ Fist Master',
    tag: 'Combate Cuerpo a Cuerpo • Ignora Defensa',
    badge: 'PUÑO DEVASTADOR',
    desc: 'Guerrero de la orden real de Karutan. Especialista en golpes con guanteletes a velocidad cegadora, drenaje masivo de energía enemiga y ataques capaces de ignorar completamente la armadura del oponente.',
    skills: ['Chain Drive', 'Dragon Roar', 'Dark Side', 'Dragon Slasher', 'Phoenix Shot'],
    image: './assets/classes/rf.jpg',
    stats: { fuerza: 90, agilidad: 80, vitalidad: 85, energia: 35 },
    formula: 'Daño Chain Drive: (Vitalidad * 0.1) + (Fuerza * 0.3) con 100% de cadencia'
  }
};

function initClassShowcase() {
  const tabs = document.querySelectorAll('.class-tab-btn');
  const artImg = document.getElementById('class-showcase-art');
  const titleEl = document.getElementById('class-showcase-title');
  const subEl = document.getElementById('class-showcase-subtitle');
  const badgeEl = document.getElementById('class-showcase-badge');
  const pathEl = document.getElementById('class-showcase-path');
  const descEl = document.getElementById('class-showcase-desc');
  const skillsContainer = document.getElementById('class-showcase-skills');
  const barStr = document.getElementById('stat-bar-fuerza');
  const barAgi = document.getElementById('stat-bar-agilidad');
  const barVit = document.getElementById('stat-bar-vitalidad');
  const barEne = document.getElementById('stat-bar-energia');

  if (!tabs.length || !artImg) return;

  function loadClass(key) {
    const data = MU_CLASSES[key];
    if (!data) return;

    // Actualizar tabs
    tabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-class') === key);
    });

    // Transición suave
    artImg.style.opacity = '0.3';
    setTimeout(() => {
      artImg.src = data.image;
      artImg.alt = `${data.name} - Mu Manager PRO`;
      artImg.style.opacity = '1';
    }, 120);

    if (titleEl) titleEl.textContent = data.evo3;
    if (subEl) subEl.textContent = data.tag;
    if (badgeEl) badgeEl.textContent = data.badge;
    if (pathEl) pathEl.innerHTML = `<span class="class-evo-step">${data.path.replace(/➔/g, '</span> <span class="class-evo-arrow">➔</span> <span class="class-evo-step">')}</span>`;
    if (descEl) descEl.textContent = data.desc;

    if (skillsContainer) {
      skillsContainer.innerHTML = data.skills
        .map(s => `<span class="class-skill-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>${s}</span>`)
        .join('');
    }

    if (barStr) barStr.style.width = `${data.stats.fuerza}%`;
    if (barAgi) barAgi.style.width = `${data.stats.agilidad}%`;
    if (barVit) barVit.style.width = `${data.stats.vitalidad}%`;
    if (barEne) barEne.style.width = `${data.stats.energia}%`;
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const cls = btn.getAttribute('data-class');
      loadClass(cls);
    });
  });

  // Carga inicial (Dark Knight por defecto)
  loadClass('dk');
}

// 12. Laboratorio & Simulador de Items 16-Bytes en Tiempo Real
const ITEM_PRESETS = {
  archangel: {
    name: 'Staff of Archangel',
    type: 'Staff Legendario de 2 Manos',
    baseDmg: '145 ~ 185',
    speed: 30,
    reqStr: 260,
    reqAgi: 110,
    baseHex: 'DB'
  },
  boneblade: {
    name: 'Bone Blade',
    type: 'Espada Devastadora de 1 Mano',
    baseDmg: '188 ~ 215',
    speed: 35,
    reqStr: 850,
    reqAgi: 280,
    baseHex: '16'
  },
  wings3: {
    name: 'Wings of Storm',
    type: 'Alas Fase 3 (Blade Master)',
    baseDmg: 'Defensa: 135 (Absorción 39%)',
    speed: 0,
    reqStr: 300,
    reqAgi: 300,
    baseHex: '24'
  },
  dragon: {
    name: 'Dragon Knight Armor',
    type: 'Pechera Pesada Legendaria',
    baseDmg: 'Defensa: 122',
    speed: 0,
    reqStr: 620,
    reqAgi: 180,
    baseHex: '01'
  },
  solay: {
    name: 'Solay Scepter',
    type: 'Cetro Imperial del Dark Lord',
    baseDmg: '158 ~ 180 (Comando +85)',
    speed: 30,
    reqStr: 450,
    reqAgi: 120,
    baseHex: '0E'
  }
};

function initItemLab() {
  const itemChips = document.querySelectorAll('.item-chip-btn');
  const levelSlider = document.getElementById('item-level-slider');
  const levelBadge = document.getElementById('item-level-badge');
  const optSlider = document.getElementById('item-opt-slider');
  const optBadge = document.getElementById('item-opt-badge');
  const luckCheckbox = document.getElementById('item-luck-check');
  const skillCheckbox = document.getElementById('item-skill-check');
  const excCheckboxes = document.querySelectorAll('.exc-check');

  // Elementos de la vista In-Game
  const muItemBox = document.getElementById('mu-item-box');
  const muTitle = document.getElementById('mu-preview-title');
  const muGrade = document.getElementById('mu-preview-grade');
  const muStats = document.getElementById('mu-preview-stats');
  const muLuck = document.getElementById('mu-preview-luck');
  const muOpt = document.getElementById('mu-preview-opt');
  const muExcList = document.getElementById('mu-preview-exc-list');
  const hexCode = document.getElementById('mu-hex-code');
  const copyHexBtn = document.getElementById('copy-hex-btn');

  if (!levelSlider || !muTitle || !hexCode) return;

  let currentItemKey = 'archangel';

  function updateItemSimulator() {
    const preset = ITEM_PRESETS[currentItemKey];
    if (!preset) return;

    const level = parseInt(levelSlider.value, 10);
    const optVal = parseInt(optSlider.value, 10) * 4; // 0, 4, 8, 12, 16, 20, 24, 28
    const hasLuck = luckCheckbox ? luckCheckbox.checked : false;
    const hasSkill = skillCheckbox ? skillCheckbox.checked : false;

    // Badges
    if (levelBadge) levelBadge.textContent = `+${level}`;
    if (optBadge) optBadge.textContent = `+${optVal}`;

    // Nivel en caja y estilo visual
    muItemBox.classList.toggle('glowing-gold', level >= 9);

    // Título
    const levelStr = level > 0 ? ` +${level}` : '';
    muTitle.textContent = `${preset.name}${levelStr}`;

    // Stats
    const bonusDmg = level * 6;
    muStats.innerHTML = `${preset.type}<br>Poder de Combate: ${preset.baseDmg} ${bonusDmg > 0 ? `<span style="color: var(--cyan-primary);">(+${bonusDmg})</span>` : ''}`;

    // Luck
    if (hasLuck) {
      muLuck.style.display = 'block';
      muLuck.textContent = '✦ Golpe de Suerte (Probabilidad Daño Crítico +5%, Tasa Éxito Chaos +25%)';
    } else {
      muLuck.style.display = 'none';
    }

    // Option
    if (optVal > 0) {
      muOpt.style.display = 'block';
      muOpt.textContent = `✦ Opción Adicional: Daño / Absorción +${optVal}`;
    } else {
      muOpt.style.display = 'none';
    }

    // Opciones Excelentes
    let activeExcCount = 0;
    let excByte = 0;
    let excHtml = '';

    excCheckboxes.forEach((cb, idx) => {
      const parentLabel = cb.closest('.exc-checkbox-label');
      if (cb.checked) {
        activeExcCount++;
        excByte |= (1 << idx);
        if (parentLabel) parentLabel.classList.add('active');
        const text = cb.getAttribute('data-opt-name') || cb.parentElement.textContent.trim();
        excHtml += `<div class="mu-item-exc-line">◆ ${text}</div>`;
      } else {
        if (parentLabel) parentLabel.classList.remove('active');
      }
    });

    if (activeExcCount > 0) {
      muGrade.textContent = '[ Ítem Excelente ]';
      muGrade.style.display = 'block';
      muExcList.innerHTML = excHtml;
      muExcList.style.display = 'flex';
    } else {
      muGrade.style.display = 'none';
      muExcList.style.display = 'none';
    }

    // Cálculo y Ensamblaje del Código Hexadecimal de 16 Bytes estándar de MU Online
    // Byte 0: ID básico | Byte 1: Nivel + Skill + Luck + Opt | Byte 2: Durabilidad
    // Byte 3..6: Serial (0x00000000) | Byte 7: Opciones Exc + Opt extendida | Byte 8..15: Sockets / Harmony
    const byte0 = preset.baseHex;
    const byte1Val = (level << 3) | (hasSkill ? 128 : 0) | (hasLuck ? 4 : 0) | (optVal > 0 ? (optVal / 4) & 3 : 0);
    const byte1 = byte1Val.toString(16).padStart(2, '0').toUpperCase();
    const byte2 = (255).toString(16).padStart(2, '0').toUpperCase(); // Durabilidad 255
    const byte7Val = excByte | ((optVal / 4 >= 4) ? 64 : 0);
    const byte7 = byte7Val.toString(16).padStart(2, '0').toUpperCase();

    const fullHex = `${byte0} ${byte1} ${byte2} 00 00 00 00 ${byte7} 00 00 00 00 00 00 00 00`;
    hexCode.textContent = fullHex;

    // Destello de la Máquina del Caos
    if (muItemBox) {
      muItemBox.classList.remove('chaos-flash');
      void muItemBox.offsetWidth; // Reflow
      muItemBox.classList.add('chaos-flash');
    }
  }

  // Event Listeners
  itemChips.forEach(chip => {
    chip.addEventListener('click', () => {
      itemChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentItemKey = chip.getAttribute('data-item');
      updateItemSimulator();
    });
  });

  levelSlider.addEventListener('input', updateItemSimulator);
  optSlider.addEventListener('input', updateItemSimulator);
  if (luckCheckbox) luckCheckbox.addEventListener('change', updateItemSimulator);
  if (skillCheckbox) skillCheckbox.addEventListener('change', updateItemSimulator);
  excCheckboxes.forEach(cb => cb.addEventListener('change', updateItemSimulator));

  if (copyHexBtn) {
    copyHexBtn.addEventListener('click', () => {
      const hex = hexCode.textContent.trim();
      navigator.clipboard.writeText(hex).then(() => {
        showToast('✓ Código Hex 16-Bytes copiado para tu inventario');
      }).catch(() => {
        fallbackCopy(hex, 'Código Hex');
      });
    });
  }

  // Inicializar con valores por defecto
  updateItemSimulator();
}

// ============================================================================
// EFECTOS VISUALES MODERNOS (AAA GAMING SAAS)
// ============================================================================

// 1. Barra Láser de Progreso de Lectura
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  const updateBar = () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) return;
    const progress = (window.scrollY / totalHeight) * 100;
    bar.style.width = Math.min(100, Math.max(0, progress)) + '%';
  };

  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();
}

// 2. Brasas de Caos en Canvas (Partículas Flotantes)
function initHeroParticles() {
  const container = document.getElementById('hero-particles');
  if (!container) return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const PARTICLE_COUNT = 45;

  function resize() {
    width = canvas.width = container.offsetWidth || window.innerWidth;
    height = canvas.height = container.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + Math.random() * 20;
      this.size = Math.random() * 2.4 + 0.8;
      this.speedY = Math.random() * 0.7 + 0.3;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.opacity = Math.random() * 0.7 + 0.25;
      this.fade = Math.random() * 0.005 + 0.002;
      const rand = Math.random();
      if (rand > 0.45) {
        this.color = '245, 179, 53'; // Oro
      } else if (rand > 0.2) {
        this.color = '255, 87, 34'; // Fuego de Caos
      } else {
        this.color = '0, 229, 255'; // Cian Mágico
      }
    }
    update() {
      this.y -= this.speedY;
      this.x += this.speedX + Math.sin(this.y * 0.02) * 0.35;
      this.opacity -= this.fade;
      if (this.opacity <= 0 || this.y < -10) {
        this.reset();
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${this.color}, 0.75)`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// 3. Spotlight Magnético en Tarjetas
function initSpotlightCards() {
  const cards = document.querySelectorAll('.spotlight-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

// 4. Inclinación 3D en Perspectiva (Micro-Tilt)
function initCard3DTilt() {
  const tiltElements = document.querySelectorAll('.android-device, .mu-item-box');
  tiltElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = (-y / rect.height) * 8;
      const rotateY = (x / rect.width) * 8;
      el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

// 5. Contadores Numéricos Animados
function initAnimatedCounters() {
  const counters = document.querySelectorAll('.apk-metric-val, .meta-stat-value');
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const rawText = el.textContent.trim();
        const numMatch = rawText.match(/[\d,.]+/);
        if (numMatch) {
          const rawNum = parseFloat(numMatch[0].replace(/,/g, ''));
          if (!isNaN(rawNum)) {
            const hasComma = numMatch[0].includes(',');
            const suffix = rawText.replace(numMatch[0], '');
            const duration = 1200;
            const startTime = performance.now();

            function updateCounter(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const ease = 1 - (1 - progress) * (1 - progress);
              const currentVal = Math.floor(ease * rawNum);
              el.textContent = (hasComma ? currentVal.toLocaleString('en-US') : currentVal) + suffix;
              if (progress < 1) {
                requestAnimationFrame(updateCounter);
              } else {
                el.textContent = rawText;
              }
            }
            requestAnimationFrame(updateCounter);
          }
        }
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(c => observer.observe(c));
}


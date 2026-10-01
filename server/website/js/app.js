/**
 * Mu Manager PRO - Interactive App Controller (app.js)
 * Stitch Approved Ironforge - Manejo de Vistas, Mockup, Toasts, FAQs y Modales
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
  initClassShowcase();
});

// 1. Barra de Progreso de Lectura
function initScrollProgress() {
  const progressBar = document.getElementById('scroll-progress');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = (scrollTop / docHeight) * 100;
    progressBar.style.width = `${progress}%`;
  }, { passive: true });
}

// 2. Selector de Pantallas del Mockup Android (Sincronización Bidireccional)
function initMockupTabs() {
  const switchView = (targetView) => {
    if (!targetView) return;

    // Actualizar botones superiores
    document.querySelectorAll('.device-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-view') === targetView) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Actualizar pestañas inferiores
    document.querySelectorAll('.apk-nav-item').forEach(item => {
      if (item.getAttribute('data-view') === targetView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Actualizar pantallas visibles
    document.querySelectorAll('.apk-view').forEach(view => {
      if (view.id === `view-${targetView}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });
  };

  // Clics en botones superiores
  document.querySelectorAll('.device-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(btn.getAttribute('data-view'));
    });
  });

  // Clics en barra inferior del teléfono
  document.querySelectorAll('.apk-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.getAttribute('data-view'));
    });
  });
}

// 3. Sistema de Copiado al Portapapeles con Toast Feedback
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

// 4. Notificación Toast Flotante
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

// 5. Acordeón de Preguntas Frecuentes (FAQ)
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));

      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// 6. Menú Móvil Desplegable
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links');

  if (!toggleBtn || !navLinks) return;

  toggleBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
    });
  });
}

// 7. Manejador de Modales
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

// 8. Año Dinámico
function updateDynamicYear() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// 9. Acceso Maestro Secreto a Administración
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

// 10. Partículas de Polvo Místico en el Hero
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
  const particleCount = Math.min(30, Math.floor(width / 40));

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.6,
      speedY: -(Math.random() * 0.35 + 0.1),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.5 + 0.15,
      pulse: Math.random() * 0.02 + 0.005,
      color: '239, 210, 141' // Antique Gold
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.opacity += Math.sin(Date.now() * p.pulse) * 0.004;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      const alpha = Math.max(0.1, Math.min(0.75, p.opacity));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
      ctx.shadowBlur = p.size * 2;
      ctx.shadowColor = `rgba(${p.color}, 0.5)`;
      ctx.fill();
    });

    requestAnimationFrame(render);
  }

  render();
}

// 11. Selector Interactivo de Razas de MU Online (Sala de los Héroes)
function initClassShowcase() {
  const tabs = document.querySelectorAll('.hero-class-tab');
  const avatarImg = document.getElementById('class-avatar-img');
  const titleEl = document.getElementById('class-title');
  const subtitleEl = document.getElementById('class-subtitle');
  const descEl = document.getElementById('class-desc');
  const powerEl = document.getElementById('class-power');
  const card = document.getElementById('hero-class-card');

  if (!tabs.length || !avatarImg || !titleEl || !card) return;

  const classData = {
    dk: {
      avatar: './assets/classes/dk.jpg',
      title: 'Dark Knight • Blade Master',
      subtitle: 'Guerrero de Sangre y Acero • Lorencia',
      desc: 'El pilar inquebrantable de la vanguardia. Especialista en combate cuerpo a cuerpo devastador, dominio de espadas dobles y la técnica ancestral del Greater Fortitude para multiplicar la vitalidad de todo su clan.',
      power: '<strong>Capacidad Mu Manager PRO:</strong> Control absoluto de Fuerza/Agilidad hasta 65,535, reseteo de PK en caliente, ajuste de Master Level 400 y forjado de armas 380 (Bone Blade / Dragon Knight Set).'
    },
    dw: {
      avatar: './assets/classes/dw.jpg',
      title: 'Dark Wizard • Grand Master',
      subtitle: 'Señor de la Magia Arcana • Devias',
      desc: 'Dominador absoluto de los elementos cósmicos y la teletransportación espacial. Capaz de desatar tempestades de meteoros y escudos de maná impenetrables (Soul Barrier) para absorber el daño más letal.',
      power: '<strong>Capacidad Mu Manager PRO:</strong> Ajuste de Energía máxima (65k), inyección de Staffs Archangel / Grand Viper, cálculo de absorción de daño de Soul Barrier y corrección de maná en tiempo real.'
    },
    fe: {
      avatar: './assets/classes/fe.jpg',
      title: 'Fairy Elf • High Elf',
      subtitle: 'Guardiana de Noria • Flechas Sagradas',
      desc: 'Soberana de los bosques de Noria. Domina el arte del arco a larga distancia con precisión mortal, o bendice a sus aliados con auras sagradas de ataque, defensa y curación divina que deciden la victoria en Castle Siege.',
      power: '<strong>Capacidad Mu Manager PRO:</strong> Edición de Agilidad pura para disparos infinitos, configuración de Infinity Arrow, inyección de Auras de Buff y equipamiento de sets Sylphid Ray / Albatross Bow.'
    },
    mg: {
      avatar: './assets/classes/mg.jpg',
      title: 'Magic Gladiator • Duel Master',
      subtitle: 'Híbrido de Poder Destructivo • Tarkan',
      desc: 'Nacido de la conjunción prohibida entre el acero y la magia negra. Puede blandir dos espadas gigantes o canalizar hechizos arcanos con 7 puntos por nivel, prescindiendo del uso de yelmo para mayor agilidad bélica.',
      power: '<strong>Capacidad Mu Manager PRO:</strong> Ajuste balanceado de Fuerza/Energía sin penalizaciones, inyección de Rune Bastard Sword, Volcano Set y calibración de daño elemental para PvP Season 6.'
    },
    dl: {
      avatar: './assets/classes/dl.jpg',
      title: 'Dark Lord • Lord Emperor',
      subtitle: 'Emperador de las Tierras Oscuras • Valley of Loren',
      desc: 'El comandante supremo del trono imperial. Dirige al caballo sagrado Dark Horse para aplastar huestes enemigas con terremotos, convoca al Dark Raven y lidera gremios masivos mediante el atributo exclusivo de Comando.',
      power: '<strong>Capacidad Mu Manager PRO:</strong> Edición de Comando (Leadership) para expansión máxima de Guild, inyección de Dark Horse / Dark Raven con nivel 50, y forjado del legendario Shining Scepter.'
    }
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetClass = tab.getAttribute('data-class');
      const data = classData[targetClass];
      if (!data) return;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Animación suave de transición
      card.style.opacity = '0.5';
      card.style.transform = 'translateY(4px)';
      setTimeout(() => {
        avatarImg.src = data.avatar;
        avatarImg.alt = data.title;
        titleEl.textContent = data.title;
        subtitleEl.textContent = data.subtitle;
        descEl.textContent = data.desc;
        powerEl.innerHTML = data.power;
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 120);
    });
  });
}

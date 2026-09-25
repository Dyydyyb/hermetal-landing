/**
 * HERMETAL - BULONERA ROCA | Landing Page Oficial
 * Scripts interactivos: Estufa SVG interactiva, regulador de tiraje,
 * calculador térmico, filtro de catálogo, formulario WhatsApp, audio ambiental.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Constantes de marca y contacto
  const WHATSAPP_PHONE = '5492664848484'; // Número oficial San Luis (configurable)

  /* ==========================================================================
     1. NAVEGACIÓN MÓVIL (Menú Hamburguesa)
     ========================================================================== */
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('is-open');
      mobileToggle.classList.toggle('is-active', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen);
    });

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('is-open');
        mobileToggle.classList.remove('is-active');
        mobileToggle.setAttribute('aria-expanded', false);
      });
    });
  }

  /* ==========================================================================
     2. ESTUFA INTERACTIVA (Llamas realistas, regulador de tiraje y audio)
     ========================================================================== */
  const stoveStage = document.getElementById('stoveStage');
  const btnToggleFlame = document.getElementById('btnToggleFlame');
  const btnToggleSound = document.getElementById('btnToggleSound');
  const damperSlider = document.getElementById('damperSlider');
  const damperLevelText = document.getElementById('damperLevelText');
  const statusPill = document.getElementById('statusPill');

  // Métricas dinámicas en el HUD
  const metricPotencia = document.getElementById('metricPotencia');
  const metricTemp = document.getElementById('metricTemp');
  const metricConsumo = document.getElementById('metricConsumo');
  const metricSuperficie = document.getElementById('metricSuperficie');

  let isStoveLit = true; // Empieza encendida para causar impacto visual inmediato
  let soundAudioContext = null;
  let isSoundPlaying = false;
  let noiseNode = null;
  let gainNode = null;

  // Modos de tiraje
  const damperSettings = {
    1: {
      name: 'Mínimo (Tiraje Lento)',
      flameClass: 'flame-min',
      potencia: '8.000',
      temp: '220',
      consumo: '1.2',
      superficie: '60'
    },
    2: {
      name: 'Medio (Combustión Óptima)',
      flameClass: 'flame-med',
      potencia: '14.000',
      temp: '340',
      consumo: '1.8',
      superficie: '95'
    },
    3: {
      name: 'Máximo (Fuego Vivo)',
      flameClass: 'flame-max',
      potencia: '20.000',
      temp: '430',
      consumo: '2.5',
      superficie: '140'
    }
  };

  function updateStoveState() {
    if (!stoveStage) return;

    if (isStoveLit) {
      stoveStage.classList.remove('is-off');
      statusPill.className = 'console-status-pill status-active';
      statusPill.innerHTML = '<span class="status-dot">🔥</span> Encendida (Alto Rendimiento)';
      btnToggleFlame.innerHTML = '<span>💨</span> Apagar Fuego';
      btnToggleFlame.style.backgroundColor = 'var(--steel-900)';

      const currentLevel = damperSlider ? damperSlider.value : 3;
      applyDamperLevel(currentLevel);
      if (isSoundPlaying && gainNode) {
        gainNode.gain.setTargetAtTime(0.08, soundAudioContext.currentTime, 0.1);
      }
    } else {
      stoveStage.classList.add('is-off');
      statusPill.className = 'console-status-pill status-inactive';
      statusPill.innerHTML = '<span class="status-dot">💤</span> Apagada (En Reposo)';
      btnToggleFlame.innerHTML = '<span>🔥</span> Encender Fuego';
      btnToggleFlame.style.backgroundColor = 'var(--brand-orange)';

      // Cero métricas cuando está apagada
      metricPotencia.textContent = '0';
      metricTemp.textContent = '22';
      metricConsumo.textContent = '0.0';
      metricSuperficie.textContent = '0';

      if (isSoundPlaying && gainNode) {
        gainNode.gain.setTargetAtTime(0.001, soundAudioContext.currentTime, 0.2);
      }
    }
  }

  function applyDamperLevel(val) {
    if (!stoveStage || !isStoveLit) return;
    const config = damperSettings[val] || damperSettings[3];

    // Remover clases previas
    stoveStage.classList.remove('flame-min', 'flame-med', 'flame-max');
    stoveStage.classList.add(config.flameClass);

    if (damperLevelText) {
      damperLevelText.textContent = config.name;
    }

    // Actualizar métricas con pequeña transición
    if (metricPotencia) metricPotencia.textContent = config.potencia;
    if (metricTemp) metricTemp.textContent = config.temp;
    if (metricConsumo) metricConsumo.textContent = config.consumo;
    if (metricSuperficie) metricSuperficie.textContent = config.superficie;
  }

  // Evento botón encendido / apagado
  if (btnToggleFlame) {
    btnToggleFlame.addEventListener('click', () => {
      isStoveLit = !isStoveLit;
      updateStoveState();
    });
  }

  // Clic directo sobre la estufa enciende/apaga
  const stoveSvgBox = document.getElementById('stoveSvgBox');
  if (stoveSvgBox) {
    stoveSvgBox.addEventListener('click', () => {
      isStoveLit = !isStoveLit;
      updateStoveState();
    });
  }

  // Evento slider de tiraje
  if (damperSlider) {
    damperSlider.addEventListener('input', (e) => {
      if (!isStoveLit) {
        isStoveLit = true;
        updateStoveState();
      }
      applyDamperLevel(e.target.value);
    });
  }

  // Sonido de crepitar de leña sintetizado con Web Audio API (100% autónomo y liviano)
  function initFireSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      soundAudioContext = new AudioCtx();

      // Buffer de ruido blanco/marrón para el siseo suave del tiraje
      const bufferSize = soundAudioContext.sampleRate * 2;
      const noiseBuffer = soundAudioContext.createBuffer(1, bufferSize, soundAudioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise suave
        lastOut = output[i];
      }

      noiseNode = soundAudioContext.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const filter = soundAudioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      gainNode = soundAudioContext.createGain();
      gainNode.gain.value = 0.06;

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(soundAudioContext.destination);
      noiseNode.start();

      // Generador de chasquidos aleatorios (crackle de leña)
      setInterval(() => {
        if (!isSoundPlaying || !isStoveLit || !soundAudioContext) return;
        if (Math.random() > 0.4) {
          const crackleOsc = soundAudioContext.createOscillator();
          const crackleGain = soundAudioContext.createGain();

          crackleOsc.type = 'triangle';
          crackleOsc.frequency.setValueAtTime(250 + Math.random() * 800, soundAudioContext.currentTime);

          crackleGain.gain.setValueAtTime(0.04 + Math.random() * 0.08, soundAudioContext.currentTime);
          crackleGain.gain.exponentialRampToValueAtTime(0.0001, soundAudioContext.currentTime + 0.04 + Math.random() * 0.05);

          crackleOsc.connect(crackleGain);
          crackleGain.connect(soundAudioContext.destination);

          crackleOsc.start();
          crackleOsc.stop(soundAudioContext.currentTime + 0.1);
        }
      }, 150);

    } catch (e) {
      console.warn('Web Audio no disponible en este navegador:', e);
    }
  }

  if (btnToggleSound) {
    btnToggleSound.addEventListener('click', () => {
      if (!soundAudioContext) {
        initFireSound();
      }

      if (soundAudioContext && soundAudioContext.state === 'suspended') {
        soundAudioContext.resume();
      }

      isSoundPlaying = !isSoundPlaying;
      btnToggleSound.classList.toggle('is-playing', isSoundPlaying);

      if (isSoundPlaying) {
        btnToggleSound.innerHTML = '<span>🔊</span> Sonido: Activo';
        if (gainNode) gainNode.gain.setValueAtTime(isStoveLit ? 0.08 : 0.001, soundAudioContext.currentTime);
      } else {
        btnToggleSound.innerHTML = '<span>🔇</span> Sonido de Leña';
        if (gainNode) gainNode.gain.setValueAtTime(0, soundAudioContext.currentTime);
      }
    });
  }

  // Inicializar estado de estufa
  updateStoveState();

  /* ==========================================================================
     3. ACORDEÓN DE PUNTOS CLAVE / HOTSPOTS
     ========================================================================== */
  const hotspotItems = document.querySelectorAll('.hotspot-item');
  hotspotItems.forEach(item => {
    const btn = item.querySelector('.hotspot-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const isCurrentOpen = item.classList.contains('is-open');
        // Cerrar los otros
        hotspotItems.forEach(other => other.classList.remove('is-open'));
        // Abrir si no estaba abierto
        if (!isCurrentOpen) {
          item.classList.add('is-open');
        }
      });
    }
  });

  /* ==========================================================================
     4. CALCULADOR TÉRMICO INTERACTIVO (Metros cuadrados a Modelo ideal)
     ========================================================================== */
  const calcAreaRange = document.getElementById('calcAreaRange');
  const calcAreaVal = document.getElementById('calcAreaVal');
  const zoneBtns = document.querySelectorAll('.calc-radio-btn');
  const resultModelName = document.getElementById('resultModelName');
  const resultPotencia = document.getElementById('resultPotencia');
  const resultConsumo = document.getElementById('resultConsumo');
  const resultAmbiente = document.getElementById('resultAmbiente');
  const btnCalcWhatsApp = document.getElementById('btnCalcWhatsApp');

  let selectedZoneFactor = 1.0; // 1.0 templada, 1.3 fría/sierras

  zoneBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      zoneBtns.forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      selectedZoneFactor = parseFloat(btn.dataset.factor || '1.0');
      calculateStoveRecommendation();
    });
  });

  if (calcAreaRange) {
    calcAreaRange.addEventListener('input', (e) => {
      if (calcAreaVal) {
        calcAreaVal.textContent = e.target.value + ' m²';
      }
      calculateStoveRecommendation();
    });
  }

  function calculateStoveRecommendation() {
    if (!calcAreaRange || !resultModelName) return;
    const area = parseInt(calcAreaRange.value, 10);
    const effectiveArea = area * selectedZoneFactor;

    let modelName = '';
    let potenciaKcal = '';
    let consumoLeña = '';
    let ambienteTexto = '';
    let waMsg = '';

    if (effectiveArea <= 80) {
      modelName = 'Estufa Hermetal H-12.000';
      potenciaKcal = '12.000 kcal/h';
      consumoLeña = '1.4 a 1.9 kg/h';
      ambienteTexto = `Ideal para tu espacio de ${area} m²`;
      waMsg = `Hola Hermetal, calculé en su web que para mi espacio de ${area} m² me corresponde la Estufa H-12.000. ¿Tienen entrega inmediata y cuál es el precio directo de fábrica?`;
    } else {
      modelName = 'Estufa Hermetal H-20.000 (Recomendada)';
      potenciaKcal = '20.000 kcal/h';
      consumoLeña = '1.8 a 2.5 kg/h';
      ambienteTexto = `Rendimiento sobrado para tus ${area} m²`;
      waMsg = `Hola Hermetal, calculé en su web que para mi espacio de ${area} m² me recomiendan la Estufa H-20.000. ¿Me pasan cotización directa de fábrica y opciones de envío?`;
    }

    resultModelName.textContent = modelName;
    if (resultPotencia) resultPotencia.textContent = potenciaKcal;
    if (resultConsumo) resultConsumo.textContent = consumoLeña;
    if (resultAmbiente) resultAmbiente.textContent = ambienteTexto;

    if (btnCalcWhatsApp) {
      btnCalcWhatsApp.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(waMsg)}`;
    }
  }

  calculateStoveRecommendation();


  /* ==========================================================================
     6. FORMULARIO DE CONTACTO DIRECTO A WHATSAPP
     ========================================================================== */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('formName')?.value.trim() || 'Cliente';
      const phone = document.getElementById('formPhone')?.value.trim() || 'No especificado';
      const city = document.getElementById('formCity')?.value.trim() || 'San Luis';
      const product = document.getElementById('formProduct')?.value || 'Estufas a Leña';
      const message = document.getElementById('formMessage')?.value.trim() || 'Deseo más información y precio de fábrica.';

      const waText = 
`*CONSULTA DIRECTA DESDE LA WEB - HERMETAL*
👤 *Nombre:* ${name}
📱 *Teléfono:* ${phone}
📍 *Localidad:* ${city}
🛠️ *Producto:* ${product}
💬 *Consulta:* ${message}`;

      const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(waText)}`;
      window.open(waUrl, '_blank');
    });
  }

  /* ==========================================================================
     7. ANIMACIONES DE SCROLL (Intersection Observer)
     ========================================================================== */
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    revealElements.forEach(el => observer.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('is-revealed'));
  }
});

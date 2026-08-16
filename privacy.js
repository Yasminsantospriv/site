(() => {
  const cfg = window.SITE_CONFIG || {};

  document.querySelectorAll("[data-link]").forEach((element) => {
    const url = cfg.links?.[element.dataset.link];
    if (url) element.href = url;
  });

  const plans = document.getElementById("plans");
  const plansToggle = document.getElementById("plansToggle");
  const plansArrow = document.getElementById("plansArrow");

  if (plans && plansToggle && plansArrow) {
    plansToggle.addEventListener("click", () => {
      const collapsed = plans.classList.toggle("collapsed");
      plansToggle.setAttribute("aria-expanded", String(!collapsed));
      plansArrow.textContent = collapsed ? "⌄" : "⌃";
    });
  }

  const postKey = "yasmin-privacy-v13-post";
  const likeButton = document.querySelector("[data-like]");
  const saveButton = document.querySelector("[data-save]");
  const shareButton = document.querySelector("[data-share]");

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(postKey) || '{"liked":false,"saved":false}');
    } catch {
      return { liked:false, saved:false };
    }
  }

  function saveState(state) {
    localStorage.setItem(postKey, JSON.stringify(state));
  }

  function renderPost() {
    const state = readState();
    if (likeButton) {
      likeButton.classList.toggle("active", state.liked);
      likeButton.setAttribute("aria-pressed", String(state.liked));
    }
    if (saveButton) {
      saveButton.classList.toggle("active", state.saved);
      saveButton.setAttribute("aria-pressed", String(state.saved));
    }
  }

  likeButton?.addEventListener("click", () => {
    const state = readState();
    state.liked = !state.liked;
    saveState(state);
    renderPost();
  });

  saveButton?.addEventListener("click", () => {
    const state = readState();
    state.saved = !state.saved;
    saveState(state);
    renderPost();
  });

  const mediaTabs = [...document.querySelectorAll("[data-media-tab]")];
  const contentPreview = document.querySelector("[data-content-preview]");
  mediaTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      mediaTabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      if (contentPreview) contentPreview.dataset.contentPreview = tab.dataset.mediaTab || "photos";
    });
  });

  const translations = {
    pt: {
      back: "Voltar", languageLabel: "Idioma", online: "● Online",
      bio: "Conteúdos exclusivos, ensaios e bastidores.<br>Live semanal • WhatsApp exclusivo • Novas fotos e vídeos.",
      photos: "Posts", videos: "Vídeos", likes: "Curtidas", likesLower: "curtidas",
      subscriptions: "Assinaturas", oneMonth: "1 mês", promotions: "Promoções",
      threeMonthsOffer: "3 meses (5% off)", sixMonthsOffer: "6 meses (16% off)",
      contentTypes: "Tipos de conteúdo", now: "Agora",
      moreOptions: "Mais opções", exclusivePreview: "Prévia exclusiva", exclusiveContent: "Conteúdo exclusivo",
      likeAction: "Curtir", shareAction: "Compartilhar", saveAction: "Salvar", close: "Fechar",
      fullName: "Nome completo", email: "E-mail", phone: "Celular com DDD", generatePix: "Gerar Pix",
      pixPayment: "Pagamento via Pix", waitingPix: "Aguardando a confirmação do Pix...",
      copyPix: "Copiar código Pix", checkPayment: "Verificar pagamento", accessHere: "Acesse aqui",
      newPix: "Gerar outro Pix", linkCopied: "Link copiado.",
      subscriberArea: "Área de assinantes", alreadySubscriber: "Já é assinante?",
      loginDescription: "Entre com sua conta para acessar o conteúdo liberado.", loginButton: "Entrar"
    },
    en: {
      back: "Back", languageLabel: "Language", online: "● Online",
      bio: "Exclusive content, photoshoots and behind the scenes.<br>Weekly live • Exclusive WhatsApp • New photos and videos.",
      photos: "Posts", videos: "Videos", likes: "Likes", likesLower: "likes",
      subscriptions: "Subscriptions", oneMonth: "1 month", promotions: "Promotions",
      threeMonthsOffer: "3 months (5% off)", sixMonthsOffer: "6 months (16% off)",
      contentTypes: "Content types", now: "Now",
      moreOptions: "More options", exclusivePreview: "Exclusive preview", exclusiveContent: "Exclusive content",
      likeAction: "Like", shareAction: "Share", saveAction: "Save", close: "Close",
      fullName: "Full name", email: "Email", phone: "Phone with area code", generatePix: "Generate Pix",
      pixPayment: "Pix payment", waitingPix: "Waiting for Pix confirmation...",
      copyPix: "Copy Pix code", checkPayment: "Check payment", accessHere: "Access here",
      newPix: "Generate another Pix", linkCopied: "Link copied.",
      subscriberArea: "Subscriber area", alreadySubscriber: "Already a subscriber?",
      loginDescription: "Sign in with your account to access your unlocked content.", loginButton: "Sign in"
    },
    es: {
      back: "Volver", languageLabel: "Idioma", online: "● En línea",
      bio: "Contenido exclusivo, sesiones y detrás de cámaras.<br>En vivo semanal • WhatsApp exclusivo • Nuevas fotos y videos.",
      photos: "Posts", videos: "Videos", likes: "Me gusta", likesLower: "me gusta",
      subscriptions: "Suscripciones", oneMonth: "1 mes", promotions: "Promociones",
      threeMonthsOffer: "3 meses (5% off)", sixMonthsOffer: "6 meses (16% off)",
      contentTypes: "Tipos de contenido", now: "Ahora",
      moreOptions: "Más opciones", exclusivePreview: "Vista previa exclusiva", exclusiveContent: "Contenido exclusivo",
      likeAction: "Me gusta", shareAction: "Compartir", saveAction: "Guardar", close: "Cerrar",
      fullName: "Nombre completo", email: "Correo electrónico", phone: "Teléfono con código de área", generatePix: "Generar Pix",
      pixPayment: "Pago por Pix", waitingPix: "Esperando la confirmación del Pix...",
      copyPix: "Copiar código Pix", checkPayment: "Verificar pago", accessHere: "Acceder aquí",
      newPix: "Generar otro Pix", linkCopied: "Enlace copiado.",
      subscriberArea: "Área de suscriptores", alreadySubscriber: "¿Ya eres suscriptor?",
      loginDescription: "Inicia sesión con tu cuenta para acceder al contenido liberado.", loginButton: "Entrar"
    }
  };

  let activeLanguage = "pt";
  const getText = (key) => translations[activeLanguage]?.[key] || translations.pt[key] || key;

  shareButton?.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title:document.title, url:window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert(getText("linkCopied"));
      }
    } catch {}
  });

  function applyLanguage(language) {
    activeLanguage = translations[language] ? language : "pt";
    document.documentElement.lang = activeLanguage === "pt" ? "pt-BR" : activeLanguage;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = getText(element.dataset.i18n);
      if (value !== undefined) element.textContent = value;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      const value = getText(element.dataset.i18nHtml);
      if (value !== undefined) element.innerHTML = value;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
      const value = getText(element.dataset.i18nAria);
      if (value !== undefined) element.setAttribute("aria-label", value);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
      const value = getText(element.dataset.i18nAlt);
      if (value !== undefined) element.setAttribute("alt", value);
    });
    document.querySelectorAll("[data-label-pt]").forEach((element) => {
      const localized = activeLanguage === "en" ? element.dataset.labelEn : activeLanguage === "es" ? element.dataset.labelEs : element.dataset.labelPt;
      if (localized) element.dataset.label = localized;
    });
    try { localStorage.setItem("yasmin-privacy-language", activeLanguage); } catch {}
  }

  const languageLaunch = document.getElementById("privacyLanguageLaunch");
  const languageModal = document.getElementById("privacyLanguageModal");
  const languageOptions = [...document.querySelectorAll("[data-language-option]")];

  function renderLanguageSelection() {
    languageOptions.forEach((button) => {
      const active = button.dataset.languageOption === activeLanguage;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function openLanguageModal() {
    if (!languageModal) return;
    languageModal.classList.add("open");
    languageModal.setAttribute("aria-hidden", "false");
    languageLaunch?.setAttribute("aria-expanded", "true");
    document.body.classList.add("privacy-language-open");
    languageOptions.find((button) => button.dataset.languageOption === activeLanguage)?.focus();
  }

  function closeLanguageModal() {
    if (!languageModal) return;
    languageModal.classList.remove("open");
    languageModal.setAttribute("aria-hidden", "true");
    languageLaunch?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("privacy-language-open");
  }

  let savedLanguage = "pt";
  try { savedLanguage = localStorage.getItem("yasmin-privacy-language") || "pt"; } catch {}
  if (!translations[savedLanguage]) savedLanguage = "pt";

  languageLaunch?.addEventListener("click", openLanguageModal);
  languageModal?.querySelectorAll("[data-close-language-modal]").forEach((element) => {
    element.addEventListener("click", closeLanguageModal);
  });
  languageOptions.forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(button.dataset.languageOption);
      renderLanguageSelection();
      closeLanguageModal();
      languageLaunch?.focus();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && languageModal?.classList.contains("open")) {
      closeLanguageModal();
      languageLaunch?.focus();
    }
  });

  applyLanguage(savedLanguage);
  renderLanguageSelection();
  renderPost();
})();

(() => {
  const modal = document.getElementById("profileImageModal");
  const preview = document.getElementById("profileImagePreview");
  if (!modal || !preview) return;
  function openImage(src) {
    preview.src = src;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }
  function closeImage() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    preview.src = "";
  }
  document.querySelectorAll("[data-open-profile-image]").forEach((button) => button.addEventListener("click", () => openImage(button.dataset.openProfileImage)));
  modal.querySelectorAll("[data-close-profile-image]").forEach((element) => element.addEventListener("click", closeImage));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("open")) closeImage();
  });
})();

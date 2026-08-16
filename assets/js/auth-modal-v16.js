
(() => {
  "use strict";
  const cfg = window.YASMIN_APP_CONFIG || {};
  const apiBase = String(cfg.apiBase || "").replace(/\/$/, "");
  const sessionKey = cfg.storageKeys?.subscriberSession || "yasmin_subscriber_session_v136";
  const adminSessionKey = cfg.storageKeys?.adminSession || "yasmin_admin_session_v136";
  let activeContext = "site";

  const readSession = () => {
    try {
      const data = JSON.parse(localStorage.getItem(sessionKey) || "null");
      if (!data?.token || Date.parse(data.expiresAt) <= Date.now()) return null;
      return data;
    } catch { return null; }
  };
  const saveSession = data => localStorage.setItem(sessionKey, JSON.stringify(data));
  const api = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const current = readSession();
    if (current?.token) headers.set("Authorization", `Bearer ${current.token}`);
    const response = await fetch(`${apiBase}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.erro || "Não foi possível concluir.");
    return data;
  };
  const modal = document.querySelector("[data-login-modal]");
  if (!modal) return;
  const form = modal.querySelector("[data-login-form]");
  const message = modal.querySelector("[data-login-message]");
  const submit = modal.querySelector("[data-login-submit]");

  const showMessage = (text = "") => {
    message.textContent = text;
    message.hidden = !text;
  };
  const close = () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    showMessage("");
  };
  const open = context => {
    activeContext = context === "privacy" ? "privacy" : "site";
    modal.dataset.theme = activeContext === "privacy" ? "privacy" : "site";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    setTimeout(() => form?.querySelector("input")?.focus(), 120);
  };

  async function deliverAfterLogin() {
    if (activeContext === "privacy") {
      const telegram = await api("/api/conta/telegram");
      location.href = telegram.telegramUrl;
      return;
    }
    location.href = `${String(cfg.siteBase || "").replace(/\/$/, "")}/area-assinante/`;
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    showMessage("");
    submit.disabled = true;
    submit.textContent = "Entrando…";
    try {
      const turnstileToken = await window.YasminTurnstile?.token(form, "subscriber_login") || "";
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identificador: form.elements.identificador.value,
          senha: form.elements.senha.value,
          turnstileToken
        })
      });
      if (data.tipo === "admin") {
        localStorage.setItem(adminSessionKey, JSON.stringify(data.sessao));
        showMessage("Modo administrador ativado.");
        setTimeout(() => location.reload(), 180);
        return;
      }
      saveSession(data.sessao);
      await deliverAfterLogin();
    } catch (error) {
      window.YasminTurnstile?.reset(form);
      showMessage(error.message || "Não foi possível entrar.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  });

  window.YasminTurnstile?.mount(form, "subscriber_login");

  document.querySelectorAll("[data-open-login-modal]").forEach(button => {
    button.addEventListener("click", async () => {
      const context = button.dataset.loginContext || (document.body.classList.contains("privacy-v13-3") ? "privacy" : "site");
      activeContext = context;
      if (readSession()) {
        try { await deliverAfterLogin(); return; } catch {}
      }
      open(context);
    });
  });
  modal.querySelectorAll("[data-close-login-modal]").forEach(node => node.addEventListener("click", close));
  document.addEventListener("keydown", event => { if (event.key === "Escape" && modal.classList.contains("open")) close(); });
  modal.querySelector("[data-password-help]")?.addEventListener("click", () => showMessage("A recuperação automática ainda será configurada. Use o suporte para redefinir sua senha."));
  modal.querySelector("[data-support-help]")?.addEventListener("click", () => {
    const url = String(cfg.supportUrl || "").trim();
    if (url) location.href = url;
    else showMessage("O contato do suporte ainda não foi configurado.");
  });
})();

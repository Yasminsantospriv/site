(() => {
  "use strict";

  const cfg = window.YASMIN_APP_CONFIG || {};
  const apiBase = String(cfg.apiBase || "https://yasmin-backend.novinhadize9.workers.dev").replace(/\/$/, "");
  const siteBase = String(cfg.siteBase || "https://yasminsantospriv.github.io/site").replace(/\/$/, "");
  const sessionKey = cfg.storageKeys?.adminSession || "yasmin_admin_session_v136";
  const modeKey = cfg.storageKeys?.editorMode || "yasmin_admin_editor_mode_v17";
  const slotPrefix = "editor_media_";
  let publicData = { configuracoes: {}, conteudos: [] };
  let adminSession = null;
  let activeTarget = null;
  let editMode = localStorage.getItem(modeKey) !== "off";
  let observerTimer = null;

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const normalizeSlot = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "").slice(0, 58);
  const pageKey = () => {
    const part = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop() || "inicio";
    return normalizeSlot(part === "site" ? "inicio" : part);
  };
  const readSession = () => {
    try {
      const value = JSON.parse(localStorage.getItem(sessionKey) || "null");
      return value?.token && Date.parse(value.expiresAt) > Date.now() ? value : null;
    } catch { return null; }
  };
  const authHeaders = () => adminSession?.token ? { Authorization: `Bearer ${adminSession.token}` } : {};

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (adminSession?.token) headers.set("Authorization", `Bearer ${adminSession.token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(`${apiBase}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.erro || `Falha HTTP ${response.status}.`);
    return data;
  }

  function autoAssignSlots() {
    const key = pageKey();
    const images = [...document.querySelectorAll("img:not([data-admin-ignore])")];
    images.forEach((img, index) => {
      if (!img.dataset.adminSlot) img.dataset.adminSlot = `${key}_imagem_${index + 1}`;
      img.dataset.adminKind = "image";
    });
    document.querySelectorAll("[data-admin-kind='background'],[data-admin-background]").forEach((el, index) => {
      if (!el.dataset.adminSlot) el.dataset.adminSlot = `${key}_fundo_${index + 1}`;
      el.dataset.adminKind = "background";
    });
  }

  function contentUrl(contentId) {
    const item = (publicData.conteudos || []).find(row => row.content_id === contentId);
    return item?.mediaUrl || `${apiBase}/api/media/public/${encodeURIComponent(contentId)}`;
  }

  function clearSlotTarget(target) {
    if (!target) return;
    target.classList.add("yasmin-r2-empty");
    target.dataset.adminCurrentUrl = "";
    if (target.tagName === "IMG") {
      target.removeAttribute("src");
      const opener = target.closest("[data-open-instagram-image],[data-open-profile-image]");
      if (opener?.hasAttribute("data-open-instagram-image")) opener.dataset.openInstagramImage = "";
      if (opener?.hasAttribute("data-open-profile-image")) opener.dataset.openProfileImage = "";
    } else {
      target.style.backgroundImage = "none";
    }
    if (target.dataset.adminSlot === "home_cover") document.body.style.setProperty("--yasmin-home-cover", "none");
  }

  function applySlotToTarget(target, url) {
    if (!target || !url) return clearSlotTarget(target);
    target.classList.remove("yasmin-r2-empty");
    const kind = target.dataset.adminKind || (target.tagName === "IMG" ? "image" : "background");
    if (kind === "background") {
      target.style.backgroundImage = `url("${url.replace(/"/g, "%22")}")`;
      target.dataset.adminCurrentUrl = url;
    } else if (target.tagName === "IMG") {
      target.src = url;
      target.dataset.adminCurrentUrl = url;
      const opener = target.closest("[data-open-instagram-image],[data-open-profile-image]");
      if (opener?.hasAttribute("data-open-instagram-image")) opener.dataset.openInstagramImage = url;
      if (opener?.hasAttribute("data-open-profile-image")) opener.dataset.openProfileImage = url;
    }
    if (target.dataset.adminSlot === "home_cover") {
      document.body.style.setProperty("--yasmin-home-cover", `url("${url.replace(/"/g, "%22")}")`);
    }
  }

  function applySavedMedia() {
    autoAssignSlots();
    document.querySelectorAll("[data-admin-slot]").forEach(target => {
      const slot = normalizeSlot(target.dataset.adminSlot);
      const setting = publicData.configuracoes?.[`${slotPrefix}${slot}`];
      if (setting?.contentId) applySlotToTarget(target, contentUrl(setting.contentId));
      else clearSlotTarget(target);
    });
  }

  async function loadPublicData() {
    try {
      const response = await fetch(`${apiBase}/api/publico/conteudos`, { headers: { Accept: "application/json" }, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) publicData = data;
    } catch (error) {
      console.warn("Editor: configurações públicas indisponíveis", error);
    }
    applySavedMedia();
  }

  function injectStyles() {
    if (document.getElementById("yasmin-admin-editor-style")) return;
    const style = document.createElement("style");
    style.id = "yasmin-admin-editor-style";
    style.textContent = `
      .yasmin-admin-toolbar{position:fixed;left:50%;bottom:18px;z-index:2147483000;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:9px 10px;border:1px solid rgba(255,255,255,.25);border-radius:999px;color:#fff;background:rgba(13,15,20,.92);box-shadow:0 18px 55px rgba(0,0,0,.45);backdrop-filter:blur(18px);font:600 12px/1 Inter,Arial,sans-serif}.yasmin-admin-toolbar button,.yasmin-admin-toolbar a{min-height:34px;display:inline-flex;align-items:center;justify-content:center;padding:0 13px;border:0;border-radius:999px;color:#fff;background:#242833;text-decoration:none;font:inherit;cursor:pointer}.yasmin-admin-toolbar .primary{background:linear-gradient(135deg,#ff8a3d,#e85179)}.yasmin-admin-toolbar .danger{background:#4b2028}.yasmin-admin-toolbar-status{padding:0 5px;color:#b9c0cc;white-space:nowrap}.yasmin-admin-host{position:relative!important}.yasmin-admin-edit-button{position:absolute!important;top:6px!important;right:6px!important;z-index:2147482000!important;width:34px!important;height:34px!important;display:grid!important;place-items:center!important;padding:0!important;border:1px solid rgba(255,255,255,.55)!important;border-radius:50%!important;color:#fff!important;background:rgba(12,14,18,.82)!important;box-shadow:0 8px 24px rgba(0,0,0,.38)!important;font:800 18px/1 Arial,sans-serif!important;cursor:pointer!important;opacity:0;transform:scale(.9);transition:.16s}.yasmin-admin-editing .yasmin-admin-edit-button{opacity:1;transform:scale(1)}.yasmin-admin-edit-button:hover{background:#ff734f!important}.yasmin-admin-modal{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:20px}.yasmin-admin-modal[hidden]{display:none!important}.yasmin-admin-modal-bg{position:absolute;inset:0;background:rgba(0,0,0,.76);backdrop-filter:blur(10px)}.yasmin-admin-modal-card{position:relative;z-index:1;width:min(460px,96vw);padding:24px;border:1px solid rgba(255,255,255,.18);border-radius:22px;color:#f8f8fa;background:#171a21;box-shadow:0 30px 90px rgba(0,0,0,.55);font:14px/1.45 Inter,Arial,sans-serif}.yasmin-admin-modal-card h2{margin:0 0 6px;font-size:1.25rem}.yasmin-admin-modal-card p{margin:0 0 16px;color:#aeb5c2}.yasmin-admin-preview{height:220px;display:grid;place-items:center;margin:14px 0;border-radius:15px;overflow:hidden;background:#0d0f14}.yasmin-admin-preview img{width:100%;height:100%;object-fit:contain}.yasmin-admin-file{width:100%;box-sizing:border-box;padding:12px;border:1px dashed #596171;border-radius:12px;color:#dce0e7;background:#101218}.yasmin-admin-modal-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px}.yasmin-admin-modal-actions button{flex:1;min-width:110px;min-height:42px;border:0;border-radius:11px;color:#fff;background:#2d3340;font-weight:700;cursor:pointer}.yasmin-admin-modal-actions .save{background:linear-gradient(135deg,#ff8a3d,#e85179)}.yasmin-admin-modal-actions .restore{background:#532832}.yasmin-admin-editor-message{min-height:20px;margin-top:10px;color:#9ee6b2}.yasmin-admin-editor-message.error{color:#ff9d9d}@media(max-width:680px){.yasmin-admin-toolbar{left:10px;right:10px;bottom:10px;transform:none;justify-content:center;flex-wrap:wrap;border-radius:18px}.yasmin-admin-toolbar-status{width:100%;text-align:center}.yasmin-admin-edit-button{opacity:1;transform:none}}
    `;
    document.head.append(style);
  }

  function ensureModal() {
    if (document.getElementById("yasmin-admin-editor-modal")) return;
    const modal = document.createElement("div");
    modal.id = "yasmin-admin-editor-modal";
    modal.className = "yasmin-admin-modal";
    modal.hidden = true;
    modal.innerHTML = `<div class="yasmin-admin-modal-bg" data-editor-close></div><section class="yasmin-admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="yasmin-editor-title"><h2 id="yasmin-editor-title">Alterar imagem</h2><p data-editor-slot-label></p><div class="yasmin-admin-preview"><img data-admin-ignore="true" data-editor-preview alt="Prévia"></div><input class="yasmin-admin-file" data-editor-file type="file" accept=".jpg,.jpeg,.png,.webp,.gif"><div class="yasmin-admin-editor-message" data-editor-message></div><div class="yasmin-admin-modal-actions"><button type="button" data-editor-close>Cancelar</button><button class="restore" type="button" data-editor-restore>Remover imagem</button><button class="save" type="button" data-editor-save>Enviar e aplicar</button></div></section>`;
    document.body.append(modal);
    modal.querySelectorAll("[data-editor-close]").forEach(el => el.addEventListener("click", closeModal));
    modal.querySelector("[data-editor-file]").addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file) modal.querySelector("[data-editor-preview]").src = URL.createObjectURL(file);
    });
    modal.querySelector("[data-editor-save]").addEventListener("click", saveImage);
    modal.querySelector("[data-editor-restore]").addEventListener("click", restoreImage);
  }

  function openModal(target) {
    activeTarget = target;
    const modal = document.getElementById("yasmin-admin-editor-modal");
    const slot = normalizeSlot(target.dataset.adminSlot);
    modal.querySelector("[data-editor-slot-label]").textContent = `Posição: ${slot.replace(/_/g, " ")}`;
    modal.querySelector("[data-editor-file]").value = "";
    modal.querySelector("[data-editor-message]").textContent = "";
    const current = target.dataset.adminCurrentUrl || (target.tagName === "IMG" ? target.currentSrc || target.src : getComputedStyle(target).backgroundImage.replace(/^url\(["']?|["']?\)$/g, ""));
    modal.querySelector("[data-editor-preview]").src = current || "";
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
  }

  function closeModal() {
    const modal = document.getElementById("yasmin-admin-editor-modal");
    if (modal) modal.hidden = true;
    document.documentElement.style.overflow = "";
    activeTarget = null;
  }

  function editorMessage(text, error = false) {
    const el = document.querySelector("[data-editor-message]");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("error", error);
  }

  async function saveImage() {
    if (!activeTarget) return;
    const modal = document.getElementById("yasmin-admin-editor-modal");
    const file = modal.querySelector("[data-editor-file]").files?.[0];
    if (!file) return editorMessage("Selecione uma imagem primeiro.", true);
    const button = modal.querySelector("[data-editor-save]");
    button.disabled = true;
    button.textContent = "Enviando…";
    try {
      const form = new FormData();
      form.append("chave", normalizeSlot(activeTarget.dataset.adminSlot));
      form.append("arquivo", file);
      const data = await api("/api/admin/editor/imagem", { method: "POST", body: form });
      applySlotToTarget(activeTarget, data.mediaUrl);
      publicData.configuracoes[`${slotPrefix}${data.chave}`] = { contentId: data.contentId };
      publicData.conteudos.push({ content_id: data.contentId, mediaUrl: data.mediaUrl });
      editorMessage("Imagem atualizada com sucesso.");
      setTimeout(closeModal, 650);
    } catch (error) {
      editorMessage(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "Enviar e aplicar";
    }
  }

  async function restoreImage() {
    if (!activeTarget) return;
    const slot = normalizeSlot(activeTarget.dataset.adminSlot);
    if (!confirm("Remover a imagem deste espaço? Ele ficará vazio até você enviar outra.")) return;
    try {
      await api(`/api/admin/editor/imagem?chave=${encodeURIComponent(slot)}`, { method: "DELETE" });
      delete publicData.configuracoes[`${slotPrefix}${slot}`];
      location.reload();
    } catch (error) {
      editorMessage(error.message, true);
    }
  }

  function addEditButtons() {
    autoAssignSlots();
    document.querySelectorAll("[data-admin-slot]").forEach(target => {
      if (target.dataset.adminButtonAttached === "1") return;
      if (target.dataset.adminIgnore === "true") return;
      if (target.closest("#postModal,.ig-post-grid,.ig-highlight-row,.ig-admin-publish-modal,.ig-admin-post-editor-modal,.ig-admin-highlight-modal")) return;
      const host = target.dataset.adminKind === "background" ? target : target.parentElement;
      if (!host || host.closest(".yasmin-admin-toolbar,.yasmin-admin-modal")) return;
      target.dataset.adminButtonAttached = "1";
      host.classList.add("yasmin-admin-host");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "yasmin-admin-edit-button";
      button.textContent = "⋯";
      button.title = "Alterar esta imagem";
      button.setAttribute("aria-label", "Alterar esta imagem");
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openModal(target);
      });
      host.append(button);
    });
  }

  function setEditMode(enabled) {
    editMode = Boolean(enabled);
    localStorage.setItem(modeKey, editMode ? "on" : "off");
    document.body.classList.toggle("yasmin-admin-editing", editMode);
    const toggle = document.querySelector("[data-editor-toggle]");
    if (toggle) toggle.textContent = editMode ? "Visualizar como visitante" : "Ativar edição";
    if (editMode) addEditButtons();
  }

  function createToolbar(admin) {
    injectStyles();
    ensureModal();
    const toolbar = document.createElement("div");
    toolbar.className = "yasmin-admin-toolbar";
    toolbar.innerHTML = `<span class="yasmin-admin-toolbar-status">Administrador: ${escapeHtml(admin?.email || "sessão ativa")}</span><button class="primary" type="button" data-editor-toggle></button><a href="${escapeHtml(siteBase)}/admin/">Painel</a><button class="danger" type="button" data-editor-logout>Sair</button>`;
    document.body.append(toolbar);
    toolbar.querySelector("[data-editor-toggle]").addEventListener("click", () => setEditMode(!editMode));
    toolbar.querySelector("[data-editor-logout]").addEventListener("click", async () => {
      try { await api("/api/admin/logout", { method: "POST" }); } catch {}
      localStorage.removeItem(sessionKey);
      location.reload();
    });
    setEditMode(editMode);
  }

  async function verifyAdmin() {
    adminSession = readSession();
    if (!adminSession) return;
    try {
      const data = await api("/api/admin/me");
      createToolbar(data.administrador);
    } catch {
      localStorage.removeItem(sessionKey);
      adminSession = null;
    }
  }

  function watchDynamicContent() {
    const observer = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        applySavedMedia();
        if (adminSession && editMode) addEditButtons();
      }, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await loadPublicData();
    await verifyAdmin();
    watchDynamicContent();
  });
})();

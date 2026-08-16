(() => {
  "use strict";

  const cfg = window.YASMIN_APP_CONFIG || {};
  const apiBase = String(cfg.apiBase || "https://yasmin-backend.novinhadize9.workers.dev").replace(/\/$/, "");
  const sessionKey = cfg.storageKeys?.adminSession || "yasmin_admin_session_v136";
  const slotPrefix = "editor_media_";
  let state = { configuracoes: {}, conteudos: [] };
  let posts = [];
  let currentPost = 0;
  let adminSession = null;
  let adminVerified = false;
  let adminEditingRow = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const normalizeSlot = value => String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "").slice(0, 58);

  function readAdminSession() {
    try {
      const value = JSON.parse(localStorage.getItem(sessionKey) || "null");
      return value?.token && Date.parse(value.expiresAt) > Date.now() ? value : null;
    } catch { return null; }
  }

  function adminCreateButtons() {
    const found = new Set($$("[data-instagram-admin-add]"));
    const desktopCreate = $(".ig-desktop-sidebar button[title='Criar']");
    if (desktopCreate) {
      desktopCreate.dataset.instagramAdminAdd = "";
      found.add(desktopCreate);
    }
    $$(".ig-mobile-bottom-nav button").forEach(button => {
      const text = String(button.textContent || "").trim();
      if (["⊞", "＋", "+"].includes(text)) {
        button.dataset.instagramAdminAdd = "";
        found.add(button);
      }
    });
    return [...found];
  }

  function lockAdminInstagramUi() {
    adminCreateButtons().forEach(button => {
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
      button.tabIndex = -1;
      button.style.setProperty("display", "none", "important");
    });
    const editCurrent = $("#igAdminEditCurrentPost");
    if (editCurrent) editCurrent.hidden = true;
  }

  function unlockAdminInstagramUi() {
    adminCreateButtons().forEach(button => {
      button.hidden = false;
      button.setAttribute("aria-hidden", "false");
      button.removeAttribute("tabindex");
      button.style.removeProperty("display");
    });
    const editCurrent = $("#igAdminEditCurrentPost");
    if (editCurrent) editCurrent.hidden = false;
  }

  function ensureAdminFixStyles() {
    if ($("#yasmin-instagram-admin-fix-style")) return;
    const style = document.createElement("style");
    style.id = "yasmin-instagram-admin-fix-style";
    style.textContent = `
      [data-instagram-admin-add][hidden]{display:none!important}
      .post-modal.open{z-index:2147483400!important}
      .post-modal .yasmin-admin-edit-button{display:none!important}
      .ig-admin-current-post-edit{margin-left:auto;border:0;border-radius:9px;padding:8px 11px;background:#262b33;color:#fff;font:700 12px/1 Inter,Arial,sans-serif;cursor:pointer}
      .ig-admin-current-post-edit[hidden]{display:none!important}
      .ig-admin-post-editor-modal{position:fixed;inset:0;z-index:2147483900;display:grid;place-items:center;padding:18px}
      .ig-admin-post-editor-modal[hidden]{display:none!important}
      .ig-admin-post-editor-bg{position:absolute;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(9px)}
      .ig-admin-post-editor-card{position:relative;z-index:1;width:min(470px,96vw);max-height:92vh;overflow:auto;padding:22px;border:1px solid rgba(255,255,255,.18);border-radius:20px;color:#f7f7f8;background:#171a21;box-shadow:0 28px 80px rgba(0,0,0,.55);font:14px/1.45 Inter,Arial,sans-serif}
      .ig-admin-post-editor-card h2{margin:0 0 6px}.ig-admin-post-editor-card p{margin:0 0 14px;color:#aeb5c2}
      .ig-admin-post-editor-preview{width:100%;max-height:300px;object-fit:contain;border-radius:14px;background:#0b0d11;margin:4px 0 14px}
      .ig-admin-post-editor-card input,.ig-admin-post-editor-card textarea{width:100%;box-sizing:border-box;margin:7px 0;padding:11px;border:1px solid #3c4350;border-radius:10px;color:#fff;background:#101218;font:inherit}
      .ig-admin-post-editor-card textarea{min-height:88px;resize:vertical}
      .ig-admin-post-editor-message{min-height:20px;margin-top:8px;color:#9ee6b2}.ig-admin-post-editor-message.error{color:#ff9d9d}
      .ig-admin-post-editor-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.ig-admin-post-editor-actions button{flex:1;min-width:105px;min-height:40px;border:0;border-radius:10px;color:#fff;background:#2d3340;font-weight:750;cursor:pointer}.ig-admin-post-editor-actions .save{background:linear-gradient(135deg,#ff8a3d,#e85179)}.ig-admin-post-editor-actions .delete{background:#5a242c}
    `;
    document.head.append(style);
  }

  async function verifyAdminAccess() {
    const fresh = readAdminSession();
    if (!fresh) {
      adminSession = null;
      adminVerified = false;
      lockAdminInstagramUi();
      return false;
    }
    adminSession = fresh;
    try {
      await adminApi("/api/admin/me");
      adminVerified = true;
      return true;
    } catch {
      adminSession = null;
      adminVerified = false;
      localStorage.removeItem(sessionKey);
      lockAdminInstagramUi();
      return false;
    }
  }

  async function adminApi(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (adminSession?.token) headers.set("Authorization", `Bearer ${adminSession.token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(`${apiBase}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      adminVerified = false;
      lockAdminInstagramUi();
    }
    if (!response.ok) throw new Error(data.erro || `Falha HTTP ${response.status}.`);
    return data;
  }

  function mediaUrl(contentId) {
    const item = (state.conteudos || []).find(row => row.content_id === contentId);
    return item?.mediaUrl || `${apiBase}/api/media/public/${encodeURIComponent(contentId)}`;
  }

  function clearSlot(target) {
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
    if (target.dataset.adminSlot === "home_cover") {
      document.body.style.setProperty("--yasmin-home-cover", "none");
    }
  }

  function applySlot(target, url) {
    if (!target || !url) return clearSlot(target);
    target.classList.remove("yasmin-r2-empty");
    target.dataset.adminCurrentUrl = url;
    const kind = target.dataset.adminKind || (target.tagName === "IMG" ? "image" : "background");
    if (kind === "background") {
      target.style.backgroundImage = `url("${String(url).replace(/"/g, "%22")}")`;
    } else if (target.tagName === "IMG") {
      target.src = url;
      const opener = target.closest("[data-open-instagram-image],[data-open-profile-image]");
      if (opener?.hasAttribute("data-open-instagram-image")) opener.dataset.openInstagramImage = url;
      if (opener?.hasAttribute("data-open-profile-image")) opener.dataset.openProfileImage = url;
    }
    if (target.dataset.adminSlot === "home_cover") {
      document.body.style.setProperty("--yasmin-home-cover", `url("${String(url).replace(/"/g, "%22")}")`);
    }
  }

  function applySlots() {
    $$("[data-admin-slot]").forEach(target => {
      if (target.dataset.adminIgnore === "true") return;
      const slot = normalizeSlot(target.dataset.adminSlot);
      const setting = state.configuracoes?.[`${slotPrefix}${slot}`];
      if (setting?.contentId) applySlot(target, mediaUrl(setting.contentId));
      else clearSlot(target);
    });
  }

  function actualInstagramPosts() {
    const normal = (state.conteudos || [])
      .filter(item => item.section === "instagram_posts" && String(item.mime_type || "").startsWith("image/"))
      .sort((a, b) => {
        const order = Number(a.sort_order || 0) - Number(b.sort_order || 0);
        return order || String(b.created_at || "").localeCompare(String(a.created_at || ""));
      });

    // Preserva fotos da versão anterior que já estavam salvas no R2 como slots.
    const used = new Set(normal.map(item => item.content_id));
    const legacy = [];
    for (let index = 1; index <= 24; index += 1) {
      const setting = state.configuracoes?.[`${slotPrefix}instagram_publicacao_${index}`];
      if (!setting?.contentId || used.has(setting.contentId)) continue;
      const item = (state.conteudos || []).find(row => row.content_id === setting.contentId);
      if (item) legacy.push({ ...item, section: "instagram_posts", caption: item.caption || "", legacy: true });
    }
    return [...normal, ...legacy];
  }

  function updateInstagramCounts(total) {
    $$("[data-instagram-post-count]").forEach(el => el.textContent = String(total));
    $$("[data-instagram-home-count]").forEach(el => el.textContent = `${total} publicações • 12,8 mil seguidores`);
  }

  function renderHomeInstagram() {
    const grid = $("#homeInstagramPosts");
    if (!grid) return;
    grid.replaceChildren();
    const visible = posts.slice(0, 6);
    visible.forEach((post, index) => {
      const link = document.createElement("a");
      link.href = "instagram/";
      const img = document.createElement("img");
      img.src = post.mediaUrl;
      img.alt = `Publicação ${index + 1}`;
      img.loading = "lazy";
      img.dataset.adminIgnore = "true";
      link.append(img);
      grid.append(link);
    });
    for (let index = visible.length; index < 6; index += 1) {
      const empty = document.createElement("span");
      empty.className = "ig-empty-post";
      empty.setAttribute("aria-hidden", "true");
      grid.append(empty);
    }
  }

  const postKey = id => `yasmin-post-${id}`;
  function readPostState(id) {
    try { return JSON.parse(localStorage.getItem(postKey(id)) || '{"liked":false,"saved":false,"likes":0,"comments":[]}'); }
    catch { return { liked:false, saved:false, likes:0, comments:[] }; }
  }
  function savePostState(id, data) { localStorage.setItem(postKey(id), JSON.stringify(data)); }

  function renderPostModal() {
    const post = posts[currentPost];
    if (!post) return;
    const img = $("#postImage");
    const comments = $("#postComments");
    const likeBtn = $("#likePost");
    const saveBtn = $("#savePost");
    const likeCount = $("#likeCount");
    if (!img || !comments || !likeBtn || !saveBtn || !likeCount) return;

    img.src = post.mediaUrl;
    ensureAdminCurrentPostButton();
    const adminEdit = $("#igAdminEditCurrentPost");
    if (adminEdit) adminEdit.hidden = !adminVerified;
    const local = readPostState(post.content_id);
    likeBtn.classList.toggle("active", local.liked);
    likeBtn.textContent = local.liked ? "♥" : "♡";
    saveBtn.classList.toggle("active", local.saved);
    saveBtn.textContent = local.saved ? "◆" : "◇";
    likeCount.textContent = String(184 + currentPost * 13 + Number(local.likes || 0));
    comments.replaceChildren();

    const appendComment = (handle, text) => {
      const row = document.createElement("div");
      row.className = "comment-row";
      const strong = document.createElement("strong");
      strong.textContent = handle;
      row.append(strong, document.createTextNode(` ${String(text || "")}`));
      comments.append(row);
    };
    appendComment("@yasminsantos", post.caption || "Nova publicação");
    (local.comments || []).forEach(comment => appendComment(comment.handle, comment.text));
  }

  function openPost(index) {
    if (!posts.length) return;
    currentPost = Math.max(0, Math.min(index, posts.length - 1));
    renderPostModal();
    const modal = $("#postModal");
    modal?.classList.add("open");
    modal?.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    document.body.classList.add("ig-post-modal-open");
  }

  function closePost() {
    const modal = $("#postModal");
    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    document.body.classList.remove("ig-post-modal-open");
  }

  function bindPostModalOnce() {
    const modal = $("#postModal");
    if (!modal || modal.dataset.r2Bound === "1") return;
    modal.dataset.r2Bound = "1";
    ensureAdminCurrentPostButton();
    $$("[data-close-post]").forEach(el => el.addEventListener("click", closePost));
    $("#postPrev")?.addEventListener("click", () => {
      if (!posts.length) return;
      currentPost = (currentPost - 1 + posts.length) % posts.length;
      renderPostModal();
    });
    $("#postNext")?.addEventListener("click", () => {
      if (!posts.length) return;
      currentPost = (currentPost + 1) % posts.length;
      renderPostModal();
    });
    $("#likePost")?.addEventListener("click", () => {
      const post = posts[currentPost]; if (!post) return;
      const data = readPostState(post.content_id);
      data.liked = !data.liked;
      data.likes = Number(data.likes || 0) + (data.liked ? 1 : -1);
      savePostState(post.content_id, data); renderPostModal();
    });
    $("#savePost")?.addEventListener("click", () => {
      const post = posts[currentPost]; if (!post) return;
      const data = readPostState(post.content_id);
      data.saved = !data.saved;
      savePostState(post.content_id, data); renderPostModal();
    });
    $("#focusComment")?.addEventListener("click", () => $("#commentHandle")?.focus());
    $("#sharePost")?.addEventListener("click", async () => {
      try {
        if (navigator.share) await navigator.share({ title: document.title, url: location.href });
        else { await navigator.clipboard.writeText(location.href); alert("Link copiado."); }
      } catch {}
    });
    $("#postCommentForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const post = posts[currentPost]; if (!post) return;
      let handle = String($("#commentHandle")?.value || "").trim();
      const text = String($("#commentText")?.value || "").trim();
      if (!handle.startsWith("@")) handle = `@${handle}`;
      const data = readPostState(post.content_id);
      data.comments = Array.isArray(data.comments) ? data.comments : [];
      data.comments.push({ handle, text });
      savePostState(post.content_id, data);
      event.currentTarget.reset();
      renderPostModal();
    });
  }

  function renderInstagramProfile() {
    const grid = $("#igPublications");
    if (!grid) return;
    bindPostModalOnce();
    grid.replaceChildren();

    posts.forEach((post, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.postIndex = String(index);
      const img = document.createElement("img");
      img.src = post.mediaUrl;
      img.alt = `Publicação ${index + 1}`;
      img.loading = "lazy";
      img.dataset.adminIgnore = "true";
      button.append(img);
      button.addEventListener("click", () => openPost(index));
      grid.append(button);
    });

    if (!posts.length) {
      const empty = document.createElement("div");
      empty.className = "ig-empty-profile";
      empty.textContent = "Nenhuma publicação ainda.";
      grid.append(empty);
    }
  }

  function bindPreviewPaywall() {
    $$("[data-preview-paywall]").forEach(slide => {
      if (slide.dataset.paywallBound === "1") return;
      slide.dataset.paywallBound = "1";
      slide.tabIndex = 0;
      slide.setAttribute("role", "button");
      slide.setAttribute("aria-label", "Ver planos para desbloquear o conteúdo");
      const open = () => document.querySelector("[data-payment-open-plans]")?.click();
      slide.addEventListener("click", open);
      slide.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
      });
    });
  }

  function bindPreviewArrows() {
    const carousel = $("[data-preview-carousel]");
    if (!carousel) return;
    const move = direction => carousel.scrollBy({ left: direction * carousel.clientWidth, behavior: "smooth" });
    $("[data-carousel-prev]")?.addEventListener("click", () => move(-1));
    $("[data-carousel-next]")?.addEventListener("click", () => move(1));
  }

  function ensureAdminCurrentPostButton() {
    const header = $("#postModal .post-side > header");
    if (!header || $("#igAdminEditCurrentPost")) return;
    const button = document.createElement("button");
    button.id = "igAdminEditCurrentPost";
    button.type = "button";
    button.className = "ig-admin-current-post-edit";
    button.textContent = "Alterar foto";
    button.hidden = true;
    button.addEventListener("click", openAdminCurrentPostEditor);
    header.append(button);
  }

  function ensureAdminPostEditorModal() {
    if ($("#yasmin-instagram-post-editor")) return;
    const modal = document.createElement("div");
    modal.id = "yasmin-instagram-post-editor";
    modal.className = "ig-admin-post-editor-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="ig-admin-post-editor-bg" data-ig-post-editor-close></div>
      <section class="ig-admin-post-editor-card" role="dialog" aria-modal="true" aria-label="Alterar publicação do Instagram">
        <h2>Alterar publicação</h2>
        <p>Troque somente esta foto ou atualize a legenda.</p>
        <img class="ig-admin-post-editor-preview" data-ig-post-editor-preview alt="Prévia da publicação">
        <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" data-ig-post-editor-file>
        <textarea maxlength="2000" placeholder="Legenda (opcional)" data-ig-post-editor-caption></textarea>
        <div class="ig-admin-post-editor-message" data-ig-post-editor-message></div>
        <div class="ig-admin-post-editor-actions">
          <button type="button" data-ig-post-editor-close>Cancelar</button>
          <button type="button" class="delete" data-ig-post-editor-delete>Excluir</button>
          <button type="button" class="save" data-ig-post-editor-save>Salvar</button>
        </div>
      </section>`;
    document.body.append(modal);
    $$("[data-ig-post-editor-close]", modal).forEach(el => el.addEventListener("click", closeAdminCurrentPostEditor));
    $("[data-ig-post-editor-save]", modal)?.addEventListener("click", saveAdminCurrentPost);
    $("[data-ig-post-editor-delete]", modal)?.addEventListener("click", deleteAdminCurrentPost);
    $("[data-ig-post-editor-file]", modal)?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file) $("[data-ig-post-editor-preview]", modal).src = URL.createObjectURL(file);
    });
  }

  function closeAdminCurrentPostEditor() {
    const modal = $("#yasmin-instagram-post-editor");
    if (modal) modal.hidden = true;
    adminEditingRow = null;
  }

  async function openAdminCurrentPostEditor() {
    if (!(await verifyAdminAccess())) return;
    const post = posts[currentPost];
    if (!post) return;
    ensureAdminPostEditorModal();
    const modal = $("#yasmin-instagram-post-editor");
    const message = $("[data-ig-post-editor-message]", modal);
    if (message) { message.textContent = "Carregando…"; message.classList.remove("error"); }
    try {
      const data = await adminApi("/api/admin/conteudos");
      adminEditingRow = (data.conteudos || []).find(row => row.content_id === post.content_id) || null;
      if (!adminEditingRow) throw new Error("Esta publicação não foi encontrada no painel administrativo.");
      $("[data-ig-post-editor-preview]", modal).src = post.mediaUrl;
      $("[data-ig-post-editor-file]", modal).value = "";
      $("[data-ig-post-editor-caption]", modal).value = adminEditingRow.caption || post.caption || "";
      if (message) message.textContent = "";
      modal.hidden = false;
    } catch (error) {
      if (message) { message.textContent = error.message; message.classList.add("error"); }
      modal.hidden = false;
    }
  }

  async function saveAdminCurrentPost() {
    if (!(await verifyAdminAccess())) return;
    if (!adminEditingRow) return;
    const modal = $("#yasmin-instagram-post-editor");
    const file = $("[data-ig-post-editor-file]", modal)?.files?.[0];
    const caption = String($("[data-ig-post-editor-caption]", modal)?.value || "").trim();
    const message = $("[data-ig-post-editor-message]", modal);
    const button = $("[data-ig-post-editor-save]", modal);
    button.disabled = true;
    button.textContent = "Salvando…";
    try {
      let mediaKey = adminEditingRow.media_key;
      if (file) {
        const payload = new FormData();
        payload.append("arquivo", file);
        const upload = await adminApi("/api/admin/upload", { method: "POST", body: payload });
        mediaKey = upload.mediaKey;
      }
      if (!mediaKey) throw new Error("Selecione uma nova imagem para esta publicação.");
      const id = adminEditingRow.content_id;
      await adminApi("/api/admin/conteudos", {
        method: "POST",
        body: JSON.stringify({
          contentId: id,
          secao: "instagram_posts",
          visibilidade: "public",
          titulo: adminEditingRow.title || "Publicação Instagram",
          legenda: caption,
          ordem: Number(adminEditingRow.sort_order || 0),
          mediaKey,
          publicado: true
        })
      });
      if (message) { message.textContent = "Publicação atualizada."; message.classList.remove("error"); }
      await load();
      const newIndex = posts.findIndex(item => item.content_id === id);
      if (newIndex >= 0) currentPost = newIndex;
      renderPostModal();
      setTimeout(closeAdminCurrentPostEditor, 450);
    } catch (error) {
      if (message) { message.textContent = error.message; message.classList.add("error"); }
    } finally {
      button.disabled = false;
      button.textContent = "Salvar";
    }
  }

  async function deleteAdminCurrentPost() {
    if (!(await verifyAdminAccess())) return;
    if (!adminEditingRow) return;
    if (!confirm("Excluir esta publicação do Instagram?")) return;
    const modal = $("#yasmin-instagram-post-editor");
    const message = $("[data-ig-post-editor-message]", modal);
    const button = $("[data-ig-post-editor-delete]", modal);
    button.disabled = true;
    button.textContent = "Excluindo…";
    try {
      await adminApi(`/api/admin/conteudos/${encodeURIComponent(adminEditingRow.content_id)}`, { method: "DELETE" });
      closeAdminCurrentPostEditor();
      closePost();
      await load();
    } catch (error) {
      if (message) { message.textContent = error.message; message.classList.add("error"); }
    } finally {
      button.disabled = false;
      button.textContent = "Excluir";
    }
  }

  function ensureAdminPostModal() {
    if ($("#yasmin-instagram-publish-modal")) return;
    const modal = document.createElement("div");
    modal.id = "yasmin-instagram-publish-modal";
    modal.className = "ig-admin-publish-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="ig-admin-publish-bg" data-ig-admin-close></div>
      <section class="ig-admin-publish-card" role="dialog" aria-modal="true">
        <h2>Nova publicação</h2>
        <p>A imagem será salva no R2 e aparecerá no Instagram e no card da página inicial.</p>
        <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" data-ig-admin-file>
        <textarea maxlength="2000" placeholder="Legenda (opcional)" data-ig-admin-caption></textarea>
        <div class="ig-admin-publish-message" data-ig-admin-message></div>
        <div class="ig-admin-publish-actions">
          <button type="button" data-ig-admin-close>Cancelar</button>
          <button type="button" class="primary" data-ig-admin-save>Publicar</button>
        </div>
      </section>`;
    document.body.append(modal);
    $$("[data-ig-admin-close]", modal).forEach(button => button.addEventListener("click", () => modal.hidden = true));
    $("[data-ig-admin-save]", modal)?.addEventListener("click", publishInstagramFromModal);
  }

  async function openAdminPostModal() {
    if (!(await verifyAdminAccess())) return;
    ensureAdminPostModal();
    const modal = $("#yasmin-instagram-publish-modal");
    const file = $("[data-ig-admin-file]", modal);
    const caption = $("[data-ig-admin-caption]", modal);
    const message = $("[data-ig-admin-message]", modal);
    if (file) file.value = "";
    if (caption) caption.value = "";
    if (message) message.textContent = "";
    modal.hidden = false;
  }

  async function publishInstagramFromModal() {
    if (!(await verifyAdminAccess())) return;
    const modal = $("#yasmin-instagram-publish-modal");
    const file = $("[data-ig-admin-file]", modal)?.files?.[0];
    const caption = String($("[data-ig-admin-caption]", modal)?.value || "").trim();
    const message = $("[data-ig-admin-message]", modal);
    const button = $("[data-ig-admin-save]", modal);
    if (!file) { if (message) message.textContent = "Selecione uma imagem."; return; }
    button.disabled = true;
    button.textContent = "Enviando…";
    try {
      const payload = new FormData();
      payload.append("arquivo", file);
      const upload = await adminApi("/api/admin/upload", { method: "POST", body: payload });
      await adminApi("/api/admin/conteudos", {
        method: "POST",
        body: JSON.stringify({
          secao: "instagram_posts",
          visibilidade: "public",
          titulo: "Publicação Instagram",
          legenda: caption,
          ordem: 0,
          mediaKey: upload.mediaKey,
          publicado: true
        })
      });
      if (message) message.textContent = "Publicação adicionada.";
      await load();
      setTimeout(() => { modal.hidden = true; }, 450);
    } catch (error) {
      if (message) message.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Publicar";
    }
  }

  async function enableAdminInstagramButtons() {
    lockAdminInstagramUi();
    if (!(await verifyAdminAccess())) return;
    unlockAdminInstagramUi();
    adminCreateButtons().forEach(button => {
      if (button.dataset.bound === "1") return;
      button.dataset.bound = "1";
      button.addEventListener("click", openAdminPostModal);
    });
  }

  function renderAll() {
    applySlots();
    posts = actualInstagramPosts().map(item => ({ ...item, mediaUrl: item.mediaUrl || mediaUrl(item.content_id) }));
    updateInstagramCounts(posts.length);
    renderHomeInstagram();
    renderInstagramProfile();
    bindPreviewPaywall();
  }

  async function load() {
    try {
      const response = await fetch(`${apiBase}/api/publico/conteudos`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok) state = data;
    } catch (error) {
      console.warn("Mídias R2 indisponíveis", error);
    }
    renderAll();
    document.dispatchEvent(new CustomEvent("yasmin:r2-media-loaded", { detail: state }));
  }

  window.YasminR2Media = Object.freeze({ reload: load, state: () => state });

  ensureAdminFixStyles();
  lockAdminInstagramUi();

  document.addEventListener("DOMContentLoaded", async () => {
    bindPreviewArrows();
    await load();
    await enableAdminInstagramButtons();
  });
})();
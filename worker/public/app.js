(function () {
  var tokenEl = document.getElementById("token");
  var form = document.getElementById("poemForm");
  var btn = document.getElementById("submit");
  var cancelBtn = document.getElementById("cancelEdit");
  var deleteBtn = document.getElementById("deletePoem");
  var statusEl = document.getElementById("status");
  var listEl = document.getElementById("list");
  var countEl = document.getElementById("count");
  var headingEl = document.getElementById("heading");
  var subheadingEl = document.getElementById("subheading");
  var editIdEl = document.getElementById("editId");
  var imageEditorEl = document.getElementById("imageEditor");
  var newImagesEl = document.getElementById("newImages");
  var lightboxEl = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbPrev = document.getElementById("lbPrev");
  var lbNext = document.getElementById("lbNext");
  var lbClose = document.getElementById("lbClose");
  var lbCounter = document.getElementById("lbCounter");
  var searchEl = document.getElementById("search");

  var KEY = "kavita_admin_token";
  var R2_BASE = "";
  var poems = [];
  var editingId = null;
  /** @type {{ type: 'existing', name: string } | { type: 'new', file: File, preview: string }}[]} */
  var imageSlots = [];

  tokenEl.value = localStorage.getItem(KEY) || "";

  /** GurbaniAkhar ASCII → Unicode for save (gurmukhi-utils). */
  function toUnicodeField(text) {
    if (!text) return "";
    try {
      if (typeof isGurmukhi === "function" && isGurmukhi(text)) return text;
      return toUnicode(text);
    } catch (e) {
      return text;
    }
  }

  /** Unicode → GurbaniAkhar ASCII for editing with Akhar font. */
  function toAkharField(text) {
    if (!text) return "";
    try {
      if (typeof isGurmukhi === "function" && isGurmukhi(text))
        return toAscii(text);
    } catch (e) {}
    return text;
  }

  function setGurmukhiField(inputEl, unicodeText) {
    inputEl.value = toAkharField(unicodeText);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function formatBytes(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    var kb = bytes / 1024;
    if (kb < 1024) return Math.round(kb) + " KB";
    return (kb / 1024).toFixed(1) + " MB";
  }

  function getPoemImages(p) {
    if (p.images && p.images.length) return p.images.slice();
    if (p.image) return [p.image];
    return [];
  }

  function scanUrl(name) {
    return R2_BASE ? R2_BASE + "/scans/" + encodeURIComponent(name) : "";
  }

  function thumbHtml(p) {
    var file = getPoemImages(p)[0];
    if (file && R2_BASE) {
      return '<img src="' + scanUrl(file) + '" alt="" loading="lazy" />';
    }
    var g = p.title && p.title.gurmukhi ? p.title.gurmukhi.slice(0, 1) : "?";
    return '<div class="glyph">' + esc(g) + "</div>";
  }

  // --- Fullscreen image viewer ---------------------------------------------
  var lbSources = [];
  var lbIndex = 0;

  function lbRender() {
    lbImg.src = lbSources[lbIndex] || "";
    var multi = lbSources.length > 1;
    lbPrev.classList.toggle("hidden", !multi);
    lbNext.classList.toggle("hidden", !multi);
    lbCounter.classList.toggle("hidden", !multi);
    if (multi) lbCounter.textContent = lbIndex + 1 + " / " + lbSources.length;
  }

  function lbStep(delta) {
    if (!lbSources.length) return;
    lbIndex = (lbIndex + delta + lbSources.length) % lbSources.length;
    lbRender();
  }

  function openLightbox(sources, startIndex) {
    var srcs = (sources || []).filter(Boolean);
    if (!srcs.length) return;
    lbSources = srcs;
    lbIndex = Math.min(Math.max(startIndex || 0, 0), srcs.length - 1);
    lbRender();
    lightboxEl.classList.remove("hidden");
    lightboxEl.setAttribute("aria-hidden", "false");
  }

  function closeLightbox() {
    lightboxEl.classList.add("hidden");
    lightboxEl.setAttribute("aria-hidden", "true");
    lbImg.src = "";
    lbSources = [];
  }

  lbClose.addEventListener("click", closeLightbox);
  lbPrev.addEventListener("click", function () {
    lbStep(-1);
  });
  lbNext.addEventListener("click", function () {
    lbStep(1);
  });
  lightboxEl.addEventListener("click", function (e) {
    if (e.target === lightboxEl) closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (lightboxEl.classList.contains("hidden")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") lbStep(-1);
    else if (e.key === "ArrowRight") lbStep(1);
  });

  /** URLs for the images currently shown in the editor (existing + new). */
  function editorSources() {
    return imageSlots.map(function (slot) {
      return slot.type === "existing" ? scanUrl(slot.name) : slot.preview;
    });
  }

  function setStatus(msg, ok) {
    statusEl.textContent = msg;
    statusEl.className = "status " + (ok ? "ok" : "err");
  }

  function clearStatus() {
    statusEl.textContent = "";
    statusEl.className = "status";
  }

  function getToken() {
    return tokenEl.value.trim();
  }

  function authHeaders() {
    return { Authorization: "Bearer " + getToken() };
  }

  function fetchJson(url, opts) {
    return fetch(url, opts).then(function (r) {
      return r.json().then(function (d) {
        return { ok: r.ok, status: r.status, d: d };
      });
    });
  }

  function loadConfig() {
    return fetch("/config")
      .then(function (r) {
        return r.json();
      })
      .then(function (cfg) {
        R2_BASE = cfg.r2PublicBase || "";
      })
      .catch(function () {});
  }

  function poemHaystack(p) {
    var t = p.title || {};
    return [t.gurmukhi, t.roman, p.id, p.poet, (p.tags || []).join(" ")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function visiblePoems() {
    var q = searchEl.value.trim().toLowerCase();
    if (!q) return poems;
    return poems.filter(function (p) {
      return poemHaystack(p).indexOf(q) !== -1;
    });
  }

  function renderList() {
    searchEl.classList.toggle("hidden", poems.length === 0);
    var shown = visiblePoems();
    if (shown.length === poems.length) {
      countEl.textContent = poems.length + (poems.length === 1 ? " poem" : " poems");
    } else {
      countEl.textContent = shown.length + " of " + poems.length + " poems";
    }
    listEl.innerHTML = shown
      .map(function (p) {
        var active = editingId === p.id ? " active" : "";
        return (
          '<div class="item' +
          active +
          '" data-id="' +
          esc(p.id) +
          '">' +
          thumbHtml(p) +
          '<div class="meta"><div class="t">' +
          esc(p.title && p.title.gurmukhi) +
          "</div>" +
          '<div class="r">' +
          esc(p.title && p.title.roman) +
          "</div></div>" +
          '<span class="edit-hint">Edit</span></div>'
        );
      })
      .join("");

    listEl.querySelectorAll(".item").forEach(function (el) {
      el.addEventListener("click", function (e) {
        var id = el.getAttribute("data-id");
        var poem = poems.find(function (p) {
          return p.id === id;
        });
        if (!poem) return;
        // Tapping the thumbnail opens the viewer; tapping elsewhere edits.
        if (e.target && e.target.tagName === "IMG") {
          openLightbox(getPoemImages(poem).map(scanUrl), 0);
          return;
        }
        startEdit(poem);
      });
    });
  }

  function loadList() {
    return fetch("/poems")
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        poems = Array.isArray(data) ? data : [];
        renderList();
      })
      .catch(function () {
        countEl.textContent = "";
      });
  }

  function revokeNewPreviews() {
    imageSlots.forEach(function (slot) {
      if (slot.type === "new" && slot.preview)
        URL.revokeObjectURL(slot.preview);
    });
  }

  function renderImageEditor() {
    if (!imageSlots.length) {
      imageEditorEl.innerHTML =
        '<p class="hint" style="margin:0">No images yet — add files below.</p>';
      return;
    }

    imageEditorEl.innerHTML = imageSlots
      .map(function (slot, i) {
        var src = slot.type === "existing" ? scanUrl(slot.name) : slot.preview;
        var label = slot.type === "existing" ? slot.name : slot.file.name;
        var size = slot.type === "new" ? formatBytes(slot.file.size) : "";
        return (
          '<div class="img-row" data-idx="' +
          i +
          '">' +
          (src
            ? '<img src="' + esc(src) + '" alt="" />'
            : '<div class="glyph">?</div>') +
          '<div class="info"><span class="name">' +
          esc(label) +
          '</span><span class="dim">' +
          esc(size) +
          "</span></div>" +
          '<div class="btns">' +
          '<button type="button" class="small secondary" data-act="up"' +
          (i === 0 ? " disabled" : "") +
          ">↑</button>" +
          '<button type="button" class="small secondary" data-act="down"' +
          (i === imageSlots.length - 1 ? " disabled" : "") +
          ">↓</button>" +
          '<button type="button" class="small secondary" data-act="remove">✕</button>' +
          "</div></div>"
        );
      })
      .join("");

    imageEditorEl.querySelectorAll(".img-row img").forEach(function (im) {
      im.addEventListener("click", function () {
        var row = im.closest(".img-row");
        var idx = parseInt(row.getAttribute("data-idx"), 10);
        openLightbox(editorSources(), idx);
      });
      var fillDim = function () {
        if (!im.naturalWidth) return;
        var dimEl = im.closest(".img-row").querySelector(".dim");
        var dims = im.naturalWidth + "×" + im.naturalHeight;
        dimEl.textContent = dimEl.textContent
          ? dims + " · " + dimEl.textContent
          : dims;
      };
      if (im.complete) fillDim();
      else im.addEventListener("load", fillDim);
    });

    imageEditorEl.querySelectorAll(".img-row button").forEach(function (b) {
      b.addEventListener("click", function () {
        var row = b.closest(".img-row");
        var idx = parseInt(row.getAttribute("data-idx"), 10);
        var act = b.getAttribute("data-act");
        if (act === "up" && idx > 0) {
          var tmp = imageSlots[idx - 1];
          imageSlots[idx - 1] = imageSlots[idx];
          imageSlots[idx] = tmp;
          renderImageEditor();
        } else if (act === "down" && idx < imageSlots.length - 1) {
          var tmp2 = imageSlots[idx + 1];
          imageSlots[idx + 1] = imageSlots[idx];
          imageSlots[idx] = tmp2;
          renderImageEditor();
        } else if (act === "remove") {
          var slot = imageSlots[idx];
          if (slot.type === "new" && slot.preview)
            URL.revokeObjectURL(slot.preview);
          imageSlots.splice(idx, 1);
          renderImageEditor();
        }
      });
    });
  }

  function resetForm() {
    revokeNewPreviews();
    editingId = null;
    editIdEl.value = "";
    imageSlots = [];
    form.reset();
    tokenEl.value = localStorage.getItem(KEY) || "";
    newImagesEl.value = "";
    headingEl.textContent = "ਕਵਿਤਾ · Add a poem";
    subheadingEl.textContent =
      "Saves directly to your collection. Line breaks and spacing are kept exactly.";
    btn.textContent = "Save poem";
    cancelBtn.classList.add("hidden");
    deleteBtn.classList.add("hidden");
    renderImageEditor();
    renderList();
  }

  function startEdit(p) {
    revokeNewPreviews();
    editingId = p.id;
    editIdEl.value = p.id;
    clearStatus();

    setGurmukhiField(form.titleGurmukhi, (p.title && p.title.gurmukhi) || "");
    form.titleRoman.value = (p.title && p.title.roman) || "";
    setGurmukhiField(form.gurmukhi, p.gurmukhi || "");
    form.roman.value = p.roman || "";
    form.poet.value = p.poet || "";
    form.tags.value = p.tags && p.tags.length ? p.tags.join(", ") : "";
    newImagesEl.value = "";

    imageSlots = getPoemImages(p).map(function (name) {
      return { type: "existing", name: name };
    });

    headingEl.textContent = "ਕਵਿਤਾ · Edit poem";
    subheadingEl.textContent =
      "Editing “" + p.id + "”. Changes save to your collection immediately.";
    btn.textContent = "Update poem";
    cancelBtn.classList.remove("hidden");
    deleteBtn.classList.remove("hidden");
    renderImageEditor();
    renderList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  newImagesEl.addEventListener("change", function () {
    Array.from(newImagesEl.files || []).forEach(function (file) {
      imageSlots.push({
        type: "new",
        file: file,
        preview: URL.createObjectURL(file),
      });
    });
    newImagesEl.value = "";
    renderImageEditor();
  });

  cancelBtn.addEventListener("click", function () {
    resetForm();
    clearStatus();
  });

  deleteBtn.addEventListener("click", function () {
    if (!editingId) return;

    var token = getToken();
    if (!token) {
      setStatus("Enter your password first.", false);
      tokenEl.focus();
      return;
    }

    var label = editingId;
    var poem = poems.find(function (p) { return p.id === editingId; });
    if (poem && poem.title) {
      label = poem.title.gurmukhi || poem.title.roman || editingId;
    }

    if (!confirm('Delete “' + label + '”? This cannot be undone.')) return;

    localStorage.setItem(KEY, token);
    deleteBtn.disabled = true;
    btn.disabled = true;
    setStatus("Deleting…", true);

    fetchJson("/poem/" + encodeURIComponent(editingId), {
      method: "DELETE",
      headers: authHeaders(),
    })
      .then(function (res) {
        if (res.ok && res.d.ok) {
          setStatus('Deleted “' + res.d.id + '” — now ' + res.d.count + " poems.", true);
          resetForm();
          return loadList();
        }
        if (res.status === 401) {
          setStatus((res.d && res.d.error) || "Wrong or missing password.", false);
          tokenEl.focus();
          return;
        }
        setStatus((res.d && res.d.error) || "Something went wrong.", false);
      })
      .catch(function () {
        setStatus("Network error.", false);
      })
      .finally(function () {
        deleteBtn.disabled = false;
        btn.disabled = false;
      });
  });

  function buildImageOrder() {
    var order = [];
    var newIdx = 0;
    imageSlots.forEach(function (slot) {
      if (slot.type === "existing") order.push(slot.name);
      else order.push("new:" + newIdx++);
    });
    return order;
  }

  function appendNewFiles(fd) {
    var newIdx = 0;
    imageSlots.forEach(function (slot) {
      if (slot.type === "new") {
        fd.append(
          "images",
          slot.file,
          slot.file.name || "new-" + newIdx + ".jpg"
        );
        newIdx++;
      }
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var token = getToken();
    if (!token) {
      setStatus("Enter your password first.", false);
      return;
    }
    localStorage.setItem(KEY, token);

    var fd = new FormData(form);
    fd.delete("editId");
    fd.delete("images");
    fd.set("titleGurmukhi", toUnicodeField(form.titleGurmukhi.value));
    fd.set("gurmukhi", toUnicodeField(form.gurmukhi.value));

    var url = "/poem";
    var method = "POST";

    if (editingId) {
      url = "/poem/" + encodeURIComponent(editingId);
      method = "PUT";
      fd.set("imageOrder", JSON.stringify(buildImageOrder()));
    }

    appendNewFiles(fd);

    btn.disabled = true;
    setStatus(editingId ? "Updating…" : "Saving…", true);

    fetchJson(url, { method: method, headers: authHeaders(), body: fd })
      .then(function (res) {
        if (res.ok && res.d.ok) {
          setStatus(
            (editingId ? "Updated" : "Saved") +
              ' "' +
              res.d.id +
              '" — now ' +
              res.d.count +
              " poems.",
            true
          );
          resetForm();
          return loadList();
        }
        setStatus(res.d.error || "Something went wrong.", false);
      })
      .catch(function () {
        setStatus("Network error.", false);
      })
      .finally(function () {
        btn.disabled = false;
      });
  });

  searchEl.addEventListener("input", renderList);

  renderImageEditor();
  loadConfig().then(loadList);
})();

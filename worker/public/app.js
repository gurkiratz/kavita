(function () {
  var tokenEl = document.getElementById("token");
  var form = document.getElementById("poemForm");
  var btn = document.getElementById("submit");
  var cancelBtn = document.getElementById("cancelEdit");
  var deleteBtn = document.getElementById("deletePoem");
  var toastEl = document.getElementById("toast");
  var listEl = document.getElementById("list");
  var countEl = document.getElementById("count");
  // Heading and subheading are cosmetic and get edited by hand — a missing one
  // must never be able to throw mid-save. Everything below goes through setText.
  var headingEl = document.getElementById("heading");
  var subheadingEl = document.getElementById("subheading");

  /** Set textContent when the element exists; do nothing when it doesn't. */
  function setText(el, text) {
    if (el) el.textContent = text;
  }
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

  // --- Clipboard -----------------------------------------------------------

  /**
   * Copy text, falling back to a hidden textarea where the async Clipboard API
   * isn't available (insecure context, older Safari). Returns a promise of ok.
   */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () {
          return true;
        },
        function () {
          return legacyCopy(text);
        }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  /** Flash a button's label, then restore it. */
  function flashButton(btnEl, label) {
    if (btnEl._restore) clearTimeout(btnEl._restore);
    else btnEl._label = btnEl.textContent;
    btnEl.textContent = label;
    btnEl.classList.add("copied");
    btnEl._restore = setTimeout(function () {
      btnEl.textContent = btnEl._label;
      btnEl.classList.remove("copied");
      btnEl._restore = null;
    }, 1400);
  }

  /** Copy `text` and report the outcome on `btnEl`. */
  function copyFromButton(btnEl, text, emptyLabel) {
    if (!text) {
      flashButton(btnEl, emptyLabel || "Nothing to copy");
      return;
    }
    copyText(text).then(function (ok) {
      flashButton(btnEl, ok ? "Copied ✓" : "Copy failed");
    });
  }

  // Copy the Unicode for whatever Akhar ASCII is in the field right now — so the
  // Unicode is reachable before the poem has ever been saved.
  document.querySelectorAll("[data-copy-field]").forEach(function (b) {
    b.addEventListener("click", function () {
      var field = form[b.getAttribute("data-copy-field")];
      copyFromButton(
        b,
        toUnicodeField(field ? field.value : ""),
        "Field is empty"
      );
    });
  });

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

  // Same-origin, served by this Worker from whichever bucket it's bound to — so
  // thumbnails work against the local, preview, and production buckets alike.
  // Deliberately not built from /config's r2PublicBase: that always names the
  // production bucket, so in dev it points at images that were never written there.
  function scanUrl(name) {
    return "/scans/" + encodeURIComponent(name);
  }

  function thumbHtml(p) {
    var file = getPoemImages(p)[0];
    if (file) {
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

  /**
   * Transient message pinned to the viewport.
   *
   * Replaces the old inline status line, which sat above the collection — after
   * saving a poem you'd scrolled past, the confirmation could be off-screen.
   * Keeps setStatus's signature so every existing call site still reads right.
   */
  var toastTimer = null;
  function setStatus(msg, ok) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = "show " + (ok ? "ok" : "err");
    if (toastTimer) clearTimeout(toastTimer);
    // Errors are worth reading twice; confirmations aren't.
    toastTimer = setTimeout(clearStatus, ok ? 2600 : 6000);
  }

  function clearStatus() {
    if (!toastEl) return;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
    toastEl.className = "";
  }

  function getToken() {
    return tokenEl.value.trim();
  }

  function authHeaders() {
    return { Authorization: "Bearer " + getToken() };
  }

  /**
   * Fetch and parse JSON without letting a non-JSON body look like a network
   * failure. `r.json()` rejects on an HTML error page or an empty body, and that
   * rejection used to land in the same catch as a dropped connection — so an
   * error from the server read as "Network error." and told you nothing.
   */
  function fetchJson(url, opts) {
    return fetch(url, opts).then(function (r) {
      return r.text().then(function (text) {
        var d = null;
        try {
          d = text ? JSON.parse(text) : null;
        } catch (e) {
          console.error(
            "[kavita] expected JSON from " + url + ", got " + r.status + ":",
            text.slice(0, 500)
          );
        }
        return { ok: r.ok, status: r.status, d: d || {}, raw: text };
      });
    });
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
      countEl.textContent =
        poems.length + (poems.length === 1 ? " poem" : " poems");
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
          (p.gurmukhi
            ? '<button type="button" class="copy-btn row-copy" title="Copy this poem’s Gurmukhi Unicode">Copy</button>'
            : "") +
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
        // The stored body is already Unicode — copy it straight through.
        var copyBtn = e.target.closest && e.target.closest(".row-copy");
        if (copyBtn) {
          copyFromButton(copyBtn, poem.gurmukhi, "No Gurmukhi");
          return;
        }
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
      .catch(function (err) {
        // Blanking the count silently used to be the whole error report, so a
        // render bug in here looked identical to the collection being empty.
        console.error("[kavita] couldn’t load the collection", err);
        countEl.textContent = "Couldn’t load the collection.";
      });
  }

  function revokeNewPreviews() {
    imageSlots.forEach(function (slot) {
      if (slot.type === "new" && slot.preview)
        URL.revokeObjectURL(slot.preview);
    });
  }

  /**
   * Drag a row onto another to move it there.
   *
   * Reordering eight scans with ↑/↓ took a click per position; this is one drag.
   * The buttons stay — drag is mouse-only, so they remain the keyboard and touch
   * path. Index comes off data-idx, which renderImageEditor rewrites each pass.
   */
  var dragFromIdx = null;

  function wireImageDrag() {
    imageEditorEl.querySelectorAll(".img-row").forEach(function (row) {
      row.addEventListener("dragstart", function (e) {
        dragFromIdx = parseInt(row.getAttribute("data-idx"), 10);
        row.classList.add("dragging");
        // Firefox won't start a drag unless some data is set.
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          try {
            e.dataTransfer.setData("text/plain", String(dragFromIdx));
          } catch (err) {}
        }
      });

      row.addEventListener("dragend", function () {
        dragFromIdx = null;
        imageEditorEl.querySelectorAll(".img-row").forEach(function (o) {
          o.classList.remove("dragging", "over");
        });
      });

      row.addEventListener("dragover", function (e) {
        if (dragFromIdx === null) return;
        e.preventDefault(); // without this, drop never fires
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        row.classList.add("over");
      });

      row.addEventListener("dragleave", function () {
        row.classList.remove("over");
      });

      row.addEventListener("drop", function (e) {
        e.preventDefault();
        row.classList.remove("over");
        var to = parseInt(row.getAttribute("data-idx"), 10);
        var from = dragFromIdx;
        dragFromIdx = null;
        if (from === null || isNaN(to) || from === to) return;
        var moved = imageSlots.splice(from, 1)[0];
        imageSlots.splice(to, 0, moved);
        renderImageEditor();
      });
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
          '<div class="img-row" draggable="true" data-idx="' +
          i +
          '">' +
          '<span class="grip" aria-hidden="true">⠿</span>' +
          (src
            ? '<img src="' + esc(src) + '" alt="" />'
            : '<div class="glyph">?</div>') +
          '<div class="info"><span class="name">' +
          esc(label) +
          '</span><span class="dim">' +
          esc(size) +
          "</span></div>" +
          '<div class="btns">' +
          // Kept alongside drag: the only path that works from a keyboard, and
          // the only one that works at all on touch.
          '<button type="button" class="small secondary" data-act="up" aria-label="Move up"' +
          (i === 0 ? " disabled" : "") +
          ">↑</button>" +
          '<button type="button" class="small secondary" data-act="down" aria-label="Move down"' +
          (i === imageSlots.length - 1 ? " disabled" : "") +
          ">↓</button>" +
          '<button type="button" class="small secondary" data-act="remove" aria-label="Remove image">✕</button>' +
          "</div></div>"
        );
      })
      .join("");

    wireImageDrag();

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
    setText(headingEl, "Add a ਕਵਿਤਾ");
    setText(subheadingEl, "");
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

    setText(headingEl, "Edit ਕਵਿਤਾ");
    // Parenthesised deliberately: `"a" + x || y` binds as `("a" + x) || y`, which
    // is always truthy, so the fallbacks never fired.
    var label = (p.title && (p.title.gurmukhi || p.title.roman)) || p.id;
    setText(subheadingEl, "Editing “" + label + "” — changes save immediately.");
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
    var poem = poems.find(function (p) {
      return p.id === editingId;
    });
    if (poem && poem.title) {
      label = poem.title.gurmukhi || poem.title.roman || editingId;
    }

    if (
      !confirm(
        "Delete “" +
          label +
          "”?\n\nIt moves to the trash with its images, and stays recoverable for 30 days."
      )
    )
      return;

    localStorage.setItem(KEY, token);
    deleteBtn.disabled = true;
    btn.disabled = true;
    setStatus("Deleting…", true);

    fetchJson("/poem/" + encodeURIComponent(editingId), {
      method: "DELETE",
      headers: authHeaders(),
    })
      .catch(function (err) {
        console.error("[kavita] DELETE failed", err);
        setStatus(
          "Couldn’t reach the server. Reload to check whether it was deleted.",
          false
        );
        return null;
      })
      .then(function (res) {
        if (!res) return;
        if (res.ok && res.d.ok) {
          setStatus(
            "Deleted “" + res.d.id + "” — now " + res.d.count + " poems.",
            true
          );
          resetForm();
          return loadList();
        }
        if (res.status === 401) {
          setStatus(
            (res.d && res.d.error) || "Wrong or missing password.",
            false
          );
          tokenEl.focus();
          return;
        }
        console.error("[kavita] delete rejected", res.status, res.raw);
        setStatus((res.d && res.d.error) || "Something went wrong.", false);
      })
      .catch(function (err) {
        console.error("[kavita] refresh after delete failed", err);
        setStatus("Deleted, but the page couldn’t refresh. Reload to see it.", false);
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

    var saving = editingId;

    fetchJson(url, { method: method, headers: authHeaders(), body: fd })
      .catch(function (err) {
        // Only a genuinely failed request reaches here — the response never
        // arrived. Anything after this point is our own code.
        console.error("[kavita] " + method + " " + url + " failed", err);
        setStatus(
          "Couldn’t reach the server. The poem may not have been saved — reload to check.",
          false
        );
        return null;
      })
      .then(function (res) {
        if (!res) return;
        if (res.ok && res.d.ok) {
          setStatus(
            (saving ? "Updated" : "Saved") +
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
        console.error("[kavita] save rejected", res.status, res.raw);
        setStatus(
          res.d.error || "Something went wrong (HTTP " + res.status + ").",
          false
        );
      })
      .catch(function (err) {
        // The save itself succeeded — this is the page failing to refresh, which
        // must not be reported as a network problem.
        console.error("[kavita] refresh after save failed", err);
        setStatus("Saved, but the page couldn’t refresh. Reload to see it.", false);
      })
      .finally(function () {
        btn.disabled = false;
      });
  });

  searchEl.addEventListener("input", renderList);

  // Keyboard shortcuts, as advertised under the form. The lightbox has its own
  // key handler and returns early above, so these can't fire behind it.
  document.addEventListener("keydown", function (e) {
    if (!lightboxEl.classList.contains("hidden")) return;

    var typing =
      document.activeElement &&
      /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);

    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      // requestSubmit runs validation and fires the submit handler, unlike submit().
      if (form.requestSubmit) form.requestSubmit();
      else btn.click();
      return;
    }

    if (e.key === "Escape" && editingId) {
      e.preventDefault();
      resetForm();
      clearStatus();
      return;
    }

    if (e.key === "/" && !typing) {
      e.preventDefault();
      searchEl.focus();
    }
  });

  renderImageEditor();
  loadList();
})();

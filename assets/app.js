/* ============================================================
   면접 대비 학습 허브 — 공통 스크립트
   - 자체 마크다운 렌더러(오프라인 동작, CDN 불필요)
   - TOC 자동 생성 / 스크롤 하이라이트
   - 전체 검색(각 페이지가 window.STUDY_DATA 로 원문 보유)
   - 다크모드 토글(로컬 저장 없이 세션 내 동작 — 아티팩트 제약)
   - 코드 복사 버튼 / 확인질문 아코디언
   원칙: 원문 텍스트를 "한 글자도" 잃지 않고 HTML로 변환한다.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 유틸: HTML 이스케이프 ---------- */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- 특수기호 보존 강조 (★, →) ----------
     이스케이프된 안전한 텍스트에만 적용 (원문 보존) */
  function decorate(s) {
    return s
      .replace(/★/g, '<span class="marker">★</span>')
      .replace(/→/g, '<span class="arrow">→</span>');
  }

  /* ---------- 인라인 마크다운 (굵게/코드/링크) ----------
     입력은 raw 텍스트. 코드 스팬을 먼저 떼어내 보호한 뒤 처리. */
  function inline(raw) {
    var tokens = [];
    // `code` 보호
    var s = raw.replace(/`([^`]+)`/g, function (_, c) {
      tokens.push("<code>" + esc(c) + "</code>");
      return "\u0000" + (tokens.length - 1) + "\u0000";
    });
    s = esc(s);
    // **bold**
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // 자동 링크 (http/https)
    s = s.replace(/(https?:\/\/[^\s<)]+)/g,
      '<a href="$1" target="_blank" rel="noopener">$1</a>');
    s = decorate(s);
    // 코드 스팬 복원
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return tokens[+i]; });
    return s;
  }

  /* ---------- slug 생성 (앵커 id) ---------- */
  function slugify(text, used) {
    var base = text.trim().toLowerCase()
      .replace(/[`*→★|]/g, "")
      .replace(/[^\w\uAC00-\uD7A3\s-]/g, "")
      .replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!base) base = "sec";
    var id = base, n = 1;
    while (used[id]) { id = base + "-" + (++n); }
    used[id] = true;
    return id;
  }

  /* ---------- 블록 단위 마크다운 → HTML ----------
     반환: { html, headings:[{level,text,id}] } */
  function renderMarkdown(md) {
    var lines = md.replace(/\r\n?/g, "\n").split("\n");
    var out = [], headings = [], usedIds = {};
    var i = 0;

    function flushParaBuffer(buf) {
      if (buf.length) out.push("<p>" + inline(buf.join("\n")) + "</p>");
    }

    while (i < lines.length) {
      var line = lines[i];

      // 코드블록 ```
      var fence = line.match(/^```(.*)$/);
      if (fence) {
        var lang = fence[1].trim();
        var code = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          code.push(lines[i]); i++;
        }
        i++; // 닫는 ```
        var cls = lang ? ' class="language-' + esc(lang) + '"' : "";
        out.push(
          '<div class="code-wrap"><button class="copy-btn" type="button">복사</button>' +
          "<pre><code" + cls + ">" + esc(code.join("\n")) + "</code></pre></div>"
        );
        continue;
      }

      // 제목 ###### ~ #
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        var level = h[1].length;
        var text = h[2].trim();
        var id = slugify(text, usedIds);
        if (level === 2 || level === 3) headings.push({ level: level, text: text, id: id });
        out.push("<h" + level + ' id="' + id + '">' + inline(text) + "</h" + level + ">");
        i++; continue;
      }

      // 수평선
      if (/^\s*---+\s*$/.test(line) || /^\s*\*\*\*+\s*$/.test(line)) {
        out.push("<hr>"); i++; continue;
      }

      // 인용 >
      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^>\s?/, "")); i++;
        }
        out.push("<blockquote>" +
          q.map(function (t) { return "<p>" + inline(t) + "</p>"; }).join("") +
          "</blockquote>");
        continue;
      }

      // 표 (| ... |)  — 헤더줄 + 구분줄 + 본문
      if (/^\s*\|.*\|\s*$/.test(line) &&
          i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
          /-/.test(lines[i + 1])) {
        var tbl = [];
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== "") {
          tbl.push(lines[i]); i++;
        }
        out.push(renderTable(tbl));
        continue;
      }

      // 리스트 (순서/비순서, 중첩 지원)
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        var block = [];
        while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          block.push(lines[i]); i++;
          // 리스트 항목의 이어지는 들여쓴 줄 흡수
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) &&
                 !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
            block[block.length - 1] += "\n" + lines[i].trim(); i++;
          }
        }
        out.push(renderList(block));
        continue;
      }

      // 빈 줄
      if (line.trim() === "") { i++; continue; }

      // 일반 문단 (연속 비어있지 않은 줄 묶기)
      var para = [];
      while (i < lines.length && lines[i].trim() !== "" &&
             !/^(#{1,6})\s/.test(lines[i]) &&
             !/^```/.test(lines[i]) &&
             !/^>\s?/.test(lines[i]) &&
             !/^\s*---+\s*$/.test(lines[i]) &&
             !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
             !(/^\s*\|.*\|\s*$/.test(lines[i]))) {
        para.push(lines[i]); i++;
      }
      flushParaBuffer(para);
    }

    return { html: out.join("\n"), headings: headings };
  }

  /* ---------- 표 렌더 ---------- */
  function renderTable(rows) {
    function cells(r) {
      var t = r.trim().replace(/^\|/, "").replace(/\|$/, "");
      return t.split("|").map(function (c) { return c.trim(); });
    }
    var header = cells(rows[0]);
    var body = rows.slice(2).map(cells);
    var html = '<div class="table-scroll"><table><thead><tr>';
    header.forEach(function (c) { html += "<th>" + inline(c) + "</th>"; });
    html += "</tr></thead><tbody>";
    body.forEach(function (r) {
      html += "<tr>";
      for (var k = 0; k < header.length; k++) {
        html += "<td>" + inline(r[k] || "") + "</td>";
      }
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  /* ---------- 리스트 렌더 (들여쓰기 기반 중첩) ---------- */
  function renderList(block) {
    // 각 항목: {indent, ordered, text}
    var items = block.map(function (l) {
      var m = l.match(/^(\s*)([-*+]|\d+\.)\s+([\s\S]*)$/);
      return {
        indent: m[1].length,
        ordered: /\d+\./.test(m[2]),
        text: m[3]
      };
    });

    var pos = 0;
    function build(minIndent) {
      if (pos >= items.length) return "";
      var ordered = items[pos].ordered;
      var tag = ordered ? "ol" : "ul";
      var html = "<" + tag + ">";
      while (pos < items.length && items[pos].indent >= minIndent) {
        var cur = items[pos];
        if (cur.indent > minIndent + 0) {
          // 더 깊은 항목은 재귀 (직전 li 안에)
          html = html.replace(/<\/li>$/, build(cur.indent) + "</li>");
          continue;
        }
        pos++;
        var child = "";
        if (pos < items.length && items[pos].indent > cur.indent) {
          child = build(items[pos].indent);
        }
        html += "<li>" + inline(cur.text) + child + "</li>";
      }
      html += "</" + tag + ">";
      return html;
    }
    return build(items[0].indent);
  }

  /* ---------- 확인질문 렌더 (아코디언) ----------
     ## / ### 는 그룹 헤더, 리스트 항목은 각각 접이식 질문 */
  function renderCheckQuestions(md) {
    var lines = md.replace(/\r\n?/g, "\n").split("\n");
    var out = [], headings = [], usedIds = {};
    var i = 0, pending = [];

    function flushQuestions() {
      pending.forEach(function (q) {
        out.push(
          '<div class="qa-item"><button class="qa-q" type="button">' +
          '<span class="chev">▸</span><span>' + inline(q) + "</span></button>" +
          '<div class="qa-a"><span class="hint">스스로 답해보세요. (해설은 문서1·2 참조)</span></div>' +
          "</div>"
        );
      });
      pending = [];
    }

    while (i < lines.length) {
      var line = lines[i];
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushQuestions();
        var lvl = h[1].length, text = h[2].trim();
        var id = slugify(text, usedIds);
        if (lvl === 1) {
          out.push("<h1 id='" + id + "'>" + inline(text) + "</h1>");
        } else {
          if (lvl === 2 || lvl === 3) headings.push({ level: lvl, text: text, id: id });
          out.push("<div class='qa-grouphead' id='" + id + "'>" + inline(text) + "</div>");
        }
        i++; continue;
      }
      if (/^>\s?/.test(line)) {
        flushQuestions();
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
        out.push("<blockquote>" + q.map(function (t) { return "<p>" + inline(t) + "</p>"; }).join("") + "</blockquote>");
        continue;
      }
      if (/^\s*---+\s*$/.test(line)) { flushQuestions(); out.push("<hr>"); i++; continue; }
      var li = line.match(/^\s*[-*+]\s+(.*)$/);
      if (li) { pending.push(li[1]); i++; continue; }
      if (line.trim() === "") { i++; continue; }
      // 그 외 텍스트는 문단으로
      flushQuestions();
      out.push("<p>" + inline(line) + "</p>"); i++;
    }
    flushQuestions();
    return { html: out.join("\n"), headings: headings };
  }

  /* ---------- TOC 구축 ---------- */
  function buildTOC(headings) {
    var tocBody = document.getElementById("toc-body");
    if (!tocBody || !headings.length) {
      var t = document.getElementById("toc");
      if (t) t.style.display = "none";
      return;
    }
    var html = "";
    headings.forEach(function (hd) {
      html += '<a href="#' + hd.id + '" class="lvl-' + hd.level + '" data-id="' +
              hd.id + '">' + esc(hd.text) + "</a>";
    });
    tocBody.innerHTML = html;

    // 스크롤 하이라이트
    var links = tocBody.querySelectorAll("a");
    var map = {};
    links.forEach(function (a) { map[a.dataset.id] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (a) { a.classList.remove("active"); });
          var active = map[en.target.id];
          if (active) active.classList.add("active");
        }
      });
    }, { rootMargin: "-70px 0px -70% 0px", threshold: 0 });
    headings.forEach(function (hd) {
      var el = document.getElementById(hd.id);
      if (el) observer.observe(el);
    });
  }

  /* ---------- 복사 버튼 ---------- */
  function wireCopyButtons(root) {
    root.querySelectorAll(".copy-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var code = btn.parentElement.querySelector("code");
        var text = code ? code.innerText : "";
        var done = function () {
          btn.textContent = "복사됨"; btn.classList.add("done");
          setTimeout(function () { btn.textContent = "복사"; btn.classList.remove("done"); }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
        } else { fallback(text, done); }
      });
    });
    function fallback(text, cb) {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); cb();
    }
  }

  /* ---------- 아코디언 ---------- */
  function wireAccordion(root) {
    root.querySelectorAll(".qa-q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.parentElement.classList.toggle("open");
      });
    });
  }

  /* ---------- 다크모드 ---------- */
  function initTheme() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    // 시스템 선호 반영 (저장은 아티팩트 제약상 생략)
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    function sync() {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      btn.textContent = dark ? "☀" : "☾";
      btn.setAttribute("aria-label", dark ? "라이트 모드" : "다크 모드");
    }
    sync();
    btn.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      if (dark) document.documentElement.removeAttribute("data-theme");
      else document.documentElement.setAttribute("data-theme", "dark");
      sync();
    });
  }

  /* ---------- 진행바 ---------- */
  function initProgress() {
    var bar = document.querySelector(".progress-bar");
    if (!bar) return;
    window.addEventListener("scroll", function () {
      var h = document.documentElement;
      var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight);
      bar.style.width = Math.max(0, Math.min(1, scrolled)) * 100 + "%";
    }, { passive: true });
  }

  /* ---------- 전체 검색 ----------
     window.SEARCH_INDEX: [{title, kind, url, text}] 각 페이지가 주입.
     허브에는 전 문서 인덱스, 개별 페이지에도 동일 인덱스를 넣어 어디서든 검색. */
  function initSearch() {
    var input = document.getElementById("search-input");
    var overlay = document.getElementById("search-results");
    if (!input || !overlay) return;
    var panel = overlay.querySelector(".sr-list");
    var head = overlay.querySelector(".sr-count");
    var index = window.SEARCH_INDEX || [];

    function close() { overlay.classList.remove("open"); }
    function run(q) {
      q = q.trim();
      if (q.length < 2) { close(); return; }
      var terms = q.toLowerCase().split(/\s+/);
      var hits = [];
      index.forEach(function (doc) {
        var lower = doc.text.toLowerCase();
        var pos = lower.indexOf(terms[0]);
        var ok = terms.every(function (t) { return lower.indexOf(t) !== -1; });
        if (!ok) return;
        // 스니펫 추출
        var start = Math.max(0, pos - 40);
        var snippet = doc.text.slice(start, pos + 90);
        hits.push({ doc: doc, snippet: snippet, score: pos });
      });
      hits.sort(function (a, b) { return a.score - b.score; });

      if (!hits.length) {
        panel.innerHTML = '<div class="sr-empty">일치하는 내용이 없습니다.</div>';
      } else {
        panel.innerHTML = hits.slice(0, 40).map(function (h) {
          var snip = esc(h.snippet);
          terms.forEach(function (t) {
            var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
            snip = snip.replace(re, "<mark>$1</mark>");
          });
          return '<a class="sr-hit" href="' + h.doc.url + "#:~:text=" +
                 encodeURIComponent(terms[0]) + '">' +
                 '<div class="doc">' + esc(h.doc.kind) + " · " + esc(h.doc.title) + "</div>" +
                 '<div class="snippet">…' + snip + "…</div></a>";
        }).join("");
      }
      head.textContent = hits.length + "건";
      overlay.classList.add("open");
    }

    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { run(input.value); }, 120);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.value = ""; close(); input.blur(); }
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); input.focus(); }
    });
  }

  /* ---------- 모바일 TOC 토글 ---------- */
  function initTocToggle() {
    var btn = document.getElementById("toc-toggle");
    var toc = document.getElementById("toc");
    if (btn && toc) {
      btn.addEventListener("click", function () { toc.classList.toggle("collapsed"); });
    }
  }

  /* ---------- highlight.js (있으면) 적용 ---------- */
  function applyHighlight() {
    if (window.hljs) {
      document.querySelectorAll("pre code").forEach(function (el) {
        try { window.hljs.highlightElement(el); } catch (e) {}
      });
    }
  }

  /* ---------- 문서 페이지 부트스트랩 ----------
     원문은 <script type="text/markdown" id="doc-source"> 안의 텍스트.
     그 태그만 교체하면 페이지가 갱신된다(HTML 구조 불변). */
  function getSource(data) {
    if (data.sourceId) {
      var el = document.getElementById(data.sourceId);
      if (el) {
        // 앞뒤 개행 1개씩만 정리(태그 줄바꿈), 나머지 원문 보존
        return el.textContent.replace(/^\n/, "").replace(/\n$/, "");
      }
    }
    return data.markdown || "";
  }

  function bootReader() {
    var data = window.STUDY_DATA;
    if (!data) return;
    var target = document.getElementById("doc-body");
    var md = getSource(data);

    if (data.isCheckQuestions) {
      // 확인질문은 아코디언 특수 렌더 유지(내장 렌더러 사용)
      var r = renderCheckQuestions(md);
      target.innerHTML = r.html;
      buildTOC(r.headings);
    } else if (window.marked) {
      // 1순위: marked.js 로 본문 렌더 (표/코드/리스트 정확)
      try {
        window.marked.setOptions({ gfm: true, breaks: false, headerIds: false, mangle: false });
      } catch (e) {}
      var rawHtml = window.marked.parse(md);
      target.innerHTML = rawHtml;
      postProcess(target);                 // id 부여, 표 스크롤, 코드 복사, ★/→ 강조
      buildTOC(collectHeadings(target));
    } else {
      // 오프라인 폴백: 내장 렌더러
      var res = renderMarkdown(md);
      target.innerHTML = res.html;
      buildTOC(res.headings);
      wireCopyButtons(target);
    }
    wireCopyButtons(target);
    wireAccordion(target);
    applyHighlight();
  }

  /* marked.js 결과 후처리: 헤딩 id, 표 가로스크롤, 코드 복사버튼, 특수기호 강조 */
  function postProcess(root) {
    var used = {};
    root.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(function (h) {
      if (!h.id) h.id = slugify(h.textContent, used);
    });
    // 표를 스크롤 컨테이너로 감싸기
    root.querySelectorAll("table").forEach(function (t) {
      if (t.parentElement && t.parentElement.classList.contains("table-scroll")) return;
      var wrap = document.createElement("div");
      wrap.className = "table-scroll";
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
    // 코드블록에 복사 버튼
    root.querySelectorAll("pre").forEach(function (pre) {
      if (pre.parentElement && pre.parentElement.classList.contains("code-wrap")) return;
      var wrap = document.createElement("div");
      wrap.className = "code-wrap";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      var btn = document.createElement("button");
      btn.className = "copy-btn"; btn.type = "button"; btn.textContent = "복사";
      wrap.insertBefore(btn, pre);
    });
    // ★ / → 강조: 텍스트 노드만 순회(코드/태그 손상 방지)
    decorateTextNodes(root);
  }

  function decorateTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode.nodeName;
        if (p === "CODE" || p === "PRE" || p === "SCRIPT") return NodeFilter.FILTER_REJECT;
        return /[★→]/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var targets = [], n;
    while ((n = walker.nextNode())) targets.push(n);
    targets.forEach(function (node) {
      var frag = document.createDocumentFragment();
      var parts = node.nodeValue.split(/([★→])/);
      parts.forEach(function (p) {
        if (p === "★" || p === "→") {
          var s = document.createElement("span");
          s.className = p === "★" ? "marker" : "arrow";
          s.textContent = p;
          frag.appendChild(s);
        } else if (p) {
          frag.appendChild(document.createTextNode(p));
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function collectHeadings(root) {
    var out = [];
    root.querySelectorAll("h2,h3").forEach(function (h) {
      out.push({ level: h.tagName === "H2" ? 2 : 3, text: h.textContent, id: h.id });
    });
    return out;
  }

  /* ---------- 공통 초기화 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initSearch();
    initProgress();
    initTocToggle();
    bootReader();
  });

  // 외부에서도 렌더러 접근 가능하게 노출 (확장/디버깅용)
  window.StudyHub = { renderMarkdown: renderMarkdown, renderCheckQuestions: renderCheckQuestions };
})();

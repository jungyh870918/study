#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
면접 대비 학습 허브 — 정적 사이트 생성기
============================================
동작:
  1. ./md/ 안의 {번호}_{주제}_{분류}.md 파일을 전부 읽는다.
  2. 파일명을 파싱해 주제(topic)별로 그룹핑한다.
  3. index.html + 각 문서별 doc_*.html 을 생성한다.
  4. 원문 텍스트를 그대로 JS 문자열로 페이지에 심어(무손실),
     브라우저에서 마크다운→HTML 렌더링한다.

새 주제 추가 절차는 README.md 참조 (핵심: md 파일만 넣고 재실행).
"""

import os, re, json, glob, html

HERE = os.path.dirname(os.path.abspath(__file__))
MD_DIR = os.path.join(HERE, "md")
OUT_DIR = HERE  # index.html / doc_*.html 을 여기에 출력

# ---- 분류(kind) 메타: 라벨/설명/색상. 새 분류가 생기면 여기에 추가 ----
KIND_META = {
    "answering_technique": {"label": "답변 기술",  "desc": "설명이 뭉개질 때 쓰는 3단 템플릿·화법",       "color": "#7c3aed"},
    "basic":              {"label": "기본 설명",  "desc": "정의 → 핵심 개념 → 문제·인과관계",            "color": "#0b8a8f"},
    "supplement":         {"label": "부가 설명",  "desc": "한 번 더 파고들 난이도 있는 개념 보충",         "color": "#0b6fa8"},
    "essentials":         {"label": "완전 기초",  "desc": "모르면 치명적인 필수 상식",                    "color": "#c2410c"},
    "checkquestions":     {"label": "확인 질문",  "desc": "자가 점검용 — 클릭해 펼치는 접이식 목록",        "color": "#b45309"},
    "practical":          {"label": "실전편",     "desc": "명령어·구현·경험 서술 포인트",                 "color": "#15803d"},
    "tech_association":   {"label": "기술 연상 사전", "desc": "기술명 → 즉시 따라나올 실무 키워드 묶음",     "color": "#9333ea"},
    "overview":           {"label": "프로젝트 개요", "desc": "왜 이렇게 설계했나 · 문제→선택→이유→결과",   "color": "#0891b2"},
    "techdeep":           {"label": "기술 심화",    "desc": "구체적으로 어떻게 짰나 · 파일·구조·라이브러리", "color": "#4f46e5"},
    "dbaccess":           {"label": "DB 접근 전략",  "desc": "ORM & 생 SQL · 실제 코드 기반",              "color": "#6366f1"},
    "backendfiles":       {"label": "백엔드 파일 분류","desc": "실측 파일 역할 · 런타임 표면적 · 레거시",     "color": "#7c3aed"},
    "nextfeatures":       {"label": "Next.js 활용", "desc": "App Router 기능별 실제 구현 정리",             "color": "#0f172a"},
    "sqlmastery":         {"label": "SQL 실전 범위","desc": "실제 프로젝트 쿼리로 본 다뤄본 범위",           "color": "#155e75"},
    "authimpl":           {"label": "인증 구현",    "desc": "JWT·리프레시 로테이션·OAuth·가드 실제 코드",  "color": "#be123c"},
    "glossary":           {"label": "용어 체크리스트","desc": "상식 수준 용어 — 한 줄로 설명 가능해야",     "color": "#0d9488"},
    "whiteboard":         {"label": "화이트보드",  "desc": "그려보세요 요청 — ERD·아키텍처·흐름도",       "color": "#7c2d12"},
    "stackdeep":          {"label": "스택 심화",    "desc": "라이브러리 동작 원리·구현 디테일",          "color": "#4338ca"},
    "dbprisma":           {"label": "Prisma 기본",  "desc": "셋업·스키마·쿼리·트랜잭션",                  "color": "#0e7490"},
    "serialization":      {"label": "직렬화",      "desc": "서버↔클라 데이터 통신·plain object",        "color": "#0f172a"},
}
DEFAULT_KIND = {"label": "문서", "desc": "학습 문서", "color": "#0b8a8f"}

# ---- 주제(topic) 표시 이름. 새 주제가 생기면 여기에 추가 ----
TOPIC_LABEL = {
    "network": "네트워크",
    "db": "데이터베이스",
    "algorithm": "자료구조·알고리즘",
    "algo": "자료구조·알고리즘",
    "sysdesign": "시스템 디자인",
    "devops": "CI/CD·쿠버네티스",
    "frontend": "인증·프론트엔드",
    "domain": "도메인 설계 사례",
    "codeit": "코드잇 알고리즘 실습",
    "dsimpl": "자료구조 직접 구현",
    "ds": "자료구조·알고리즘",
    "os": "운영체제",
    "voyage": "프로젝트: Voyage",
    "jceye": "프로젝트: 병원결제(Next)",
    "allscape": "프로젝트: 감리시스템(SQL)",
    "authsrv": "프로젝트: 인증서버(Nest)",
    "butter": "프로젝트: Butter",
}

# 분류 정렬 우선순위(카드 나열 순서)
KIND_ORDER = ["basic", "supplement", "essentials", "checkquestions", "practical", "overview", "techdeep", "dbaccess", "backendfiles", "nextfeatures", "sqlmastery", "authimpl", "glossary", "whiteboard", "stackdeep", "dbprisma", "serialization"]


def parse_filename(fn):
    """'1_network_basic.md' -> (num=1, topic='network', kind='basic')
       '0_answering_technique.md' -> (0, None, 'answering_technique')"""
    stem = fn[:-3] if fn.endswith(".md") else fn
    m = re.match(r"^(\d+)_(.+)$", stem)
    if not m:
        return (999, None, stem)
    num = int(m.group(1))
    rest = m.group(2)
    # 공통 문서: 0_answering_technique (주제 없음)
    # rest 전체가 분류명이면 공통 문서(주제 없음). 예: answering_technique, tech_association
    if rest in KIND_META and TOPIC_LABEL.get(rest) is None:
        return (num, None, rest)
    parts = rest.split("_")
    # 마지막 토큰이 알려진 분류면 그걸 kind로, 앞을 topic으로
    if parts[-1] in KIND_META:
        kind = parts[-1]
        topic = "_".join(parts[:-1]) if len(parts) > 1 else None
    else:
        kind = rest
        topic = None
    if topic == "":
        topic = None
    return (num, topic, kind)


def first_heading(md):
    for line in md.splitlines():
        m = re.match(r"^#\s+(.*)$", line.strip())
        if m:
            return m.group(1).strip()
    return None


def one_line_desc(md):
    """맨 위 인용(>) 첫 줄을 문서 한 줄 설명으로 사용."""
    for line in md.splitlines():
        s = line.strip()
        if s.startswith(">"):
            return s.lstrip("> ").strip()
    return None


def plain_text_for_search(md):
    """검색 인덱스용 평문화: 마크다운 기호 최소 제거(내용은 보존)."""
    t = md
    t = re.sub(r"```.*?```", " ", t, flags=re.S)   # 코드블록은 통째 요약 제거(검색 노이즈↓)
    t = re.sub(r"[#>*`|]", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def collect():
    docs = []
    for path in sorted(glob.glob(os.path.join(MD_DIR, "*.md"))):
        fn = os.path.basename(path)
        with open(path, encoding="utf-8") as f:
            md = f.read()
        num, topic, kind = parse_filename(fn)
        meta = KIND_META.get(kind, DEFAULT_KIND)
        title = first_heading(md) or fn
        # 제목에서 [문서N] 접두 정리한 짧은 이름
        short = re.sub(r"^\[[^\]]+\]\s*", "", title)
        short = re.sub(r"\s*—.*$", "", short).strip() or title
        docs.append({
            "file": fn,
            "num": num,
            "topic": topic,
            "kind": kind,
            "meta": meta,
            "title": title,
            "short": short,
            "desc": one_line_desc(md) or meta["desc"],
            "lines": md.count("\n") + 1,
            "chars": len(md),
            "markdown": md,
            "search_text": plain_text_for_search(md),
            "slug": "doc_" + os.path.splitext(fn)[0] + ".html",
            "is_check": kind == "checkquestions",
        })
    return docs


# ------------------------------------------------------------------
# HTML 조각
# ------------------------------------------------------------------
def topbar(active="", search_index_json=""):
    return f"""<div class="progress-bar"></div>
<header class="topbar">
  <a class="brand" href="index.html">
    <span class="sig">◈</span> <span class="full">면접 대비 학습 허브</span>
  </a>
  <a class="nav-link hide-sm" href="index.html">index</a>
  <div class="spacer"></div>
  <div class="search-box">
    <span class="icon">⌕</span>
    <input id="search-input" type="search" placeholder="전체 검색  (Ctrl+/)" autocomplete="off">
  </div>
  <button id="theme-toggle" class="icon-btn" type="button" aria-label="테마 전환">☾</button>
</header>
<div id="search-results" class="search-results">
  <div class="panel">
    <div class="sr-head"><span>검색 결과</span><span class="sr-count"></span></div>
    <div class="sr-list"></div>
  </div>
</div>
<script>window.SEARCH_INDEX = {search_index_json};</script>"""


def build_index(docs):
    # 검색 인덱스(전 문서)
    search_index = [{
        "title": d["short"], "kind": d["meta"]["label"],
        "url": d["slug"], "text": d["search_text"]
    } for d in docs]
    sidx = json.dumps(search_index, ensure_ascii=False)

    # 공통 문서(주제 없음) 와 주제별 그룹 분리
    common = [d for d in docs if d["topic"] is None]
    topics = {}
    for d in docs:
        if d["topic"] is None:
            continue
        topics.setdefault(d["topic"], []).append(d)

    total_lines = sum(d["lines"] for d in docs)

    # ---- 공통 문서 배너 ----
    common_html = ""
    for d in common:
        common_html += f"""  <a class="common-card" href="{d['slug']}">
    <span class="tag">공통</span>
    <span class="body"><h3>{html.escape(d['short'])}</h3><p>{html.escape(d['desc'])}</p></span>
  </a>
"""

    # ---- 주제 그룹 (JS로 렌더하지 않고 서버 사이드 생성하되,
    #      문서 배열 자체를 아래 DOCS 로 노출해 확장 편의 제공) ----
    groups_html = ""
    for topic, items in topics.items():
        items.sort(key=lambda x: (KIND_ORDER.index(x["kind"]) if x["kind"] in KIND_ORDER else 99, x["num"]))
        label = TOPIC_LABEL.get(topic, topic)
        cards = ""
        for d in items:
            c = d["meta"]["color"]
            unit = "질문" if d["is_check"] else "줄"
            cards += f"""    <a class="doc-card" href="{d['slug']}" style="--kind-color:{c}">
      <span class="kind">{html.escape(d['meta']['label'])}</span>
      <h3>{html.escape(d['short'])}</h3>
      <p>{html.escape(d['desc'])}</p>
      <span class="meta"><span>{d['lines']} {unit if not d['is_check'] else '줄'}</span><span>#{d['num']}</span></span>
    </a>
"""
        groups_html += f"""  <section class="topic-group">
    <div class="group-head">
      <h2>{html.escape(label)}</h2>
      <span class="count">{len(items)}개 문서</span>
      <span class="rule"></span>
    </div>
    <div class="card-grid">
{cards}    </div>
  </section>
"""

    # 확장용: 문서 목록 데이터(주석 포함) — 유지보수자가 참고
    docs_data = [{
        "file": d["file"], "topic": d["topic"], "kind": d["kind"],
        "title": d["short"], "url": d["slug"], "lines": d["lines"]
    } for d in docs]
    docs_json = json.dumps(docs_data, ensure_ascii=False, indent=2)

    page = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>면접 대비 학습 허브</title>
<!-- ============================================================
     이 사이트는 build.py 로 생성됩니다. (수동 편집보다 재생성 권장)
     ────────────────────────────────────────────────────────────
     ▷ 새 주제(DB, 알고리즘 등) 추가 방법
       1) ./md/ 폴더에 규칙대로 파일을 넣는다:
            {{번호}}_{{주제}}_{{분류}}.md
            예) 10_db_basic.md, 11_db_supplement.md ...
          분류는 basic / supplement / essentials / checkquestions / practical.
       2) build.py 상단의 TOPIC_LABEL 딕셔너리에 주제 표시명을 추가한다:
            "db": "데이터베이스",
          (안 넣으면 파일명 그대로 표시됨)
       3) `python3 build.py` 재실행 → 카드가 자동 생성된다.
     새 분류를 만들고 싶다면 build.py 의 KIND_META 에 항목을 추가하면 된다.
     ============================================================ -->
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
{topbar('index', sidx)}

<main class="hub">
  <section class="hub-hero">
    <div class="eyebrow">Interview Prep · Study Hub</div>
    <h1>면접 대비 학습 자료,<br>한 곳에서 진단하듯 훑는다.</h1>
    <p>정의 → 핵심 → 문제·인과의 리듬으로 정리된 문서 모음. 원문 무손실로 렌더링하며,
       전체 검색·목차·다크모드를 지원합니다. 주제는 계속 추가됩니다.</p>
    <div class="stat-row">
      <span><b>{len(docs)}</b> 문서</span>
      <span><b>{len(topics)}</b> 주제</span>
      <span><b>{total_lines:,}</b> 줄</span>
    </div>
  </section>

  <!-- 공통 문서(모든 주제 공통, 최상단 배치) -->
{common_html}
  <!-- 주제별 그룹 (여기 아래로 DB·알고리즘 그룹이 자동 추가됨) -->
{groups_html}
</main>

<!-- 유지보수 참고용 문서 인덱스(콘솔에서 window.DOCS 로 확인 가능).
     실제 카드 렌더는 build.py 가 담당하므로, 파일 추가 후 재빌드만 하면 됩니다. -->
<script>
/* 여기에 새 주제 추가 — 가 아니라, ./md 에 파일을 넣고 build.py 를 재실행하세요.
   아래는 현재 생성된 문서 목록의 스냅샷입니다. */
window.DOCS = {docs_json};
</script>
<script src="assets/app.js"></script>
</body>
</html>"""
    with open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)


def build_doc(doc, prev_doc, next_doc, search_index_json):
    # 원문을 그대로 스크립트 태그에 넣는다. </script> 조기 종료만 방지.
    md_raw = doc["markdown"].replace("</script", "<\\/script")
    prev_html = (f'<a href="{prev_doc["slug"]}">← {html.escape(prev_doc["short"])}</a>'
                 if prev_doc else '<span></span>')
    next_html = (f'<a href="{next_doc["slug"]}">{html.escape(next_doc["short"])} →</a>'
                 if next_doc else '<span></span>')

    page = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(doc['short'])} · 학습 허브</title>
<!-- ============================================================
     이 페이지 갱신법:
       (권장) md/ 파일 수정 후  python3 build.py  재실행.
       (수동) 아래 <script type="text/markdown" id="doc-source"> 태그 안의
              텍스트만 새 md 원문으로 교체 → 저장 → 새로고침.
              HTML 구조/디자인/기능은 건드릴 필요 없음.
              (검색 인덱스 최신화는 재빌드 필요)
     ============================================================ -->
<link rel="stylesheet" href="assets/style.css">
<!-- 코드 강조: 인터넷 있으면 highlight.js 적용, 없으면 무시(핵심 동작 무관) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
</head>
<body>
{topbar('', search_index_json)}

<div class="reader-shell">
  <aside class="toc" id="toc">
    <div class="toc-title" id="toc-toggle">목차 (TOC)</div>
    <nav class="toc-body" id="toc-body"></nav>
  </aside>

  <main class="reader-main">
    <nav class="doc-nav">
      <a href="index.html">⌂ index</a>
      <span class="spacer"></span>
      {prev_html}
      {next_html}
    </nav>
    <article class="prose" id="doc-body"></article>
  </main>
</div>

<!-- ============================================================
     ▼▼▼ 문서 원문(마크다운) ▼▼▼
     여기 이 <script type="text/markdown"> 태그 "안의 텍스트만" 새 md로
     교체하면 페이지가 갱신됩니다. HTML 구조는 건드릴 필요 없습니다.
     (주의: 본문에 </script> 문자열이 있으면 <\\/script> 로 적어야 함 — 거의 없음)
     ============================================================ -->
<script type="text/markdown" id="doc-source">
{md_raw}
</script>

<script>
/* 위 스크립트 태그의 원문을 그대로 읽어 렌더링합니다(무손실). */
window.STUDY_DATA = {{
  sourceId: "doc-source",
  isCheckQuestions: {str(doc['is_check']).lower()}
}};
window.SEARCH_INDEX = {search_index_json};
</script>
<!-- marked.js: 있으면 사용, 없으면(오프라인) 내장 렌더러로 폴백 -->
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script src="assets/app.js"></script>
</body>
</html>"""
    with open(os.path.join(OUT_DIR, doc["slug"]), "w", encoding="utf-8") as f:
        f.write(page)


def main():
    docs = collect()
    if not docs:
        print("md/ 에 마크다운 파일이 없습니다.")
        return
    # 문서 정렬: 인덱스 페이지의 그룹 배치와 동일하게 (이전/다음 네비게이션 순서)
    # (1) 공통 문서(topic=None) 먼저, (2) 토픽이 처음 등장하는 번호순으로 그룹,
    # (3) 그룹 내에서는 KIND_ORDER → 번호순. 이렇게 해야 prev/next가 목차 순서와 일치.
    _topic_first = {}
    for d in docs:
        t = d["topic"]
        if t is not None and t not in _topic_first:
            _topic_first[t] = d["num"]

    def _nav_key(d):
        if d["topic"] is None:
            # 공통 문서: 맨 앞, 번호순
            return (0, d["num"], 0, 0)
        group_rank = _topic_first[d["topic"]]
        kind_rank = KIND_ORDER.index(d["kind"]) if d["kind"] in KIND_ORDER else 99
        return (1, group_rank, kind_rank, d["num"])

    docs.sort(key=_nav_key)

    search_index = [{
        "title": d["short"], "kind": d["meta"]["label"],
        "url": d["slug"], "text": d["search_text"]
    } for d in docs]
    sidx = json.dumps(search_index, ensure_ascii=False)

    build_index(docs)
    for i, d in enumerate(docs):
        prev_doc = docs[i - 1] if i > 0 else None
        next_doc = docs[i + 1] if i < len(docs) - 1 else None
        build_doc(d, prev_doc, next_doc, sidx)

    print(f"생성 완료: index.html + {len(docs)}개 문서 페이지")
    for d in docs:
        print(f"  - {d['slug']:<34} ({d['meta']['label']}, {d['lines']}줄)")


if __name__ == "__main__":
    main()

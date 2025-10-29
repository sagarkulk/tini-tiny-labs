import React, { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import wordSets from "../data/wordSets.json";
import "../components/styles/App.WordScramble.css";

const SHOW_SECONDS = 10;
const SUCCESS_DELAY = 5;
const FS_MIN = 16;
const FS_MAX = 44;
const PREFETCH_AHEAD = 2;

const DM_MASKS = {
  easy: ["???", "????", "?????"],
  medium: ["??????", "???????"],
  hard: ["????????", "?????????"]
};

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function isAlpha(s) { return /^[A-Za-z]+$/.test(s); }

const FETCH_TIMEOUT_MS = 1300;
async function fetchJson(u, { timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(u, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(t);
  }
}

const DEF_CACHE = new Map();
const defKey = (w) => `ws_def_${w}`;
function readLS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
function getCachedDef(w) {
  const key = defKey(w);
  if (DEF_CACHE.has(key)) return DEF_CACHE.get(key);
  const v = readLS(key);
  if (typeof v === "string" && v) {
    DEF_CACHE.set(key, v);
    return v;
  }
  return null;
}
function setCachedDef(w, def) {
  const key = defKey(w);
  DEF_CACHE.set(key, def);
  writeLS(key, def);
}

function parseDefFromDatamuseDefs(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  const p = arr[0].split("\t");
  return p.length > 1 ? p.slice(1).join("\t") : arr[0];
}

async function fetchDefinition(word) {
  const w = String(word).toLowerCase();
  const c = getCachedDef(w);
  if (c) return c;
  try {
    const d1 = await fetchJson(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`,
      { timeoutMs: 1200 }
    );
    const def1 =
      d1?.[0]?.meanings?.[0]?.definitions?.[0]?.definition ||
      d1?.[0]?.meanings?.flatMap((m) => m.definitions || [])?.[0]?.definition;
    if (def1) { setCachedDef(w, def1); return def1; }
  } catch {}
  try {
    const d2 = await fetchJson(
      `https://api.datamuse.com/words?sp=${encodeURIComponent(w)}&md=d&max=1`,
      { timeoutMs: 900 }
    );
    const def2 = d2?.[0]?.defs ? parseDefFromDatamuseDefs(d2[0].defs) : null;
    if (def2) { setCachedDef(w, def2); return def2; }
  } catch {}
  return null;
}

async function getDatamuseWord(d = "easy") {
  const mask = pick(DM_MASKS[d] || DM_MASKS.easy);
  const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(mask)}&md=d&max=30`;
  const list = await fetchJson(url, { timeoutMs: 1200 });
  const c = list.filter((x) => x?.word && isAlpha(x.word) && Array.isArray(x.defs) && x.defs.length);
  if (!c.length) return null;
  const item = pick(c);
  const def = parseDefFromDatamuseDefs(item.defs);
  return def ? { word: item.word.toLowerCase(), definition: def } : null;
}

async function getFallbackRandom(d = "easy") {
  const len = pick({ easy: [4, 5], medium: [6, 7], hard: [8, 9, 10] }[d] || [4, 8]);
  const [w] = await fetchJson(
    `https://random-word-api.herokuapp.com/word?number=1&length=${len}`,
    { timeoutMs: 1000 }
  );
  if (!w || !isAlpha(w)) return null;
  const def = await fetchDefinition(w);
  return def ? { word: w.toLowerCase(), definition: def } : null;
}

async function fetchWordFromAPI(d = "easy") {
  try {
    const dm = await getDatamuseWord(d);
    if (dm) return dm;
  } catch {}
  try {
    const fb = await getFallbackRandom(d);
    if (fb) return fb;
  } catch {}
  return null;
}

function getQueryMode() {
  if (typeof window === "undefined") return null;
  const qs = new URLSearchParams(window.location.search);
  const m = qs.get("mode");
  return m ? m.toLowerCase() : null;
}

function getCustomSet(modeId) {
  if (!modeId || !wordSets?.sets?.length) return null;
  const set = wordSets.sets.find((s) => s.id?.toLowerCase() === modeId.toLowerCase());
  if (!set || !Array.isArray(set.words) || !set.words.length) return null;
  const words = set.words.map((w) => String(w).trim().toLowerCase()).filter((w) => w && isAlpha(w));
  return words.length ? { id: set.id, label: set.label || set.id, words } : null;
}
function getRawSet(modeId) {
  if (!modeId || !wordSets?.sets?.length) return null;
  return wordSets.sets.find((s) => s.id?.toLowerCase() === modeId.toLowerCase()) || null;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const queueKey = (modeId) => `wsq_${modeId}`;
function sanitizeQueueWords(queue, allowed) {
  const S = new Set(allowed);
  return queue.filter((w) => S.has(w));
}
function loadQueue(modeId, words) {
  try {
    const raw = sessionStorage.getItem(queueKey(modeId));
    if (raw) {
      const parsed = JSON.parse(raw);
      let queue = Array.isArray(parsed.queue) ? parsed.queue.map(String) : [];
      let idx = Number.isInteger(parsed.idx) ? parsed.idx : 0;
      queue = sanitizeQueueWords(queue, words);
      if (!queue.length) queue = shuffle(words);
      idx = Math.min(Math.max(0, idx), Math.max(0, queue.length - 1));
      return { modeId, queue, idx };
    }
  } catch {}
  return { modeId, queue: shuffle(words), idx: 0 };
}
function saveQueue(state) {
  try {
    sessionStorage.setItem(queueKey(state.modeId), JSON.stringify({ queue: state.queue, idx: state.idx }));
  } catch {}
}
function nextFromQueue(state) {
  if (!state.queue.length) return null;
  const w = state.queue[state.idx];
  state.idx += 1;
  if (state.idx >= state.queue.length) {
    state.queue = shuffle(state.queue);
    state.idx = 0;
  }
  return w;
}

const scramble = (w) => {
  const letters = w.split("");
  const N = letters.length;
  if (N <= 1) return letters.map((l, i) => ({ id: `${l}-${i}-${Math.random().toString(36).slice(2)}`, letter: l }));
  const uniq = new Set(letters);
  let a = letters.slice();
  const join = (arr) => arr.join("");
  const original = join(letters);
  for (let attempts = 0; attempts < 8; attempts++) {
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (join(a) !== original) break;
  }
  if (join(a) === original && uniq.size > 1) {
    outer: for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        if (letters[i] !== letters[j]) {
          a = letters.slice();
          [a[i], a[j]] = [a[j], a[i]];
          break outer;
        }
      }
    }
  }
  if (join(a) === original && uniq.size === 1) a = letters.slice(1).concat(letters[0]);
  return a.map((l, i) => ({ id: `${l}-${i}-${Math.random().toString(36).slice(2)}`, letter: l }));
};

function useDebounced(fn, d) {
  const t = useRef();
  return useMemo(
    () => (...a) => {
      clearTimeout(t.current);
      t.current = setTimeout(() => fn(...a), d);
    },
    [fn, d]
  );
}

export default function WordScramble() {
  const [difficulty, setDifficulty] = useState("easy");
  const [autoNext, setAutoNext] = useState(false);
  const [wordData, setWordData] = useState(null);
  const [scrambled, setScrambled] = useState([]);
  const [dragged, setDragged] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showWord, setShowWord] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(SHOW_SECONDS);
  const [successCountdown, setSuccessCountdown] = useState(0);
  const [inSuccess, setInSuccess] = useState(false);

  const [fitFontSize, setFitFontSize] = useState(32);
  const [fitGap, setFitGap] = useState(6);

  const [isTouch, setIsTouch] = useState(false);
  const [roundKey, setRoundKey] = useState(0);
  const [canShowScramble, setCanShowScramble] = useState(false);
  const [reservedHeight, setReservedHeight] = useState(0);
  const reservedHeightRef = useRef(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const loadingRef = useRef(false);
  const activeRoundRef = useRef(0);
  const revealTimeout = useRef(null);
  const successTimeout = useRef(null);
  const successInterval = useRef(null);

  const containerRef = useRef(null);
  const scrambleWrapRef = useRef(null);
  const sectionRef = useRef(null);

  const queryMode = useMemo(() => getQueryMode(), []);
  const customSet = useMemo(() => getCustomSet(queryMode), [queryMode]);
  const rawCustomSet = useMemo(() => getRawSet(queryMode), [queryMode]);
  const queueRef = useRef(null);
  const prefetchQRef = useRef([]);

  useEffect(() => {
    setIsTouch(
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
      (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
    );
  }, []);

  useEffect(() => {
    if (customSet) {
      queueRef.current = loadQueue(customSet.id, customSet.words);
      saveQueue(queueRef.current);
      prefetchQRef.current = [];
      ensurePrefetch();
    } else {
      queueRef.current = null;
      prefetchQRef.current = [];
      ensurePrefetch();
    }
  }, [customSet?.id, difficulty]);

  useEffect(() => { if (isCorrect) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); }, [isCorrect]);

  const safeClearTimers = () => {
    clearTimeout(revealTimeout.current);
    clearTimeout(successTimeout.current);
    clearInterval(successInterval.current);
  };

  async function ensurePrefetch() {
    const need = Math.max(0, PREFETCH_AHEAD - prefetchQRef.current.length);
    if (need === 0) return;
    const tasks = [];
    for (let i = 0; i < need; i++) {
      if (customSet && queueRef.current) {
        const w = nextFromQueue(queueRef.current);
        saveQueue(queueRef.current);
        tasks.push(
          (async () => {
            const def = await fetchDefinition(w);
            if (!def) return null;
            const key = w.toLowerCase?.() ? w.toLowerCase() : String(w).toLowerCase();
            const info = rawCustomSet?.info?.[key] || null;
            return { word: key, definition: def, info };
          })()
        );
      } else {
        tasks.push(
          (async () => {
            const dm = await fetchWordFromAPI(difficulty);
            return dm;
          })()
        );
      }
    }
    try {
      const results = await Promise.allSettled(tasks);
      const goods = results.map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean);
      prefetchQRef.current.push(...goods);
    } catch {}
  }

  async function takeFromPrefetchOrFetch() {
    if (prefetchQRef.current.length > 0) {
      const item = prefetchQRef.current.shift();
      ensurePrefetch();
      return item;
    }
    if (customSet && queueRef.current) {
      const w = nextFromQueue(queueRef.current);
      saveQueue(queueRef.current);
      const def = await fetchDefinition(w);
      if (!def) return null;
      const key = w.toLowerCase?.() ? w.toLowerCase() : String(w).toLowerCase();
      const info = rawCustomSet?.info?.[key] || null;
      return { word: key, definition: def, info };
    }
    try {
      return await fetchWordFromAPI(difficulty);
    } catch {
      return null;
    }
  }

  function setReservedMax(h) {
    const nh = Math.max(reservedHeightRef.current || 0, h || 0);
    reservedHeightRef.current = nh;
    setReservedHeight(nh);
  }

  async function loadNewWord() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setIsCorrect(false);
    setInSuccess(false);
    setSuccessCountdown(0);
    setSelected(null);
    setDragged(null);
    safeClearTimers();

    const prevH = sectionRef.current?.offsetHeight || 0;
    if (prevH > 0) setReservedMax(prevH);

    setScrambled([]);
    setShowWord(false);
    setCanShowScramble(false);

    const myRound = activeRoundRef.current + 1;
    activeRoundRef.current = myRound;

    const data = await takeFromPrefetchOrFetch();

    if (myRound !== activeRoundRef.current) {
      loadingRef.current = false;
      setLoading(false);
      return;
    }
    if (!data) {
      loadingRef.current = false;
      setLoading(false);
      alert("⚠️ Couldn't get a word+definition. Please try again.");
      return;
    }

    setWordData(data);
    setCountdown(SHOW_SECONDS);
    setRoundKey((k) => k + 1);

    let nextScramble;
    try {
      nextScramble = scramble(data.word);
      if (!Array.isArray(nextScramble) || nextScramble.length === 0) {
        nextScramble = data.word.split("").map((l, i) => ({ id: `${l}-${i}-${Math.random().toString(36).slice(2)}`, letter: l }));
      }
    } catch {
      nextScramble = data.word.split("").map((l, i) => ({ id: `${l}-${i}-${Math.random().toString(36).slice(2)}`, letter: l }));
    }
    setScrambled(nextScramble);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowWord(true);
        setIsTransitioning(false);            // <-- allow reveal to render
        setCanShowScramble(false);
        requestAnimationFrame(() => {
          const revealH = sectionRef.current?.offsetHeight || 0;
          if (revealH > 0) setReservedMax(revealH);
        });
        revealTimeout.current = setTimeout(() => {
          if (myRound !== activeRoundRef.current) return;
          setShowWord(false);
          setCanShowScramble(true);
          requestAnimationFrame(() => {
            const scrambleH = sectionRef.current?.offsetHeight || 0;
            if (scrambleH > 0) setReservedMax(scrambleH);
          });
        }, SHOW_SECONDS * 1000);
      });
    });

    ensurePrefetch();
    loadingRef.current = false;
    setLoading(false);
  }

  useEffect(() => {
    if (!showWord) return;
    setCountdown(SHOW_SECONDS);
    const id = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [showWord, wordData?.word]);

  const doFit = useDebounced(() => {
    if (!containerRef.current || !wordData?.word) return;
    const cw = containerRef.current.clientWidth;
    const n = Math.max(1, wordData.word.length);
    const targetGap = Math.max(2, Math.min(8, 10 - Math.floor(n / 2)));
    const usable = cw - n * 40 - targetGap * (n - 1);
    const fsByWidth = usable / (0.65 * n);
    const bonus = n <= 5 ? 6 : 0;
    const desired = Math.max(FS_MIN, Math.min(FS_MAX, Math.floor(fsByWidth + bonus)));
    setFitFontSize(desired);
    setFitGap(targetGap);
  }, 120);

  useEffect(() => {
    doFit();
    const ro = new ResizeObserver(() => doFit());
    if (containerRef.current) ro.observe(containerRef.current);
    const onResize = () => doFit();
    window.addEventListener("resize", onResize);
    return () => {
      try { ro.disconnect(); } catch {}
      window.removeEventListener("resize", onResize);
    };
  }, [wordData?.word, doFit]);

  const commitMove = (from, to) => {
    if (loadingRef.current || loading || inSuccess || from == null || to == null || from === to) return;
    const next = [...scrambled];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setScrambled(next);
    const arranged = next.map((x) => x.letter).join("");
    const correct = arranged.toLowerCase() === wordData.word.toLowerCase();
    setIsCorrect(correct);
    if (correct && autoNext && !inSuccess) {
      setSelected(null);
      setDragged(null);
      const h = sectionRef.current?.offsetHeight || 0;
      if (h > 0) setReservedMax(h);
      setInSuccess(true);
      setShowWord(false);
      setSuccessCountdown(SUCCESS_DELAY);
      successInterval.current = setInterval(() => setSuccessCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
      successTimeout.current = setTimeout(() => {
        clearInterval(successInterval.current);
        setInSuccess(false);
        setIsCorrect(false);
        setIsTransitioning(true);
        setCanShowScramble(false);
        setShowWord(false);
        setScrambled([]);
        reservedHeightRef.current = sectionRef.current?.offsetHeight || reservedHeightRef.current || 0;
        setReservedHeight(reservedHeightRef.current);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { loadNewWord(); });
        });
      }, SUCCESS_DELAY * 1000);
    }
  };

  const handleDragStart = (i) => { if (!isCorrect && !loading && !inSuccess) setDragged(i); };
  const handleDrop = (i) => { if (isCorrect || dragged == null || loading || inSuccess) return; commitMove(dragged, i); setDragged(null); };
  const handleTouchTap = (i) => {
    if (isCorrect || loading || inSuccess) return;
    if (selected == null) setSelected(i);
    else if (selected === i) setSelected(null);
    else { commitMove(selected, i); setSelected(null); }
  };

  useEffect(() => () => {
    clearTimeout(revealTimeout.current);
    clearTimeout(successTimeout.current);
    clearInterval(successInterval.current);
  }, []);

  return (
    <div className="container ws" style={{ position: "relative" }}>
      <h2>🧩 Word Scramble Game</h2>

      <div className="controls">
        <label>Difficulty:</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          disabled={!!customSet || loading || inSuccess || isTransitioning}
          aria-label="Select difficulty"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={autoNext}
            onChange={(e) => setAutoNext(e.target.checked)}
            disabled={loading || inSuccess || isTransitioning}
          />
          Auto-load after success
        </label>

        {customSet ? (
          <span className="pill" style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid var(--divider)", background: "var(--header-bg)" }}>
            Mode: {customSet.label}
          </span>
        ) : null}

        <button
          className="button"
          onClick={() => {
            setIsTransitioning(true);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => { loadNewWord(); });
            });
          }}
          disabled={loading || inSuccess || loadingRef.current || isTransitioning}
          aria-busy={loading || loadingRef.current || isTransitioning}
          style={{ minWidth: 160 }}
        >
          🔁 Load New Word
        </button>
      </div>

      {wordData && (
        <div
          ref={sectionRef}
          className="word-section"
          style={{
            opacity: loading ? 0.85 : 1,
            minHeight: reservedHeight ? reservedHeight : undefined,
            overflow: reservedHeight ? "hidden" : undefined,
            overflowAnchor: "none",
            contain: "layout"
          }}
        >
          {!inSuccess && <p className="meaning">{wordData.definition}</p>}
          {customSet && wordData?.info ? <p className="info-line"><b>more info:</b> {wordData.info}</p> : null}

          {showWord && (
            <div className="word-wrap">
              <h2 className="word show-word">{wordData.word.toUpperCase()}</h2>
              <p className="hint-text">💡 Remember the spelling...</p>
              <div className="countdown-badge" aria-live="polite">{countdown}</div>
            </div>
          )}

          <div
            className={`scramble-wrap ${!showWord && canShowScramble ? "on" : "off"}`}
            ref={scrambleWrapRef}
          >
            {!showWord && canShowScramble && (
              <>
                {!isCorrect && !inSuccess && (
                  <>
                    <p className="hint-text">🌀 Now rearrange!</p>
                    <h3 className="scramble-title">Rearrange the letters:</h3>
                  </>
                )}
                <div
                  key={roundKey}
                  className="scramble-container"
                  ref={containerRef}
                  style={{ "--gap": `${fitGap}px`, "--fs": `${fitFontSize}px` }}
                >
                  {scrambled.map((item, index) => {
                    const sel = selected === index;
                    return (
                      <div
                        key={item.id}
                        className={`letter ${isCorrect ? "correct" : ""}`}
                        style={sel ? { outline: "3px solid var(--accent, #4ade80)", outlineOffset: "2px" } : undefined}
                        draggable={!isCorrect && !isTouch && !loading && !inSuccess}
                        onDragStart={!isTouch ? () => handleDragStart(index) : undefined}
                        onDragOver={!isTouch ? (e) => e.preventDefault() : undefined}
                        onDrop={!isTouch ? () => handleDrop(index) : undefined}
                        onClick={isTouch ? () => handleTouchTap(index) : undefined}
                        role="button"
                        aria-label={`Letter ${item.letter.toUpperCase()}`}
                      >
                        {item.letter.toUpperCase()}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {inSuccess && autoNext && (
            <div className="success-panel" aria-live="polite" style={{ marginTop: 8 }}>
              Next word in {successCountdown}s…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

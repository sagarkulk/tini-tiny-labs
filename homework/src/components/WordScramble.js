import React, { useState, useEffect, useRef, useMemo } from "react";
import confetti from "canvas-confetti";
import "../components/styles/App.WordScramble.css";

const SHOW_SECONDS = 10;
const SUCCESS_DELAY = 5;
const FS_MIN = 16;
const FS_MAX = 44;
const GAP_PX = 10;

const DM_MASKS = {
    easy: ["???", "????", "?????"],
    medium: ["??????", "???????"],
    hard: ["????????", "?????????"]
};

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function isAlpha(s) { return /^[A-Za-z]+$/.test(s); }

async function fetchJson(u) {
    const r = await fetch(u, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error();
    return r.json();
}
function parseDef(d) {
    if (!Array.isArray(d) || !d.length) return null;
    const p = d[0].split("\t");
    return p.length > 1 ? p.slice(1).join("\t") : d[0];
}
async function getWord(d = "easy") {
    const mask = pick(DM_MASKS[d] || DM_MASKS.easy);
    const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(mask)}&md=d&max=100`;
    const list = await fetchJson(url);
    const c = list.filter(
        (x) => x?.word && isAlpha(x.word) && Array.isArray(x.defs) && x.defs.length
    );
    if (!c.length) return null;
    const i = pick(c);
    const def = parseDef(i.defs);
    return def ? { word: i.word.toLowerCase(), definition: def } : null;
}
async function getFallback(d = "easy") {
    const len = pick({ easy: [4, 5], medium: [6, 7], hard: [8, 9, 10] }[d] || [4, 8]);
    const [w] = await fetchJson(
        `https://random-word-api.herokuapp.com/word?number=1&length=${len}`
    );
    if (!w || !isAlpha(w)) return null;
    const defs = await fetchJson(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`
    );
    const def =
        defs?.[0]?.meanings?.[0]?.definitions?.[0]?.definition ||
        defs?.[0]?.meanings?.flatMap((m) => m.definitions || [])?.[0]?.definition;
    return def ? { word: w.toLowerCase(), definition: def } : null;
}
async function fetchWord(d = "easy", t = 4) {
    for (let i = 0; i < t; i++) {
        try { const dm = await getWord(d); if (dm) return dm; } catch { }
        try { const fb = await getFallback(d); if (fb) return fb; } catch { }
    }
    return null;
}

const scramble = (w) => {
    const letters = w.split("");
    const N = letters.length;

    // If the word is 0–1 letters, just return as-is (can't rearrange meaningfully)
    if (N <= 1) {
        return letters.map((l, i) => ({
            id: `${l}-${i}-${Math.random().toString(36).slice(2)}`,
            letter: l
        }));
    }

    const uniq = new Set(letters);

    // Start with a copy and try Fisher–Yates up to a few times
    let a = letters.slice();
    const join = (arr) => arr.join("");
    const original = join(letters);

    // Try random shuffles first
    for (let attempts = 0; attempts < 8; attempts++) {
        for (let i = N - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        if (join(a) !== original) break; // success
    }

    // If still identical (can happen with duplicates), force a difference by swapping
    if (join(a) === original && uniq.size > 1) {
        // Find the first pair of different letters and swap them
        let i = 0, j = 1;
        outer: for (i = 0; i < N; i++) {
            for (j = i + 1; j < N; j++) {
                if (letters[i] !== letters[j]) {
                    a = letters.slice();
                    [a[i], a[j]] = [a[j], a[i]];
                    break outer;
                }
            }
        }
    }

    // If all letters are the same (e.g., "aaaa"), it's impossible to differ.
    // In that rare case, we'll rotate once so indexes differ (visual change),
    // though the string is the same—game logic will still treat it as solved immediately.
    if (join(a) === original && uniq.size === 1) {
        a = letters.slice(1).concat(letters[0]);
    }

    return a.map((l, i) => ({
        id: `${l}-${i}-${Math.random().toString(36).slice(2)}`,
        letter: l
    }));
};

function useDebounced(fn, d) {
    const t = useRef();
    return useMemo(() => (...a) => {
        clearTimeout(t.current);
        t.current = setTimeout(() => fn(...a), d);
    }, [fn, d]);
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
    const [isTouch, setIsTouch] = useState(false);
    const [roundKey, setRoundKey] = useState(0);

    const revealTimeout = useRef(null);
    const successTimeout = useRef(null);
    const successInterval = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        setIsTouch(
            (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
            (typeof window !== "undefined" &&
                window.matchMedia &&
                window.matchMedia("(pointer: coarse)").matches)
        );
    }, []);

    useEffect(() => {
        if (isCorrect)
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }, [isCorrect]);

    const safeClearTimers = () => {
        clearTimeout(revealTimeout.current);
        clearTimeout(successTimeout.current);
        clearInterval(successInterval.current);
    };

    const loadNewWord = async () => {
        setLoading(true);
        setIsCorrect(false);
        setInSuccess(false);
        setSuccessCountdown(0);
        safeClearTimers();

        // Hide any old UI to avoid flashing previous word/timer.
        setShowWord(false);
        setWordData(null);
        setScrambled([]);

        const data = await fetchWord(difficulty);
        if (!data) {
            setLoading(false);
            alert("⚠️ Could not fetch a new word. Try again.");
            return;
        }

        setWordData(data);
        setScrambled(scramble(data.word));
        setCountdown(SHOW_SECONDS);
        setRoundKey((k) => k + 1);

        requestAnimationFrame(() => {
            doFit();
            setShowWord(true); // only show once the new word is ready
            revealTimeout.current = setTimeout(() => {
                setShowWord(false);
            }, SHOW_SECONDS * 1000);
        });

        setLoading(false);
    };

    useEffect(() => {
        if (!showWord) return;
        setCountdown(SHOW_SECONDS);
        const id = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
        return () => clearInterval(id);
    }, [showWord, wordData?.word]);

    const doFit = useDebounced(() => {
        if (!containerRef.current || !wordData?.word) return;
        const cw = containerRef.current.clientWidth;
        const letters = wordData.word.length;
        const PAD_X = 24 * 2;
        const gap = GAP_PX;
        const fitsAt = (fs) => {
            const cubeWidth = fs * 0.65 + PAD_X;
            const total = cubeWidth * letters + gap * (letters - 1);
            return total <= cw;
        };
        let chosen = FS_MIN;
        for (let fs = FS_MAX; fs >= FS_MIN; fs--) {
            if (fitsAt(fs)) { chosen = fs; break; }
        }
        setFitFontSize(chosen);
    }, 120);

    useEffect(() => {
        doFit();
        const ro = new ResizeObserver(() => doFit());
        if (containerRef.current) ro.observe(containerRef.current);
        const onResize = () => doFit();
        window.addEventListener("resize", onResize);
        return () => {
            try { ro.disconnect(); } catch { }
            window.removeEventListener("resize", onResize);
        };
    }, [wordData?.word, doFit]);

    const commitMove = (from, to) => {
        if (loading || inSuccess || from == null || to == null || from === to) return;
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
            setInSuccess(true);          // enter success phase
            setShowWord(false);          // hide big word view if it was visible
            setSuccessCountdown(SUCCESS_DELAY);

            successInterval.current = setInterval(
                () => setSuccessCountdown((c) => (c <= 1 ? 0 : c - 1)),
                1000
            );

            successTimeout.current = setTimeout(() => {
                clearInterval(successInterval.current);
                setInSuccess(false);
                loadNewWord();
            }, SUCCESS_DELAY * 1000);
        }
    };

    const handleDragStart = (i) => { if (!isCorrect && !loading && !inSuccess) setDragged(i); };
    const handleDrop = (i) => {
        if (isCorrect || dragged == null || loading || inSuccess) return;
        commitMove(dragged, i);
        setDragged(null);
    };
    const handleTouchTap = (i) => {
        if (isCorrect || loading || inSuccess) return;
        if (selected == null) setSelected(i);
        else if (selected === i) setSelected(null);
        else { commitMove(selected, i); setSelected(null); }
    };

    useEffect(() => () => { safeClearTimers(); }, []);

    return (
        <div className="container" style={{ position: "relative" }}>
            <style>{`
        .scramble-wrap { position:relative; min-height: calc(var(--fs, 24px) * 1.8 + 16px); }
        .scramble-wrap.off { visibility:hidden; pointer-events:none; }
        .scramble-wrap.on { visibility:visible; }
        .scramble-container { display:flex; gap: var(--gap, 10px); flex-wrap:nowrap; align-items:center; overflow:hidden; justify-content:center; margin: 20px 0; }
        .scramble-container .letter { background-color: #ffeb99; transition: background-color .15s ease, transform .15s ease; }
        .scramble-container .letter:active { background-color: #ffe08a; }
        .scramble-container .letter.correct { background-color: #8fcf68; }
        .scramble-container .letter.correct:active { background-color: #7ac456; }
        .letter { font-size: var(--fs, 32px); line-height:1; inline-size: calc(var(--fs, 32px) * 0.65 + 48px); block-size: calc(var(--fs, 32px) * 1.4 + 24px); padding:12px 24px; border-radius:12px; font-weight:800; user-select:none; display:inline-flex; justify-content:center; align-items:center; color:#111 !important; box-shadow:0 4px 6px rgba(0,0,0,0.1); -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
        @media (pointer: fine) { .letter { cursor: grab; } }
        @media (pointer: coarse) { .letter { cursor: default; } }
        .word.show-word { line-height:1; }
        .success-panel { margin-top: 16px; font-size: 14px; color: green; font-weight: 600; text-align:center; }
      `}</style>

            <h2>🧩 Word Scramble Game</h2>

            <div className="controls" style={{ gap: 12, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                <label>Difficulty:</label>
                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    disabled={loading || inSuccess}
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
                        disabled={loading || inSuccess}
                    />
                    Auto-load after success
                </label>

                <button
                    className="button"
                    onClick={loadNewWord}
                    disabled={loading || inSuccess}
                    style={{ minWidth: 160 }}
                >
                    🔁 Load New Word
                </button>
            </div>

            {wordData && (
                <div className="word-section" style={{ opacity: loading ? 0.85 : 1 }}>
                    {!inSuccess && <p className="meaning">{wordData.definition}</p>}

                    {!inSuccess && showWord && (
                        <div className="word-wrap">
                            <h2 className="word show-word">{wordData.word.toUpperCase()}</h2>
                            <p className="hint-text">💡 Remember the spelling...</p>
                            <div className="countdown-badge">{countdown}</div>
                        </div>
                    )}

                    {!showWord && (
                        <div className={`scramble-wrap ${inSuccess ? "on" : "on"}`}>
                            {!isCorrect && !inSuccess && (
                                <>
                                    <p className="hint-text">🌀 Now rearrange!</p>
                                    <h3 className="scramble-title">Rearrange the letters:</h3>
                                </>
                            )}

                            <div
                                key={roundKey}
                                className="scramble-container no-scroll"
                                ref={containerRef}
                                style={{ "--gap": `${GAP_PX}px`, "--fs": `${fitFontSize}px` }}
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
                                        >
                                            {item.letter.toUpperCase()}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {inSuccess && autoNext && (
                        <div className="success-panel">Next word in {successCountdown}s…</div>
                    )}
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect, useRef, useMemo } from "react";
import confetti from "canvas-confetti";
import "../components/styles/App.WordScramble.css";

const SHOW_SECONDS = 10;
const SUCCESS_DELAY = 5;
const FS_MIN = 16;
const FS_MAX = 44;

const DM_MASKS = {
  easy: ["???", "????", "?????"],
  medium: ["??????", "???????"],
  hard: ["????????", "?????????"],
};

function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}
function isAlpha(s) {
  return /^[A-Za-z]+$/.test(s);
}

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
  const len = pick(
	{ easy: [4, 5], medium: [6, 7], hard: [8, 9, 10] }[d] || [4, 8]
  );
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
	try {
	  const dm = await getWord(d);
	  if (dm) return dm;
	} catch {}
	try {
	  const fb = await getFallback(d);
	  if (fb) return fb;
	} catch {}
  }
  return null;
}

const scramble = (w) => {
  const letters = w.split("");
  const N = letters.length;
  if (N <= 1) {
	return letters.map((l, i) => ({
	  id: `${l}-${i}-${Math.random().toString(36).slice(2)}`,
	  letter: l,
	}));
  }
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
  if (join(a) === original && uniq.size === 1) {
	a = letters.slice(1).concat(letters[0]);
  }
  return a.map((l, i) => ({
	id: `${l}-${i}-${Math.random().toString(36).slice(2)}`,
	letter: l,
  }));
};

function useDebounced(fn, d) {
  const t = useRef();
  return useMemo(
	() =>
	  (...a) => {
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

  const [isTransitioning, setIsTransitioning] = useState(false);

  const loadingRef = useRef(false);
  const activeRoundRef = useRef(0);

  const revealTimeout = useRef(null);
  const successTimeout = useRef(null);
  const successInterval = useRef(null);

  const containerRef = useRef(null);
  const scrambleWrapRef = useRef(null);

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
	if (loadingRef.current) return;
	loadingRef.current = true;
	setLoading(true);

	setIsCorrect(false);
	setInSuccess(false);
	setSuccessCountdown(0);
	setSelected(null);
	setDragged(null);
	safeClearTimers();

	if (scrambleWrapRef.current) {
	  const h = scrambleWrapRef.current.offsetHeight || 0;
	  if (h > 0) setReservedHeight(h);
	}

	// immediately clear old tiles to prevent green→yellow flicker, layout preserved by reservedHeight
	setScrambled([]);
	setShowWord(false);
	setCanShowScramble(false);

	const myRound = activeRoundRef.current + 1;
	activeRoundRef.current = myRound;

	let data = null;
	try {
	  data = await fetchWord(difficulty);
	} catch {}

	if (myRound !== activeRoundRef.current) {
	  loadingRef.current = false;
	  setLoading(false);
	  return;
	}
	if (!data) {
	  loadingRef.current = false;
	  setLoading(false);
	  alert("⚠️ Could not fetch a new word. Try again.");
	  return;
	}

	setWordData(data);
	setCountdown(SHOW_SECONDS);
	setRoundKey((k) => k + 1);

	let nextScramble;
	try {
	  nextScramble = scramble(data.word);
	  if (!Array.isArray(nextScramble) || nextScramble.length === 0) {
		nextScramble = data.word.split("").map((l, i) => ({
		  id: `${l}-${i}-${Math.random().toString(36).slice(2)}`,
		  letter: l,
		}));
	  }
	} catch {
	  nextScramble = data.word.split("").map((l, i) => ({
		id: `${l}-${i}-${Math.random().toString(36).slice(2)}`,
		letter: l,
	  }));
	}
	setScrambled(nextScramble);

	// two RAFs to guarantee old frame is painted away before showing the new one
	requestAnimationFrame(() => {
	  requestAnimationFrame(() => {
		setShowWord(true);
		setCanShowScramble(false);
		revealTimeout.current = setTimeout(() => {
		  if (myRound !== activeRoundRef.current) return;
		  setShowWord(false);
		  setCanShowScramble(true);
		  setTimeout(() => setReservedHeight(0), 0);
		}, SHOW_SECONDS * 1000);
		setIsTransitioning(false);
	  });
	});

	loadingRef.current = false;
	setLoading(false);
  };

  useEffect(() => {
	if (!showWord) return;
	setCountdown(SHOW_SECONDS);
	const id = setInterval(
	  () => setCountdown((c) => (c <= 1 ? 0 : c - 1)),
	  1000
	);
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
	const desired = Math.max(
	  FS_MIN,
	  Math.min(FS_MAX, Math.floor(fsByWidth + bonus))
	);
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
	  try {
		ro.disconnect();
	  } catch {}
	  window.removeEventListener("resize", onResize);
	};
  }, [wordData?.word, doFit]);

  const commitMove = (from, to) => {
	if (
	  loadingRef.current ||
	  loading ||
	  inSuccess ||
	  from == null ||
	  to == null ||
	  from === to
	)
	  return;
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

	  if (scrambleWrapRef.current) {
		const h = scrambleWrapRef.current.offsetHeight || 0;
		if (h > 0) setReservedHeight(h);
	  }

	  setInSuccess(true);
	  setShowWord(false);
	  setSuccessCountdown(SUCCESS_DELAY);
	  successInterval.current = setInterval(
		() => setSuccessCountdown((c) => (c <= 1 ? 0 : c - 1)),
		1000
	  );

	  successTimeout.current = setTimeout(() => {
		clearInterval(successInterval.current);
		setInSuccess(false);
		setIsCorrect(false);
		setIsTransitioning(true);
		// fully unmount the round for one frame, then load
		setCanShowScramble(false);
		setShowWord(false);
		setScrambled([]);
		requestAnimationFrame(() => {
		  requestAnimationFrame(() => {
			loadNewWord();
		  });
		});
	  }, SUCCESS_DELAY * 1000);
	}
  };

  const handleDragStart = (i) => {
	if (!isCorrect && !loading && !inSuccess) setDragged(i);
  };
  const handleDrop = (i) => {
	if (isCorrect || dragged == null || loading || inSuccess) return;
	commitMove(dragged, i);
	setDragged(null);
  };
  const handleTouchTap = (i) => {
	if (isCorrect || loading || inSuccess) return;
	if (selected == null) setSelected(i);
	else if (selected === i) setSelected(null);
	else {
	  commitMove(selected, i);
	  setSelected(null);
	}
  };

  useEffect(
	() => () => {
	  safeClearTimers();
	},
	[]
  );

  return (
	<div className="container ws" style={{ position: "relative" }}>
	  <h2>🧩 Word Scramble Game</h2>

	  <div className="controls">
		<label>Difficulty:</label>
		<select
		  value={difficulty}
		  onChange={(e) => setDifficulty(e.target.value)}
		  disabled={loading || inSuccess || isTransitioning}
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

		<button
		  className="button"
		  onClick={() => {
			setIsTransitioning(true);
			requestAnimationFrame(() => {
			  requestAnimationFrame(() => {
				loadNewWord();
			  });
			});
		  }}
		  disabled={
			loading || inSuccess || loadingRef.current || isTransitioning
		  }
		  aria-busy={loading || loadingRef.current || isTransitioning}
		  style={{ minWidth: 160 }}
		>
		  🔁 Load New Word
		</button>
	  </div>

	  {wordData && (
		<div
		  className="word-section"
		  style={{
			opacity: loading ? 0.85 : 1,
			minHeight: reservedHeight ? reservedHeight : undefined,
			overflow: reservedHeight ? "hidden" : undefined,
			overflowAnchor: "none",
			contain: "layout",
		  }}
		>
		  {!inSuccess && !isTransitioning && (
			<p className="meaning">{wordData.definition}</p>
		  )}

		  {!inSuccess && showWord && !isTransitioning && (
			<div className="word-wrap">
			  <h2 className="word show-word">{wordData.word.toUpperCase()}</h2>
			  <p className="hint-text">💡 Remember the spelling...</p>
			  <div className="countdown-badge" aria-live="polite">
				{countdown}
			  </div>
			</div>
		  )}

		  <div
			ref={scrambleWrapRef}
			className={`scramble-wrap ${!showWord && canShowScramble && !isTransitioning ? "on" : "off"}`}
		  >
			{!showWord && canShowScramble && !isTransitioning && (
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
						style={
						  sel
							? {
								outline: "3px solid var(--accent, #4ade80)",
								outlineOffset: "2px",
							  }
							: undefined
						}
						draggable={
						  !isCorrect && !isTouch && !loading && !inSuccess
						}
						onDragStart={
						  !isTouch ? () => handleDragStart(index) : undefined
						}
						onDragOver={
						  !isTouch ? (e) => e.preventDefault() : undefined
						}
						onDrop={!isTouch ? () => handleDrop(index) : undefined}
						onClick={
						  isTouch ? () => handleTouchTap(index) : undefined
						}
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

		  {inSuccess && autoNext && !isTransitioning && (
			<div
			  className="success-panel"
			  aria-live="polite"
			  style={{ marginTop: 8 }}
			>
			  Next word in {successCountdown}s…
			</div>
		  )}
		</div>
	  )}
	</div>
  );
}

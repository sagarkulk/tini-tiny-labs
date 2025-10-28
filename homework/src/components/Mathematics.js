import React, { useEffect, useMemo, useRef, useState } from "react";
import "../components/styles/App.Mathematics.css"

const LIMITS = {
  EQUATIONS: { MIN: 1, MAX: 20 },
  NUMBERS: { MIN: -500, MAX: 500 },
  ANSWER: { MIN: -250000, MAX: 250000 },
  PRECISION: { MIN: 0, MAX: 4 },
  DURATION: {
    MIN_MINUTES: 1,
    MAX_MINUTES: 180,
    MIN_SECONDS: 30,
    MAX_SECONDS: 60 * 180,
  },
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function isCorrectAnswer(userAnswer, expected, epsilon = 1e-6) {
  if (userAnswer === "" || userAnswer === null || userAnswer === undefined) return false;
  const ua = Number(userAnswer);
  if (Number.isNaN(ua)) return false;
  return Math.abs(ua - Number(expected)) <= epsilon;
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60),
    s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function formatVerboseMinSec(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60),
    r = s % 60;
  return `${m} min ${r} seconds`;
}
function generateExpressions({
  type,
  count,
  min,
  max,
  nonNegativeSub,
  fractionalDiv,
  divPrecision,
}) {
  const expressions = [];
  for (let i = 0; i < count; i++) {
    let a = getRandomInt(Math.max(LIMITS.NUMBERS.MIN, min), Math.min(LIMITS.NUMBERS.MAX, max));
    let b = getRandomInt(Math.max(LIMITS.NUMBERS.MIN, min), Math.min(LIMITS.NUMBERS.MAX, max));
    let expr = "",
      answer = 0;
    switch (type) {
      case "add":
        expr = `${a} + ${b}`;
        answer = a + b;
        break;
      case "sub":
        if (nonNegativeSub && a < b) [a, b] = [b, a];
        expr = `${a} - ${b}`;
        answer = a - b;
        break;
      case "mul":
        expr = `${a} × ${b}`;
        answer = a * b;
        break;
      case "div":
        if (b === 0) b = 1;
        if (fractionalDiv) {
          expr = `${a} ÷ ${b}`;
          answer = Number(
            (a / b).toFixed(clamp(divPrecision, LIMITS.PRECISION.MIN, LIMITS.PRECISION.MAX))
          );
        } else {
          const q = getRandomInt(min, max);
          a = b * q;
          expr = `${a} ÷ ${b}`;
          answer = q;
        }
        break;
      default:
        break;
    }
    answer = clamp(answer, LIMITS.ANSWER.MIN, LIMITS.ANSWER.MAX);
    a = clamp(a, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX);
    b = clamp(b, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX);
    expressions.push({ expr, answer, userAnswer: "" });
  }
  return expressions;
}

export default function Mathematics() {
  const [numEquations, setNumEquations] = useState(5);
  const [minNumber, setMinNumber] = useState(1);
  const [maxNumber, setMaxNumber] = useState(10);
  const [nonNegativeSub, setNonNegativeSub] = useState(true);
  const [fractionalDiv, setFractionalDiv] = useState(false);
  const [divPrecision, setDivPrecision] = useState(2);

  const [operations, setOperations] = useState({ add: true, sub: true, mul: true, div: true });

  const [addition, setAddition] = useState([]);
  const [subtraction, setSubtraction] = useState([]);
  const [multiplication, setMultiplication] = useState([]);
  const [division, setDivision] = useState([]);

  const [submitted, setSubmitted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);

  const [timedEnabled, setTimedEnabled] = useState(false);
  const [durationMin, setDurationMin] = useState(3);
  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const intervalRef = useRef(null);
  const summaryRef = useRef(null);

  const noneSelected = !operations.add && !operations.sub && !operations.mul && !operations.div;

  const allProblems = useMemo(
    () => [...addition, ...subtraction, ...multiplication, ...division],
    [addition, subtraction, multiplication, division]
  );

  const score = useMemo(() => {
    const total = allProblems.length;
    const correct = allProblems.filter((p) => isCorrectAnswer(p.userAnswer, p.answer)).length;
    return { correct, total, pct: total ? Math.round((correct / total) * 100) : 0 };
  }, [allProblems, submitted]);

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const startCountdown = (totalSec) => {
    stopTimer();
    setRemaining(totalSec);
    setElapsed(0);
    setAutoSubmitted(false);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          stopTimer();
          setFinished(true);
          setSubmitted(true);
          setAutoSubmitted(true);
          setLocked(false);
          return 0;
        }
        return prev - 1;
      });
      setElapsed((prev) => prev + 1);
    }, 1000);
  };

  // practice-mode stopwatch (counts up)
  const startStopwatch = () => {
    stopTimer();
    setElapsed(0);
    setRemaining(0);
    setAutoSubmitted(false);
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  };

  useEffect(() => () => stopTimer(), []);

  useEffect(() => {
    if (!allProblems.length || finished || submitted) return;
    const allCorrect = allProblems.every((p) => isCorrectAnswer(p.userAnswer, p.answer));
    if (allCorrect) {
      setFinished(true);
      setSubmitted(true);
      stopTimer();
      setLocked(false);
    }
  }, [allProblems, finished, submitted]);

  useEffect(() => {
    if (submitted && summaryRef.current) {
      summaryRef.current.focus();
      summaryRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [submitted]);

  const generateAll = () => {
    if (noneSelected) return;

    const count = clamp(Math.floor(Number(numEquations) || 1), LIMITS.EQUATIONS.MIN, LIMITS.EQUATIONS.MAX);
    let min = clamp(Number.isFinite(minNumber) ? minNumber : 0, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX);
    let max = clamp(Number.isFinite(maxNumber) ? maxNumber : min + 10, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX);
    if (min > max) [min, max] = [max, min];

    const common = {
      count,
      min,
      max,
      nonNegativeSub,
      fractionalDiv,
      divPrecision: clamp(Math.floor(divPrecision || 0), LIMITS.PRECISION.MIN, LIMITS.PRECISION.MAX),
    };

    setAddition(operations.add ? generateExpressions({ type: "add", ...common }) : []);
    setSubtraction(operations.sub ? generateExpressions({ type: "sub", ...common }) : []);
    setMultiplication(operations.mul ? generateExpressions({ type: "mul", ...common }) : []);
    setDivision(operations.div ? generateExpressions({ type: "div", ...common }) : []);

    setSubmitted(false);
    setFinished(false);
    setLocked(true);

    if (timedEnabled) {
      const totalSec = clamp(
        Math.floor(Number(durationMin) || LIMITS.DURATION.MIN_MINUTES) * 60,
        LIMITS.DURATION.MIN_SECONDS,
        LIMITS.DURATION.MAX_SECONDS
      );
      startCountdown(totalSec);
    } else {
      startStopwatch();
    }
  };

  const resetAll = () => {
    stopTimer();
    setAddition([]);
    setSubtraction([]);
    setMultiplication([]);
    setDivision([]);
    setSubmitted(false);
    setFinished(false);
    setLocked(false);
    setElapsed(0);
    setRemaining(0);
    setAutoSubmitted(false);
  };

  const startNewRoundAfterFinish = () => {
    resetAll();
    generateAll();
  };

  const handleChange = (type, index, value) => {
    const setterMap = {
      add: setAddition,
      sub: setSubtraction,
      mul: setMultiplication,
      div: setDivision,
    };
    const dataMap = { add: addition, sub: subtraction, mul: multiplication, div: division };
    const newData = [...dataMap[type]];
    newData[index].userAnswer = value;
    setterMap[type](newData);
  };

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    setFinished(true);
    stopTimer();
    setLocked(false);
  };

  const toggleOperation = (op) => setOperations((prev) => ({ ...prev, [op]: !prev[op] }));

  const ProgressBar = ({ remaining, total }) => {
    const pct = total ? clamp(Math.round((remaining / total) * 100), 0, 100) : 0;
    return (
      <div className="progWrap" aria-label="Time remaining">
        <div className="progBar" style={{ width: `${pct}%` }} />
      </div>
    );
  };

  const totalSeconds = useMemo(
    () =>
      timedEnabled
        ? locked
          ? remaining + elapsed
          : clamp(durationMin, LIMITS.DURATION.MIN_MINUTES, LIMITS.DURATION.MAX_MINUTES) * 60
        : 0,
    [timedEnabled, locked, remaining, elapsed, durationMin]
  );

  const renderColumn = (title, data, type) =>
    data.length > 0 && (
      <div className="card">
        <h3 className="cardTitle">{title}</h3>
        <div className="cardGrid">
          {data.map((item, idx) => {
            const [a, operator, b] = item.expr.split(" ");
            const correct = isCorrectAnswer(item.userAnswer, item.answer);
            return (
              <div key={idx} className={`problem ${submitted ? (correct ? "done" : "miss") : ""}`}>
                {/* VERTICAL EQUATION */}
                <div className="equation-vertical" aria-label={`${title} problem ${idx + 1}`}>
                  <div className="ev-item">{a}</div>
                  <div className="ev-item">{operator}</div>
                  <div className="ev-item">{b}</div>
                  <div className="ev-item">=</div>
                </div>

                {/* Answer on its own line (still shows tick when submitted) */}
                <div className="answerRow">
                  <input
                    className="answerInput"
                    type="number"
                    min={LIMITS.ANSWER.MIN}
                    max={LIMITS.ANSWER.MAX}
                    inputMode="decimal"
                    step="any"
                    value={item.userAnswer}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        handleChange(type, idx, "");
                        return;
                      }
                      const num = Number(raw);
                      if (Number.isNaN(num)) return;
                      const value = clamp(num, LIMITS.ANSWER.MIN, LIMITS.ANSWER.MAX);
                      handleChange(type, idx, value);
                    }}
                    disabled={submitted}
                    aria-label={`${title} problem ${idx + 1} answer`}
                  />
                  {submitted && (
                    <span className={`mark ${correct ? "ok" : "no"}`}>{correct ? "✓" : "✗"}</span>
                  )}
                </div>

                {submitted &&
                  !correct &&
                  typeof item.answer === "number" &&
                  !Number.isInteger(item.answer) && (
                    <div className="hint">
                      Round to{" "}
                      {clamp(
                        Math.floor(divPrecision || 0),
                        LIMITS.PRECISION.MIN,
                        LIMITS.PRECISION.MAX
                      )}{" "}
                      decimal place{divPrecision === 1 ? "" : "s"}.
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </div>
    );

  const canShowStart = !locked && !finished && allProblems.length === 0;

  return (
    <div className="wrap">
      <h2>🧮 Mathematics Practice</h2>

      <div className="statusBar">
        <div className="row" role="status" aria-live="polite">
          {locked ? (
            timedEnabled ? (
              <span className="pill">Remaining: {formatVerboseMinSec(remaining)}</span>
            ) : (
              <span className="pill">Time: {formatTime(elapsed)}</span>
            )
          ) : finished ? (
            <span className="pill">
              {`Completed in ${formatTime(elapsed)}${timedEnabled && autoSubmitted ? " (time up)" : ""}`}
            </span>
          ) : timedEnabled ? (
            <span className="pill">
              Duration:
              <input
                className="pillInput"
                type="number"
                min={LIMITS.DURATION.MIN_MINUTES}
                max={LIMITS.DURATION.MAX_MINUTES}
                step={1}
                value={durationMin}
                inputMode="numeric"
                aria-label="Test duration in minutes"
                title={`Edit minutes (${LIMITS.DURATION.MIN_MINUTES}–${LIMITS.DURATION.MAX_MINUTES}). Applies when you press Start.`}
                onWheel={(e) => e.target.blur()}
                onChange={(e) =>
                  setDurationMin(
                    clamp(
                      Math.floor(Number(e.target.value) || LIMITS.DURATION.MIN_MINUTES),
                      LIMITS.DURATION.MIN_MINUTES,
                      LIMITS.DURATION.MAX_MINUTES
                    )
                  )
                }
              />
              minutes
            </span>
          ) : (
            <span className="pill">Time: 00:00</span>
          )}
        </div>

        {timedEnabled && (
          <ProgressBar
            remaining={locked ? remaining : clamp(durationMin, LIMITS.DURATION.MIN_MINUTES, LIMITS.DURATION.MAX_MINUTES) * 60}
            total={totalSeconds}
          />
        )}

        <div className="row">
          {canShowStart && (
            <button
              className="primaryBtn"
              onClick={generateAll}
              disabled={noneSelected}
              title={noneSelected ? "Select at least one operation" : "Start"}
            >
              Start Test
            </button>
          )}

          {locked && !submitted && (
            <button className="submitBtn" onClick={handleSubmit}>
              Submit Answers
            </button>
          )}

          {(locked || finished || allProblems.length > 0) && (
            <button className="startOverBtn" onClick={resetAll} title="Reset to initial state">
              Reset
            </button>
          )}
          {(locked || finished) && (
            <button className="primaryBtn" onClick={startNewRoundAfterFinish} title="Start a fresh round">
              Start Again
            </button>
          )}
        </div>
      </div>

      <div className="groups" role="region" aria-label="Configuration">
        <fieldset className="group" disabled={locked}>
          <legend>Settings</legend>
          <div className="groupBody">
            <div className="groupGrid">
              <label className="ctrlPair">
                <span className="label">Timed assessment</span>
                <input
                  type="checkbox"
                  className="checkInput"
                  checked={timedEnabled}
                  onChange={(e) => setTimedEnabled(e.target.checked)}
                />
              </label>

              {timedEnabled && (
                <label className="ctrlPair">
                  <span className="label">Minutes</span>
                  <input
                    type="number"
                    min={LIMITS.DURATION.MIN_MINUTES}
                    max={LIMITS.DURATION.MAX_MINUTES}
                    className="numberInput"
                    value={durationMin}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) =>
                      setDurationMin(
                        clamp(
                          Math.floor(Number(e.target.value) || LIMITS.DURATION.MIN_MINUTES),
                          LIMITS.DURATION.MIN_MINUTES,
                          LIMITS.DURATION.MAX_MINUTES
                        )
                      )
                    }
                  />
                </label>
              )}

              <label className="ctrlPair">
                <span className="label">Equations per type</span>
                <input
                  type="number"
                  min={LIMITS.EQUATIONS.MIN}
                  max={LIMITS.EQUATIONS.MAX}
                  className="numberInput"
                  value={numEquations}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setNumEquations(
                      clamp(
                        Math.floor(Number(e.target.value) || LIMITS.EQUATIONS.MIN),
                        LIMITS.EQUATIONS.MIN,
                        LIMITS.EQUATIONS.MAX
                      )
                    )
                  }
                />
              </label>
              <label className="ctrlPair">
                <span className="label">Min</span>
                <input
                  type="number"
                  className="numberInput"
                  min={LIMITS.NUMBERS.MIN}
                  max={LIMITS.NUMBERS.MAX}
                  value={minNumber}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setMinNumber(clamp(Number(e.target.value) || 0, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX))
                  }
                />
              </label>
              <label className="ctrlPair">
                <span className="label">Max</span>
                <input
                  type="number"
                  className="numberInput"
                  min={LIMITS.NUMBERS.MIN}
                  max={LIMITS.NUMBERS.MAX}
                  value={maxNumber}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setMaxNumber(clamp(Number(e.target.value) || 0, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX))
                  }
                />
              </label>

              <label className="ctrlPair">
                <span className="label">Non-negative subtraction</span>
                <input
                  type="checkbox"
                  className="checkInput"
                  checked={nonNegativeSub}
                  onChange={(e) => setNonNegativeSub(e.target.checked)}
                />
              </label>

              <label className="ctrlPair">
                <span className="label">Fractional division</span>
                <input
                  type="checkbox"
                  className="checkInput"
                  checked={fractionalDiv}
                  onChange={(e) => setFractionalDiv(e.target.checked)}
                />
              </label>

              <label className="ctrlPair">
                <span className="label">Precision</span>
                <input
                  type="number"
                  min={LIMITS.PRECISION.MIN}
                  max={LIMITS.PRECISION.MAX}
                  className="numberInput"
                  value={divPrecision}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setDivPrecision(
                      clamp(Math.floor(Number(e.target.value) || 0), LIMITS.PRECISION.MIN, LIMITS.PRECISION.MAX)
                    )
                  }
                  disabled={!fractionalDiv}
                  title={fractionalDiv ? `0–${LIMITS.PRECISION.MAX} decimals` : "Enable fractional division to adjust"}
                />
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset className="group" disabled={locked}>
          <legend>Operations</legend>
          <div className="groupBody">
            <div className="opGrid">
              <label className="opItem">
                <input type="checkbox" checked={operations.add} onChange={() => toggleOperation("add")} />
                <span>Addition</span>
              </label>
              <label className="opItem">
                <input type="checkbox" checked={operations.sub} onChange={() => toggleOperation("sub")} />
                <span>Subtraction</span>
              </label>
              <label className="opItem">
                <input type="checkbox" checked={operations.mul} onChange={() => toggleOperation("mul")} />
                <span>Multiplication</span>
              </label>
              <label className="opItem">
                <input type="checkbox" checked={operations.div} onChange={() => toggleOperation("div")} />
                <span>Division</span>
              </label>
            </div>
          </div>
        </fieldset>
      </div>

      {submitted && (
        <div className="summary" role="region" aria-label="Assessment summary" ref={summaryRef} tabIndex={-1}>
          <div className="big">
            Score: {score.correct} / {score.total} ({score.pct}%)
          </div>
          {timedEnabled && <div>Time used: {formatTime(elapsed)}{autoSubmitted ? " (time up)" : ""}</div>}
        </div>
      )}

      <div className="columns">
        {renderColumn("Addition", addition, "add")}
        {renderColumn("Subtraction", subtraction, "sub")}
        {renderColumn("Multiplication", multiplication, "mul")}
        {renderColumn("Division", division, "div")}
      </div>

      {addition.length + subtraction.length + multiplication.length + division.length > 0 && !finished && (
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button className="submitBtn" onClick={handleSubmit} disabled={submitted}>
            {submitted ? "Submitted" : "Submit Answers"}
          </button>
        </div>
      )}
    </div>
  );
}

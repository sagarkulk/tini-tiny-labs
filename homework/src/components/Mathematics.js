import React, { useEffect, useMemo, useRef, useState } from "react";

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function isCorrectAnswer(userAnswer, expected, epsilon = 1e-6) {
  if (userAnswer === "" || userAnswer === null || userAnswer === undefined) return false;
  const ua = Number(userAnswer);
  if (Number.isNaN(ua)) return false;
  return Math.abs(ua - Number(expected)) <= epsilon;
}
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function generateExpressions({ type, count, min, max, nonNegativeSub, fractionalDiv, divPrecision }) {
  const expressions = [];
  for (let i = 0; i < count; i++) {
    let a = getRandomInt(Math.max(-500, min), Math.min(500, max));
    let b = getRandomInt(Math.max(-500, min), Math.min(500, max));

    let expr = "";
    let answer = 0;

    switch (type) {
      case "add": expr = `${a} + ${b}`; answer = a + b; break;
      case "sub":
        if (nonNegativeSub && a < b) [a, b] = [b, a];
        expr = `${a} - ${b}`; answer = a - b; break;
      case "mul": expr = `${a} × ${b}`; answer = a * b; break;
      case "div":
        if (b === 0) b = 1;
        if (fractionalDiv) { expr = `${a} ÷ ${b}`; answer = Number((a / b).toFixed(divPrecision)); }
        else { const q = getRandomInt(min, max); a = b * q; expr = `${a} ÷ ${b}`; answer = q; }
        break;
      default: break;
    }
    answer = Math.max(-250000, Math.min(250000, answer));
    a = Math.max(-500, Math.min(500, a));
    b = Math.max(-500, Math.min(500, b));
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

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const noneSelected = !operations.add && !operations.sub && !operations.mul && !operations.div;

  const startTimer = () => {
    clearInterval(intervalRef.current);
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
  };
  const stopTimer = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const generateAll = () => {
    if (noneSelected) return;

    const count = Math.max(1, Math.floor(Number(numEquations) || 1));
    let min = Math.max(-500, Math.min(500, Number.isFinite(minNumber) ? minNumber : 0));
    let max = Math.max(-500, Math.min(500, Number.isFinite(maxNumber) ? maxNumber : min + 10));

    if (min > max) [min, max] = [max, min];

    const common = {
      count: Math.max(1, Math.min(20, Math.floor(count))),
      min, max,
      nonNegativeSub,
      fractionalDiv,
      divPrecision: Math.max(0, Math.min(4, Math.floor(divPrecision || 0))),
    };

    setAddition(operations.add ? generateExpressions({ type: "add", ...common }) : []);
    setSubtraction(operations.sub ? generateExpressions({ type: "sub", ...common }) : []);
    setMultiplication(operations.mul ? generateExpressions({ type: "mul", ...common }) : []);
    setDivision(operations.div ? generateExpressions({ type: "div", ...common }) : []);

    setSubmitted(false);
    setFinished(false);
    setLocked(true);
    startTimer();
  };

  const resetAll = () => {
    stopTimer();
    setAddition([]); setSubtraction([]); setMultiplication([]); setDivision([]);
    setSubmitted(false); setFinished(false); setLocked(false); setElapsed(0);
  };
  const stopAndReset = () => resetAll();
  const startNewRoundAfterFinish = () => { resetAll(); generateAll(); };

  const allProblems = useMemo(
    () => [...addition, ...subtraction, ...multiplication, ...division],
    [addition, subtraction, multiplication, division]
  );

  useEffect(() => {
    if (!allProblems.length || finished) return;
    const allCorrect = allProblems.every((p) => isCorrectAnswer(p.userAnswer, p.answer));
    if (allCorrect) {
      setFinished(true);
      setSubmitted(true);
      stopTimer();
      setLocked(false);
    }
  }, [allProblems, finished]);

  useEffect(() => () => stopTimer(), []);

  const handleChange = (type, index, value) => {
    const setterMap = { add: setAddition, sub: setSubtraction, mul: setMultiplication, div: setDivision };
    const dataMap = { add: addition, sub: subtraction, mul: multiplication, div: division };
    const newData = [...dataMap[type]];
    newData[index].userAnswer = value;
    setterMap[type](newData);
  };
  const handleSubmit = () => setSubmitted(true);
  const toggleOperation = (op) => setOperations((prev) => ({ ...prev, [op]: !prev[op] }));

  const renderColumn = (title, data, type) =>
    data.length > 0 && (
      <div className="card">
        <h3 className="cardTitle">{title}</h3>
        <div className="cardGrid">
          {data.map((item, idx) => {
            const [a, operator, b] = item.expr.split(" ");
            const correct = isCorrectAnswer(item.userAnswer, item.answer);
            return (
              <div key={idx} className="problem">
                <div className="expr">
                  {a}
                  <div>{operator} {b}</div>
                  <div className="hr" />
                </div>
                <div className="answerRow">
                  <input
                    className="answerInput"
                    type="number"
                    min={-250000}
                    max={250000}
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
                      const value = Math.max(-250000, Math.min(250000, num));
                      handleChange(type, idx, value);
                    }}
                    disabled={submitted && correct}
                    aria-label={`${title} problem ${idx + 1} answer`}
                  />
                  {submitted && <span className={`mark ${correct ? "ok" : "no"}`}>{correct ? "✓" : "✗"}</span>}
                </div>
                {submitted && !correct && typeof item.answer === "number" && !Number.isInteger(item.answer) && (
                  <div className="hint">
                    Round to {Math.max(0, Math.min(4, Math.floor(divPrecision || 0)))} decimal
                    place{divPrecision === 1 ? "" : "s"}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

  return (
    <div className="wrap">
      <style>{`
        .wrap { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          background: var(--app-bg); color: var(--text-color); min-height: 100vh; padding: 16px; box-sizing: border-box; }
        h2 { text-align: center; font-size: 1.6rem; margin-bottom: 8px; }

        .statusBar { display:flex; justify-content:center; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
        .pill { padding:6px 12px; border-radius:999px; font-weight:700; border:1px solid var(--divider);
          background: var(--header-bg); color: var(--text-color); }
        .startOverBtn, .resetBtn { border:none; border-radius:999px; padding:8px 14px; font-weight:700; cursor:pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
        .startOverBtn { background:#b91c1c; color:white; }
        .resetBtn { background:#065f46; color:white; }

        .groups { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px; }
        @media (max-width: 900px){ .groups { grid-template-columns: 1fr; } }

        fieldset.group {
          border:1px solid var(--divider);
          border-radius:12px;
          background: var(--header-bg);
          padding:0;
          min-inline-size: 0;
          overflow: hidden;            /* keep everything inside the border */
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        fieldset.group > legend {
          margin-left: 12px;
          padding: 0 6px;
          font-weight: 800;
          color: var(--text-color);
        }
        .groupBody {
          padding: 12px;
          min-width: 0;                /* allow children to shrink */
        }
        fieldset.group[disabled] { opacity: .85; }

        .groupGrid { display:grid; gap:10px; min-width: 0; }

        /* Label/Input pairs — narrower label column, shrink-safe inputs */
        .ctrlPair {
          display:grid;
          grid-template-columns: minmax(90px, 0.34fr) minmax(0, 0.66fr);
          align-items:center;
          gap:10px;
          min-width: 0;
        }
        .ctrlPair .label {
          /*font-weight:700;*/
          justify-self:end;
          text-align:right;
          /*white-space: nowrap;*/
        }
        .numberInput {
          width:100%;
          max-width:100%;
          padding:10px 12px;
          border:1px solid var(--divider);
          border-radius:8px;
          background: var(--header-bg);
          color: var(--text-color);
          box-sizing: border-box;      /* prevents overflow (100% + padding) */
          min-width: 0;                /* grid child can shrink */
          -webkit-appearance: none;    /* tame iOS number input */
          appearance: none;
        }
        .numberInput:focus { outline: 2px solid var(--brand); outline-offset: 2px; }

        /* Checkboxes align in the right column without stretching */
        .ctrlPair .checkInput {
          justify-self:start;
          width:22px; height:22px;
        }

        @media (max-width: 560px){
          .ctrlPair { grid-template-columns: 1fr; }
          .ctrlPair .label { justify-self:start; text-align:left; }
        }

        .opGrid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:8px; }
        @media (max-width: 420px){ .opGrid { grid-template-columns: 1fr; } }
        .opItem {
          display:flex; align-items:center; gap:8px;
          padding:8px 10px; border:1px solid var(--divider);
          border-radius:8px; background: var(--header-bg);
          min-width: 0;
        }

        .actions .primaryBtn { width:100%; margin-top: 10px; }
        
        .columns { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
        .card { background: var(--header-bg); padding:12px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.08); border:1px solid var(--divider); }
        .cardTitle { text-align:center; margin-bottom:10px; }
        .expr { font-size:20px; width:90px; margin:auto; text-align:right; }
        .hr { border-top:2px solid currentColor; opacity:.6; margin-top:2px; }
        .answerRow { display:flex; align-items:center; justify-content:center; gap:8px; }
        .answerInput { width:120px; padding:10px 12px; font-size:18px; border-radius:8px; border:1px solid var(--divider);
          background: var(--header-bg); color: var(--text-color); box-sizing: border-box; text-align: right; }
        .answerInput:focus { outline: 2px solid var(--brand); outline-offset: 2px; }
        .mark.ok { color:#16a34a; } .mark.no { color:#dc2626; }
        .hint { font-size:12px; opacity:0.8; text-align:center; }
      `}</style>

      <h2>Mathematics Practice</h2>

      <div className="statusBar">
        <span className={`pill ${finished ? "done" : ""}`}>
          {finished ? `Finished: ${formatTime(elapsed)}` : `Time: ${formatTime(elapsed)}`}
        </span>

        {!finished ? (
          <>
            {locked && <button className="startOverBtn" onClick={stopAndReset}>Start Over</button>}
            {!locked && noneSelected && (
              <span className="pill" role="status" aria-live="polite">Select at least one operation</span>
            )}
          </>
        ) : (
          <button className="resetBtn" onClick={startNewRoundAfterFinish}>Start</button>
        )}
      </div>

      <div className="groups" role="region" aria-label="Configuration">
        {/* Practice Settings */}
        <fieldset className="group" disabled={locked}>
          <legend>Practice Settings</legend>
          <div className="groupBody">
            <div className="groupGrid">
              <label className="ctrlPair">
                <span className="label">Equations per type</span>
                <input
                  type="number" min="1" max="20" className="numberInput"
                  value={numEquations}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setNumEquations(
                      Math.max(1, Math.min(20, Math.floor(Number(e.target.value) || 1)))
                    )
                  }
                />
              </label>
              <label className="ctrlPair">
                <span className="label">Min</span>
                <input
                  type="number" className="numberInput"
                  min="-500" max="500"
                  value={minNumber}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setMinNumber(Math.max(-500, Math.min(500, Number(e.target.value) || 0)))
                  }
                />
              </label>
              <label className="ctrlPair">
                <span className="label">Max</span>
                <input
                  type="number" className="numberInput"
                  min="-500" max="500"
                  value={maxNumber}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setMaxNumber(Math.max(-500, Math.min(500, Number(e.target.value) || 0)))
                  }
                />
              </label>

              <label className="ctrlPair">
                <span className="label">Non-negative subtraction</span>
                <input
                  type="checkbox" className="checkInput"
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
                  min="0"
                  max="4"
                  className="numberInput"
                  value={divPrecision}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setDivPrecision(
                      Math.max(0, Math.min(4, Math.floor(Number(e.target.value) || 0)))
                    )
                  }
                  disabled={!fractionalDiv}
                  title={
                    fractionalDiv
                      ? "Set number of decimal places (0–4)"
                      : "Enable fractional division to adjust precision"
                  }
                />
              </label>
            </div>
            <div className="actions">
              {!finished && (
                <button
                  className="primaryBtn"
                  onClick={generateAll}
                  disabled={locked || noneSelected}
                  title={noneSelected ? "Select at least one operation" : "Start practice"}
                >
                  {locked ? "In Progress…" : noneSelected ? "Select operations" : "Start"}
                </button>
              )}
            </div>
          </div>
        </fieldset>

        {/* Operations */}
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

      <div className="columns">
        {renderColumn("Addition", addition, "add")}
        {renderColumn("Subtraction", subtraction, "sub")}
        {renderColumn("Multiplication", multiplication, "mul")}
        {renderColumn("Division", division, "div")}
      </div>

      {addition.length + subtraction.length + multiplication.length + division.length > 0 && !finished && (
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button className="primaryBtn" onClick={handleSubmit} disabled={submitted}>
            {submitted ? "Submitted" : "Submit Answers"}
          </button>
        </div>
      )}
    </div>
  );
}

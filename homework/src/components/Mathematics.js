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
        let a = getRandomInt(min, max);
        let b = getRandomInt(min, max);
        let expr = "";
        let answer = 0;

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
                    answer = Number((a / b).toFixed(divPrecision));
                } else {
                    const quotient = getRandomInt(min, max);
                    a = b * quotient;
                    expr = `${a} ÷ ${b}`;
                    answer = quotient;
                }
                break;
            default:
                break;
        }

        expressions.push({ expr, answer, userAnswer: "" });
    }
    return expressions;
}

export default function Mathematics() {
    // Config
    const [numEquations, setNumEquations] = useState(5);
    const [minNumber, setMinNumber] = useState(1);
    const [maxNumber, setMaxNumber] = useState(10);
    const [nonNegativeSub, setNonNegativeSub] = useState(true);
    const [fractionalDiv, setFractionalDiv] = useState(false);
    const [divPrecision, setDivPrecision] = useState(2);

    // Operation selection
    const [operations, setOperations] = useState({
        add: true,
        sub: true,
        mul: true,
        div: true,
    });

    // Problems
    const [addition, setAddition] = useState([]);
    const [subtraction, setSubtraction] = useState([]);
    const [multiplication, setMultiplication] = useState([]);
    const [division, setDivision] = useState([]);

    // UX state
    const [submitted, setSubmitted] = useState(false);
    const [locked, setLocked] = useState(false);
    const [finished, setFinished] = useState(false);

    // Timer
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef(null);

    const noneSelected = !operations.add && !operations.sub && !operations.mul && !operations.div;

    // Timer helpers
    const startTimer = () => {
        clearInterval(intervalRef.current);
        setElapsed(0);
        intervalRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    };
    const stopTimer = () => {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    };

    // Generate only selected operations
    const generateAll = () => {
        if (noneSelected) return;

        // sanitize inputs
        const count = Math.max(1, Math.floor(Number(numEquations) || 1));
        let min = Number.isFinite(minNumber) ? minNumber : 0;
        let max = Number.isFinite(maxNumber) ? maxNumber : min + 10;
        if (min > max) [min, max] = [max, min];

        const common = {
            count,
            min,
            max,
            nonNegativeSub,
            fractionalDiv,
            divPrecision: Math.max(0, Math.min(6, Math.floor(divPrecision || 0))),
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
        setAddition([]);
        setSubtraction([]);
        setMultiplication([]);
        setDivision([]);
        setSubmitted(false);
        setFinished(false);
        setLocked(false);
        setElapsed(0);
    };

    const stopAndReset = () => resetAll();

    const startNewRoundAfterFinish = () => {
        resetAll();
        // start immediately again with current config
        generateAll();
    };

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
                                    <div>
                                        {operator} {b}
                                    </div>
                                    <div className="hr" />
                                </div>

                                <div className="answerRow">
                                    <input
                                        className="answerInput"
                                        type="number"
                                        min="0"
                                        inputMode="decimal"
                                        step="any"
                                        value={item.userAnswer}
                                        onWheel={(e) => e.target.blur()}
                                        onChange={(e) => handleChange(type, idx, e.target.value)}
                                        disabled={correct}
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
                                            Round to {Math.max(0, Math.min(6, Math.floor(divPrecision || 0)))} decimal
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
            {/* Scoped, theme-aware styles */}
            <style>{`
        .wrap {
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          background: var(--app-bg);
          color: var(--text-color);
          min-height: 100vh;
          padding: 16px;
          box-sizing: border-box;
        }
        h2 { text-align: center; font-size: 1.6rem; margin-bottom: 8px; }

        /* Status bar */
        .statusBar { display:flex; justify-content:center; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
        .pill {
          padding:6px 12px; border-radius:999px; font-weight:700;
          border:1px solid var(--divider); background: var(--header-bg); color: var(--text-color);
        }
        /* .pill.done styling inherits extra accent from global App.css */

        .startOverBtn, .resetBtn {
          border:none; border-radius:999px; padding:8px 14px; font-weight:700; cursor:pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .startOverBtn { background:#b91c1c; color:white; }
        .resetBtn { background:#065f46; color:white; }

        /* Controls */
        .controls {
          display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
          gap:12px; margin-bottom:16px;
        }
        .ctrl {
          display:flex; align-items:center; gap:8px;
          background: var(--header-bg);
          padding:10px 12px; border-radius:10px;
          box-shadow:0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid var(--divider);
        }
        .numberInput {
          width:100%; max-width:140px; padding:10px 12px;
          border:1px solid var(--divider); border-radius:8px;
          background: var(--header-bg); color: var(--text-color);
        }
        .numberInput:focus { outline: 2px solid var(--brand); outline-offset: 2px; }

        .primaryBtn {
          background: var(--brand); color: #fff; padding:12px 14px; border:none; border-radius:10px; font-weight:800;
        }
        .primaryBtn[disabled] { opacity: .5; cursor: not-allowed; }

        /* Columns / cards */
        .columns { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
        .card {
          background: var(--header-bg);
          padding:12px; border-radius:10px;
          box-shadow:0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid var(--divider);
        }
        .cardTitle { text-align:center; margin-bottom:10px; }

        .expr { font-size:20px; width:120px; margin:auto; text-align:right; }
        .hr { border-top:2px solid currentColor; opacity:.6; margin-top:2px; }

        .answerRow { display:flex; align-items:center; justify-content:center; gap:8px; }
        .answerInput {
          width:120px; padding:10px 12px; font-size:18px;
          border-radius:8px; border:1px solid var(--divider);
          background: var(--header-bg); color: var(--text-color);
        }
        .answerInput:focus { outline: 2px solid var(--brand); outline-offset: 2px; }

        .mark.ok { color:#16a34a; } .mark.no { color:#dc2626; }
        .hint { font-size:12px; opacity:0.8; text-align:center; }

        @media(max-width:640px){ h2{font-size:1.35rem;} }
      `}</style>

            <h2>Mathematics Practice</h2>

            {/* Status bar */}
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

            {/* Controls */}
            <div className="controls" role="group" aria-label="Math practice controls">
                <label className="ctrl">
                    <span>Equations per type</span>
                    <input
                        type="number"
                        min="1"
                        className="numberInput"
                        value={numEquations}
                        onWheel={(e) => e.target.blur()}
                        onChange={(e) => setNumEquations(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                        disabled={locked}
                    />
                </label>

                <label className="ctrl"><span>Min</span>
                    <input
                        type="number"
                        className="numberInput"
                        value={minNumber}
                        onWheel={(e) => e.target.blur()}
                        onChange={(e) => setMinNumber(Number(e.target.value))}
                        disabled={locked}
                    />
                </label>

                <label className="ctrl"><span>Max</span>
                    <input
                        type="number"
                        className="numberInput"
                        value={maxNumber}
                        onWheel={(e) => e.target.blur()}
                        onChange={(e) => setMaxNumber(Number(e.target.value))}
                        disabled={locked}
                    />
                </label>

                <label className="ctrl">
                    <input
                        type="checkbox"
                        checked={nonNegativeSub}
                        onChange={(e) => setNonNegativeSub(e.target.checked)}
                        disabled={locked}
                    />
                    Non-negative sub
                </label>

                <label className="ctrl">
                    <input
                        type="checkbox"
                        checked={fractionalDiv}
                        onChange={(e) => setFractionalDiv(e.target.checked)}
                        disabled={locked}
                    />
                    Fractional div
                </label>

                <label className="ctrl"><span>Precision</span>
                    <input
                        type="number"
                        min="0"
                        max="6"
                        className="numberInput"
                        value={divPrecision}
                        onWheel={(e) => e.target.blur()}
                        onChange={(e) => setDivPrecision(Math.max(0, Math.min(6, Math.floor(Number(e.target.value) || 0))))}
                        disabled={!fractionalDiv || locked}
                    />
                </label>

                {/* Operation checkboxes */}
                <label className="ctrl">
                    <input type="checkbox" checked={operations.add} onChange={() => toggleOperation("add")} disabled={locked} />
                    Addition
                </label>
                <label className="ctrl">
                    <input type="checkbox" checked={operations.sub} onChange={() => toggleOperation("sub")} disabled={locked} />
                    Subtraction
                </label>
                <label className="ctrl">
                    <input type="checkbox" checked={operations.mul} onChange={() => toggleOperation("mul")} disabled={locked} />
                    Multiplication
                </label>
                <label className="ctrl">
                    <input type="checkbox" checked={operations.div} onChange={() => toggleOperation("div")} disabled={locked} />
                    Division
                </label>

                <button
                    className="primaryBtn"
                    onClick={generateAll}
                    disabled={locked || noneSelected}
                    title={noneSelected ? "Select at least one operation" : "Start practice"}
                >
                    {locked ? "In Progress…" : noneSelected ? "Select operations" : "Start"}
                </button>
            </div>

            {/* Problem Columns */}
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

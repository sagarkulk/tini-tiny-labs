import React, { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Centralized Constants
========================= */
const LIMITS = {
    EQUATIONS: { MIN: 1, MAX: 20 },
    NUMBERS: { MIN: 1, MAX: 500 },
    ANSWER: { MIN: -250000, MAX: 250000 },
    PRECISION: { MIN: 0, MAX: 4 },
};
const VALIDATION = { EPSILON: 1e-6 };

const EQUATION_TYPE = {
    BASIC: "basic",
    PROP_DIST: "prop_distributive",
    PROP_COMM: "prop_commutative",
    PROP_ASSOC: "prop_associative",
};
const SOLVE_MODE = { NUMBERS: "numbers", OPERATORS: "operators" };

const OPS = {
    add: { key: "add", sym: "+", fn: (a, b) => a + b },
    sub: { key: "sub", sym: "−", fn: (a, b) => a - b },
    mul: { key: "mul", sym: "×", fn: (a, b) => a * b },
    div: { key: "div", sym: "÷", fn: (a, b) => a / b },
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* =========================
   Utilities
========================= */
function isNumberCorrect(userAnswer, expected, eps = VALIDATION.EPSILON) {
    if (userAnswer === "" || userAnswer === null || userAnswer === undefined) return false;
    const ua = Number(userAnswer);
    if (Number.isNaN(ua)) return false;
    return Math.abs(ua - Number(expected)) <= eps;
}
function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* =========================================================
   ORIGINAL BASIC GENERATORS (unchanged numeric answers)
========================================================= */
function generateExpressionsBasic({ type, count, min, max, nonNegativeSub, fractionalDiv, divPrecision }) {
    const expressions = [];
    for (let i = 0; i < count; i++) {
        let a = rnd(Math.max(LIMITS.NUMBERS.MIN, min), Math.min(LIMITS.NUMBERS.MAX, max));
        let b = rnd(Math.max(LIMITS.NUMBERS.MIN, min), Math.min(LIMITS.NUMBERS.MAX, max));

        let expr = "";
        let answer = 0;

        switch (type) {
            case "add":
                expr = `${a} + ${b}`; answer = a + b; break;
            case "sub":
                if (nonNegativeSub && a < b) [a, b] = [b, a];
                expr = `${a} − ${b}`; answer = a - b; break;
            case "mul":
                expr = `${a} × ${b}`; answer = a * b; break;
            case "div":
                if (b === 0) b = 1;
                if (fractionalDiv) {
                    expr = `${a} ÷ ${b}`;
                    answer = Number((a / b).toFixed(clamp(divPrecision ?? 0, LIMITS.PRECISION.MIN, LIMITS.PRECISION.MAX)));
                } else {
                    b = b === 0 ? 1 : b;
                    const q = rnd(Math.max(-20, min), Math.min(20, max));
                    a = b * q;
                    expr = `${a} ÷ ${b}`;
                    answer = q;
                }
                break;
            default: break;
        }

        answer = clamp(answer, LIMITS.ANSWER.MIN, LIMITS.ANSWER.MAX);
        a = clamp(a, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX);
        b = clamp(b, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX);

        expressions.push({ expr, answer, userAnswer: "" });
    }
    return expressions;
}

/* =========================================================
   PROPERTIES MODEL + CHECK
========================================================= */
function makeText(v) { return { type: "text", value: v }; }
function makeBlank(key, inputType) { return { type: "blank", key, inputType }; }

function isPropertiesProblemCorrect(p) {
    for (const [k, truth] of Object.entries(p.correct)) {
        const val = p.user[k];
        if (val === "" || val === undefined || val === null) return false;
        if (typeof truth === "number") {
            const num = Number(val);
            if (Number.isNaN(num)) return false;
            if (!isNumberCorrect(num, truth)) return false;
        } else {
            if (String(val) !== String(truth)) return false;
        }
    }
    return true;
}

/* =========================================================
   PROPERTIES GENERATORS (respect allowed operations)
========================================================= */
// Distributive requires + and ×
function genDistributive({ count, min, max, allowedOps, mode }) {
    if (!(allowedOps.includes("add") && allowedOps.includes("mul"))) return [];
    const out = [];
    for (let i = 0; i < count; i++) {
        const a = rnd(min, max), b = rnd(min, max), c = rnd(min, max);
        if (mode === SOLVE_MODE.NUMBERS) {
            // CHANGED: render (a × [r1]) + (a × [r2]) so blanks are clearly grouped
            const parts = [
                makeText(`${a} ${OPS.mul.sym} (${b} ${OPS.add.sym} ${c}) = `),
                makeText("("), makeText(`${a} ${OPS.mul.sym} `), makeBlank("r1", "number"), makeText(") "),
                makeText(`${OPS.add.sym} `),
                makeText("("), makeText(`${a} ${OPS.mul.sym} `), makeBlank("r2", "number"), makeText(")")
            ];
            out.push({ parts, correct: { r1: b, r2: c }, user: { r1: "", r2: "" } });
        } else {
            const parts = [
                makeText(String(a)), makeText(" "), makeBlank("opM1", "operator"), makeText(" ("),
                makeText(String(b)), makeText(" "), makeBlank("opA", "operator"), makeText(" "), makeText(String(c)), makeText(") = "),
                makeText("("), makeText(String(a)), makeText(" "), makeBlank("opM2", "operator"), makeText(" "), makeText(String(b)), makeText(") "),
                makeBlank("opA2", "operator"), makeText(" "),
                makeText("("), makeText(String(a)), makeText(" "), makeBlank("opM3", "operator"), makeText(" "), makeText(String(c)), makeText(")"),
            ];
            out.push({
                parts,
                correct: { opM1: OPS.mul.sym, opA: OPS.add.sym, opM2: OPS.mul.sym, opA2: OPS.add.sym, opM3: OPS.mul.sym },
                user: { opM1: "", opA: "", opM2: "", opA2: "", opM3: "" },
            });
        }
    }
    return out;
}
// Commutative: + or ×
function genCommutative({ count, min, max, allowedOps, mode }) {
    const syms = [];
    if (allowedOps.includes("add")) syms.push(OPS.add.sym);
    if (allowedOps.includes("mul")) syms.push(OPS.mul.sym);
    if (syms.length === 0) return [];
    const out = [];
    for (let i = 0; i < count; i++) {
        const a = rnd(min, max), b = rnd(min, max);
        const sym = pick(syms);
        if (mode === SOLVE_MODE.NUMBERS) {
            const parts = [
                makeText(`${a} ${sym} ${b} = `),
                makeBlank("x1", "number"), makeText(` ${sym} `), makeBlank("x2", "number"),
            ];
            out.push({ parts, correct: { x1: b, x2: a }, user: { x1: "", x2: "" } });
        } else {
            const parts = [
                makeText(String(a)), makeText(" "), makeBlank("op1", "operator"), makeText(" "), makeText(String(b)),
                makeText(" = "),
                makeText(String(b)), makeText(" "), makeBlank("op2", "operator"), makeText(" "), makeText(String(a)),
            ];
            out.push({ parts, correct: { op1: sym, op2: sym }, user: { op1: "", op2: "" } });
        }
    }
    return out;
}
// Associative: + or ×
function genAssociative({ count, min, max, allowedOps, mode }) {
    const syms = [];
    if (allowedOps.includes("add")) syms.push(OPS.add.sym);
    if (allowedOps.includes("mul")) syms.push(OPS.mul.sym);
    if (syms.length === 0) return [];
    const out = [];
    for (let i = 0; i < count; i++) {
        const a = rnd(min, max), b = rnd(min, max), c = rnd(min, max);
        const sym = pick(syms);
        if (mode === SOLVE_MODE.NUMBERS) {
            const parts = [
                makeText(`${a} ${sym} (${b} ${sym} ${c}) = (`), makeText(String(a)), makeText(` ${sym} `),
                makeBlank("y1", "number"), makeText(") "), makeText(sym), makeText(" "), makeBlank("y2", "number"),
            ];
            out.push({ parts, correct: { y1: b, y2: c }, user: { y1: "", y2: "" } });
        } else {
            const parts = [
                makeText("("), makeText(String(a)), makeText(" "), makeBlank("opA", "operator"), makeText(" "), makeText(String(b)), makeText(") "),
                makeBlank("opB", "operator"), makeText(" "), makeText(String(c)),
                makeText(" = "),
                makeText(String(a)), makeText(" "), makeBlank("opC", "operator"), makeText(" "), makeText("("), makeText(String(b)), makeText(" "),
                makeBlank("opD", "operator"), makeText(" "), makeText(String(c)), makeText(")"),
            ];
            out.push({
                parts,
                correct: { opA: sym, opB: sym, opC: sym, opD: sym },
                user: { opA: "", opB: "", opC: "", opD: "" },
            });
        }
    }
    return out;
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
export default function MathematicsV1() {
    // Original settings
    const [numEquations, setNumEquations] = useState(5);
    const [minNumber, setMinNumber] = useState(1);
    const [maxNumber, setMaxNumber] = useState(10);
    const [nonNegativeSub, setNonNegativeSub] = useState(true);
    const [fractionalDiv, setFractionalDiv] = useState(false);
    const [divPrecision, setDivPrecision] = useState(2);

    // Always-present operations
    const [operations, setOperations] = useState({ add: true, sub: true, mul: true, div: true });

    // New config
    const [equationType, setEquationType] = useState(EQUATION_TYPE.BASIC);

    // BASIC buckets
    const [addition, setAddition] = useState([]);
    const [subtraction, setSubtraction] = useState([]);
    const [multiplication, setMultiplication] = useState([]);
    const [division, setDivision] = useState([]);

    // PROPERTIES problems
    const [propertiesProblems, setPropertiesProblems] = useState([]);

    // UI state
    const [submitted, setSubmitted] = useState(false);
    const [locked, setLocked] = useState(false);
    const [finished, setFinished] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef(null);
    const [hasGenerated, setHasGenerated] = useState(false);

    const allowedOpKeys = Object.entries(operations).filter(([, v]) => v).map(([k]) => k);
    const noneSelected = allowedOpKeys.length === 0;

    const startTimer = () => {
        clearInterval(intervalRef.current);
        setElapsed(0);
        intervalRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    };
    const stopTimer = () => {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    };

    const resetAll = () => {
        stopTimer();
        setAddition([]); setSubtraction([]); setMultiplication([]); setDivision([]);
        setPropertiesProblems([]);
        setSubmitted(false); setFinished(false); setLocked(false); setElapsed(0);
        setHasGenerated(false);
    };

    const stopAndReset = () => resetAll();

    // BASIC handlers
    const handleChangeBasic = (type, index, value) => {
        const setterMap = { add: setAddition, sub: setSubtraction, mul: setMultiplication, div: setDivision };
        const dataMap = { add: addition, sub: subtraction, mul: multiplication, div: division };
        const newData = [...dataMap[type]];
        newData[index].userAnswer = value;
        setterMap[type](newData);
    };

    const renderBasicColumn = (title, data, type) =>
        data.length > 0 && (
            <div className="card">
                <h3 className="cardTitle">{title}</h3>
                <div className="cardGrid">
                    {data.map((item, idx) => {
                        const [a, operator, b] = item.expr.split(" ");
                        const correct = isNumberCorrect(item.userAnswer, item.answer);
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
                                        min={LIMITS.ANSWER.MIN}
                                        max={LIMITS.ANSWER.MAX}
                                        inputMode="decimal"
                                        step="any"
                                        value={item.userAnswer}
                                        onWheel={(e) => e.target.blur()}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            if (raw === "") { handleChangeBasic(type, idx, ""); return; }
                                            const num = Number(raw);
                                            if (Number.isNaN(num)) return;
                                            const value = clamp(num, LIMITS.ANSWER.MIN, LIMITS.ANSWER.MAX);
                                            handleChangeBasic(type, idx, value);
                                        }}
                                        disabled={submitted && correct}
                                        aria-label={`${title} problem ${idx + 1} answer`}
                                    />
                                    {submitted && <span className={`mark ${correct ? "ok" : "no"}`}>{correct ? "✓" : "✗"}</span>}
                                </div>
                                {submitted && !correct && typeof item.answer === "number" && !Number.isInteger(item.answer) && (
                                    <div className="hint">
                                        Round to {clamp(Math.floor(divPrecision || 0), LIMITS.PRECISION.MIN, LIMITS.PRECISION.MAX)} decimal
                                        place{divPrecision === 1 ? "" : "s"}.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );

    // PROPERTIES helpers
    const OperatorPicker = ({ value, onChange, allowed }) => {
        const syms = allowed.map((k) => OPS[k].sym);
        return (
            <span className="opPicker" role="group" aria-label="Choose operator">
                {syms.map((s) => (
                    <button
                        key={s}
                        type="button"
                        className={`opBtn ${value === s ? "active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onChange(s)}
                        aria-pressed={value === s}
                        aria-label={`Choose operator ${s}`}
                    >
                        {s}
                    </button>
                ))}
            </span>
        );
    };
    const updatePropUser = (idx, key, value) => {
        const next = [...propertiesProblems];
        next[idx] = { ...next[idx], user: { ...next[idx].user, [key]: value } };
        setPropertiesProblems(next);
    };
    const renderPropertyProblem = (p, idx) => {
        const correct = isPropertiesProblemCorrect(p);
        return (
            <div key={idx} className="problem">
                <div className="expr" aria-label={`Problem ${idx + 1}`}>
                    {p.parts.map((part, i) => {
                        if (part.type === "text") return <span key={i}>{part.value}</span>;
                        if (part.inputType === "number") {
                            const val = p.user[part.key];
                            return (
                                // CHANGED: wrap numeric blanks to render visual brackets
                                <span key={i} className="bracketed">
                                    <input
                                        className="answerInput"
                                        type="number"
                                        min={LIMITS.ANSWER.MIN}
                                        max={LIMITS.ANSWER.MAX}
                                        step="any"
                                        inputMode="decimal"
                                        value={val}
                                        onWheel={(e) => e.target.blur()}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            if (raw === "") { updatePropUser(idx, part.key, ""); return; }
                                            const num = Number(raw);
                                            if (Number.isNaN(num)) return;
                                            updatePropUser(idx, part.key, clamp(num, LIMITS.ANSWER.MIN, LIMITS.ANSWER.MAX));
                                        }}
                                        disabled={submitted && correct}
                                    />
                                </span>
                            );
                        }
                        const val = p.user[part.key];
                        return (
                            <OperatorPicker
                                key={i}
                                value={val}
                                allowed={allowedOpKeys}
                                onChange={(sym) => updatePropUser(idx, part.key, sym)}
                            />
                        );
                    })}
                    <div className="hr" />
                </div>
                {submitted && <div className={`mark ${correct ? "ok" : "no"}`}>{correct ? "✓" : "✗"}</div>}
            </div>
        );
    };

    const renderPropertiesColumn = (title, problems) =>
        problems.length > 0 && (
            <div className="card">
                <h3 className="cardTitle">{title}</h3>
                <div className="cardGrid">
                    {problems.map((p, idx) => {
                        const correct = isPropertiesProblemCorrect(p);
                        return (
                            <div key={idx} className="problem">
                                <div className="expr" aria-label={`Problem ${idx + 1}`}>
                                    {p.parts.map((part, i) => {
                                        if (part.type === "text") return <span key={i}>{part.value}</span>;
                                        if (part.inputType === "number") {
                                            const val = p.user[part.key];
                                            return (
                                                <span key={i} className="bracketed">
                                                    <input
                                                        className="answerInput"
                                                        type="number"
                                                        min={LIMITS.ANSWER.MIN}
                                                        max={LIMITS.ANSWER.MAX}
                                                        step="any"
                                                        inputMode="decimal"
                                                        value={val}
                                                        onWheel={(e) => e.target.blur()}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            if (raw === "") {
                                                                const next = [...problems];
                                                                next[idx] = { ...next[idx], user: { ...next[idx].user, [part.key]: "" } };
                                                                setPropertiesProblems(next);
                                                                return;
                                                            }
                                                            const num = Number(raw);
                                                            if (Number.isNaN(num)) return;
                                                            const next = [...problems];
                                                            next[idx] = { ...next[idx], user: { ...next[idx].user, [part.key]: clamp(num, LIMITS.ANSWER.MIN, LIMITS.ANSWER.MAX) } };
                                                            setPropertiesProblems(next);
                                                        }}
                                                        disabled={submitted && correct}
                                                    />
                                                </span>
                                            );
                                        }
                                        // operator picker
                                        return (
                                            <OperatorPicker
                                                key={i}
                                                value={p.user[part.key]}
                                                allowed={allowedOpKeys}
                                                onChange={(sym) => {
                                                    const next = [...problems];
                                                    next[idx] = { ...next[idx], user: { ...next[idx].user, [part.key]: sym } };
                                                    setPropertiesProblems(next);
                                                }}
                                            />
                                        );
                                    })}
                                    <div className="hr" />
                                </div>

                                {/* Match Basic: mark sits to the right in an answer row */}
                                <div className="answerRow">
                                    {submitted && <span className={`mark ${correct ? "ok" : "no"}`}>{correct ? "✓" : "✗"}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );


    // Generate
    const generateAll = () => {
        if (noneSelected) return;

        const count = clamp(Math.floor(Number(numEquations) || LIMITS.EQUATIONS.MIN),
            LIMITS.EQUATIONS.MIN, LIMITS.EQUATIONS.MAX);
        let min = clamp(Number.isFinite(minNumber) ? minNumber : 0, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX);
        let max = clamp(Number.isFinite(maxNumber) ? maxNumber : min + 10, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX);
        if (min > max) [min, max] = [max, min];

        setSubmitted(false);
        setFinished(false);
        setLocked(true);
        setHasGenerated(true);
        startTimer();

        if (equationType === EQUATION_TYPE.BASIC) {
            // clear only BASIC lists
            setAddition([]); setSubtraction([]); setMultiplication([]); setDivision([]);
            setPropertiesProblems([]);

            const common = {
                count,
                min, max,
                nonNegativeSub,
                fractionalDiv,
                divPrecision: clamp(Math.floor(divPrecision || 0), LIMITS.PRECISION.MIN, LIMITS.PRECISION.MAX),
            };
            if (operations.add) setAddition(generateExpressionsBasic({ type: "add", ...common }));
            if (operations.sub) setSubtraction(generateExpressionsBasic({ type: "sub", ...common }));
            if (operations.mul) setMultiplication(generateExpressionsBasic({ type: "mul", ...common }));
            if (operations.div) setDivision(generateExpressionsBasic({ type: "div", ...common }));
        } else {
            // clear only property list
            setPropertiesProblems([]);

            const genCommon = { count, min, max, allowedOps: allowedOpKeys, mode: SOLVE_MODE.NUMBERS };
            let problems = [];
            if (equationType === EQUATION_TYPE.PROP_DIST) problems = genDistributive(genCommon);
            else if (equationType === EQUATION_TYPE.PROP_COMM) problems = genCommutative(genCommon);
            else if (equationType === EQUATION_TYPE.PROP_ASSOC) problems = genAssociative(genCommon);

            if (problems.length > 0 && problems.length < count) {
                const buf = [];
                for (let i = 0; i < count; i++) buf.push(problems[i % problems.length]);
                problems = buf;
            }
            setPropertiesProblems(problems.slice(0, count));

            // clear BASIC lists (not in use)
            setAddition([]); setSubtraction([]); setMultiplication([]); setDivision([]);
        }
    };

    // Finish when all correct
    const allProblems = useMemo(() => {
        if (equationType === EQUATION_TYPE.BASIC) {
            return [...addition, ...subtraction, ...multiplication, ...division].map((p) => ({
                type: "basic", ok: isNumberCorrect(p.userAnswer, p.answer),
            }));
        }
        return propertiesProblems.map((p) => ({ type: "props", ok: isPropertiesProblemCorrect(p) }));
    }, [equationType, addition, subtraction, multiplication, division, propertiesProblems]);

    useEffect(() => {
        if (!allProblems.length || finished) return;
        const allOk = allProblems.every((p) => p.ok);
        if (allOk) {
            setFinished(true);
            setSubmitted(true);
            stopTimer();
            setLocked(false);
        }
    }, [allProblems, finished]);

    useEffect(() => () => stopTimer(), []);

    const handleSubmit = () => setSubmitted(true);
    const toggleOperation = (op) => setOperations((prev) => ({ ...prev, [op]: !prev[op] }));

    /* ===== UI bits for full-width option rows & tooltips ===== */

    const stopToggle = (e) => { e.preventDefault(); e.stopPropagation(); };

    const InfoOption = ({ id, groupName, label, tooltip, checked, onChange }) => (
        <label className="optionRow" htmlFor={`${groupName}-${id}`}>
            <span className="optionLeft">
                <input
                    id={`${groupName}-${id}`}
                    type="radio"
                    name={groupName}
                    checked={checked}
                    onChange={onChange}
                />
                <span className="optionLabel">{label}</span>
            </span>
            <span className="infoWrap" onMouseDown={stopToggle} onClick={stopToggle}>
                <span className="infoIcon" tabIndex={0} aria-describedby={`tip-${id}`} aria-label={`Info: ${label}`} />
                <span id={`tip-${id}`} className="tooltip" role="tooltip">{tooltip}</span>
            </span>
        </label>
    );

    return (
        <div className="wrap">
            <style>{`
        .wrap { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
          background: var(--app-bg); color: var(--text-color); min-height: 100vh; padding: 16px; box-sizing: border-box; }
        h2 { text-align: center; font-size: 1.6rem; margin-bottom: 8px; }

        .statusBar { display:flex; justify-content:center; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
        .pill { padding:6px 12px; border-radius:999px; font-weight:700; border:1px solid var(--divider);
          background: var(--header-bg); color: var(--text-color); }
        .startOverBtn { border:none; border-radius:999px; padding:8px 14px; font-weight:700; cursor:pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06); background:#b91c1c; color:white; }

        .groups { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px; }
        @media (max-width: 980px){ .groups { grid-template-columns: 1fr; } }

        fieldset.group {
          border:1px solid var(--divider);
          border-radius:12px;
          background: var(--header-bg);
          padding:0;
          overflow: hidden; /* default: keep children inside unless overridden */
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          position: relative;
        }
        /* Allow tooltips to overflow only in Equation Type group */
        fieldset.group.groupEqType { overflow: visible; }

        fieldset.group > legend { margin-left: 12px; padding: 0 6px; font-weight: 800; color: var(--text-color); }
        .groupBody { padding: 12px; }
        fieldset.group[disabled] { opacity: .85; }

        .groupGrid { display:grid; gap:10px; }

        .ctrlPair { display:grid; grid-template-columns: minmax(140px, 0.46fr) minmax(0, 0.54fr); align-items:center; gap:10px; }
        .ctrlPair .label { justify-self:end; text-align:right; }
        .numberInput { /*width:100%;*/ padding:10px 12px; border:1px solid var(--divider); border-radius:8px;
          background: var(--header-bg); color: var(--text-color); }
        .checkInput { width:22px; height:22px; }

        .opGrid { display:grid; grid-template-columns: 1fr; gap:10px; } /* full width items */

        /* Full-width bordered option rows with info icon */
        .optionRow {
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          /*width:100%;*/ padding:10px 12px; border:1px solid var(--divider); border-radius:8px;
          background: var(--header-bg);
        }
        .optionLeft { display:flex; align-items:center; gap:10px; min-width:0; }
        .optionLabel { font-weight:600; }

        /* Info icon + tooltip (with high z-index) */
        .infoWrap { position:relative; display:inline-flex; z-index: 20; }
        .infoIcon {
          display:inline-grid; place-items:center; width:20px; height:20px; border-radius:50%;
          border:1px solid var(--divider); font-size:12px; font-weight:800; cursor:default;
          user-select:none; background: var(--header-bg);
        }
        .infoIcon::before { content:"i"; line-height:1; }
        .infoWrap .tooltip {
          position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%);
          background:#111; color:#fff; padding:8px 10px; border-radius:8px; font-size:12px; line-height:1.25;
          box-shadow:0 6px 20px rgba(0,0,0,.25); max-width:260px; width:max-content; opacity:0; visibility:hidden; transition:.15s ease;
          z-index: 9999; /* sit above group borders */
          text-align:left;
        }
        .infoWrap .tooltip::after {
          content:""; position:absolute; top:100%; left:50%; transform:translateX(-50%);
          border:6px solid transparent; border-top-color:#111;
        }
        .infoWrap:hover .tooltip,
        .infoWrap:focus-within .tooltip { opacity:1; visibility:visible; }

        /* Run bar with BIG Start */
        .runBar { display:flex; justify-content:center; gap:12px; margin: 10px 0 16px; }
        .primaryBtn {
          border:none; border-radius:999px; padding:14px 28px; font-size:18px; font-weight:800; cursor:pointer;
          box-shadow:0 4px 14px rgba(0,0,0,0.12); background:var(--brand, #065f46); color:white; min-width:200px; min-height:60px;
        }
        .primaryBtn.secondary { background:#334155; }

        .columns { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
        .card { background: var(--header-bg); padding:12px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.08); border:1px solid var(--divider); }
        .cardTitle { text-align:center; margin-bottom:10px; }

        .expr { font-size:20px; width:fit-content; margin:auto; text-align:right; }
        .hr { border-top:2px solid currentColor; opacity:.6; margin-top:2px; }

        .answerRow { display:flex; align-items:center; justify-content:center; gap:8px; }
        .answerInput { width:120px; padding:10px 12px; font-size:18px; border-radius:8px; border:1px solid var(--divider); background: var(--header-bg); color: var(--text-color); text-align: right; }
        .answerInput:focus { outline: 2px solid var(--brand); outline-offset: 2px; }
        .mark.ok { color:#16a34a; text-align:center; margin-top:6px; }
        .mark.no { color:#dc2626; text-align:center; margin-top:6px; }

        .opPicker { display:inline-flex; gap:6px; vertical-align:middle; }
        .opBtn { border:1px solid var(--divider); padding:6px 10px; border-radius:8px; font-weight:700; background: var(--header-bg); }
        .opBtn.active { outline:2px solid var(--brand); }

        /* NEW: draw square brackets around numeric blanks in Properties */
        .bracketed {
          position: relative;
          display: inline-flex;
          align-items: center;
          padding: 0 10px; /* space for brackets */
        }
        .bracketed::before,
        .bracketed::after {
          content: "";
          display: inline-block;
          width: 8px;
          height: 1.4em;
          border-top: 2px solid currentColor;
          border-bottom: 2px solid currentColor;
        }
        .bracketed::before {
          border-left: 2px solid currentColor;
          margin-right: 6px;
        }
        .bracketed::after {
          border-right: 2px solid currentColor;
          margin-left: 6px;
        }
        .groups { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
          margin-bottom: 12px; 
        }
        fieldset.group.groupEqType {
          grid-column: 1 / -1;                 
          justify-self: center;                 
          width: calc((100% - 12px) / 2);      
          overflow: visible;                
        }
        @media (max-width: 980px) {
        .groups { grid-template-columns: 1fr; }
        fieldset.group.groupEqType { width: 100%; }
        }
      `}</style>

            <h2>Mathematics Practice</h2>

            <div className="statusBar">
                <span className="pill">{finished ? `Finished: ${formatTime(elapsed)}` : `Time: ${formatTime(elapsed)}`}</span>
                {locked && <button className="startOverBtn" onClick={stopAndReset}>Start Over</button>}
                {!locked && noneSelected && <span className="pill" role="status" aria-live="polite">Select at least one operation</span>}
            </div>

            <div className="groups" role="region" aria-label="Configuration">
                {/* 1) Operations — ALWAYS present */}
                <fieldset className="group" disabled={locked}>
                    <legend>Operations</legend>
                    <div className="groupBody">
                        <div className="opGrid">
                            <label className="optionRow">
                                <span className="optionLeft">
                                    <input type="checkbox" checked={operations.add} onChange={() => setOperations(p => ({ ...p, add: !p.add }))} />
                                    <span className="optionLabel">Add (+)</span>
                                </span>
                            </label>
                            <label className="optionRow">
                                <span className="optionLeft">
                                    <input type="checkbox" checked={operations.sub} onChange={() => setOperations(p => ({ ...p, sub: !p.sub }))} />
                                    <span className="optionLabel">Subtract (−)</span>
                                </span>
                            </label>
                            <label className="optionRow">
                                <span className="optionLeft">
                                    <input type="checkbox" checked={operations.mul} onChange={() => setOperations(p => ({ ...p, mul: !p.mul }))} />
                                    <span className="optionLabel">Multiply (×)</span>
                                </span>
                            </label>
                            <label className="optionRow">
                                <span className="optionLeft">
                                    <input type="checkbox" checked={operations.div} onChange={() => setOperations(p => ({ ...p, div: !p.div }))} />
                                    <span className="optionLabel">Divide (÷)</span>
                                </span>
                            </label>
                        </div>
                    </div>
                </fieldset>

                {/* 2) Practice Settings */}
                <fieldset className="group" disabled={locked}>
                    <legend>Practice Settings</legend>
                    <div className="groupBody">
                        <div className="groupGrid">
                            <label className="ctrlPair">
                                <span className="label">Equations per type</span>
                                <input
                                    type="number"
                                    className="numberInput"
                                    min={LIMITS.EQUATIONS.MIN}
                                    max={LIMITS.EQUATIONS.MAX}
                                    value={numEquations}
                                    onWheel={(e) => e.target.blur()}
                                    onChange={(e) => setNumEquations(clamp(Math.floor(Number(e.target.value) || 1), LIMITS.EQUATIONS.MIN, LIMITS.EQUATIONS.MAX))}
                                />
                            </label>
                            <label className="ctrlPair">
                                <span className="label">Min number</span>
                                <input
                                    type="number"
                                    className="numberInput"
                                    min={LIMITS.NUMBERS.MIN}
                                    max={LIMITS.NUMBERS.MAX}
                                    value={minNumber}
                                    onWheel={(e) => e.target.blur()}
                                    onChange={(e) => setMinNumber(clamp(Number(e.target.value) || 0, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX))}
                                />
                            </label>
                            <label className="ctrlPair">
                                <span className="label">Max number</span>
                                <input
                                    type="number"
                                    className="numberInput"
                                    min={LIMITS.NUMBERS.MIN}
                                    max={LIMITS.NUMBERS.MAX}
                                    value={maxNumber}
                                    onWheel={(e) => e.target.blur()}
                                    onChange={(e) => setMaxNumber(clamp(Number(e.target.value) || 0, LIMITS.NUMBERS.MIN, LIMITS.NUMBERS.MAX))}
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
                                <span className="label">Allow fractional ÷</span>
                                <input type="checkbox" className="checkInput" checked={fractionalDiv} onChange={(e) => setFractionalDiv(e.target.checked)} />
                            </label>
                            <label className="ctrlPair">
                                <span className="label">Precision</span>
                                <input
                                    type="number"
                                    className="numberInput"
                                    min={LIMITS.PRECISION.MIN}
                                    max={LIMITS.PRECISION.MAX}
                                    value={divPrecision}
                                    onWheel={(e) => e.target.blur()}
                                    onChange={(e) => setDivPrecision(clamp(Math.floor(Number(e.target.value) || 0), LIMITS.PRECISION.MIN, LIMITS.PRECISION.MAX))}
                                    disabled={!fractionalDiv}
                                    title={
                                        fractionalDiv
                                            ? "0–" + LIMITS.PRECISION.MAX + " decimals"
                                            : "Enable fractional division to adjust"
                                    }
                                />
                            </label>
                        </div>
                    </div>
                </fieldset>

                {/* 3) Equation Type (full-width rows, tooltips) */}
                <fieldset className="group groupEqType" disabled={locked}>
                    <legend>Equation Type</legend>
                    <div className="groupBody">
                        <div className="opGrid">
                            <InfoOption
                                id="basic"
                                groupName="eqType"
                                label="Basic"
                                tooltip="Standard arithmetic problems using your selected operations (+, −, ×, ÷). Enter numeric answers."
                                checked={equationType === EQUATION_TYPE.BASIC}
                                onChange={() => { setEquationType(EQUATION_TYPE.BASIC); }}
                            />
                            <InfoOption
                                id="dist"
                                groupName="eqType"
                                label="Properties — Distributive"
                                tooltip="a × (b + c) = a×b + a×c. Requires + and × to be enabled. Fill numbers or operators based on Solve Mode."
                                checked={equationType === EQUATION_TYPE.PROP_DIST}
                                onChange={() => setEquationType(EQUATION_TYPE.PROP_DIST)}
                            />
                            <InfoOption
                                id="comm"
                                groupName="eqType"
                                label="Properties — Commutative"
                                tooltip="a ⊕ b = b ⊕ a. Works for + or ×. Uses whichever you enabled. Fill numbers or operators per Solve Mode."
                                checked={equationType === EQUATION_TYPE.PROP_COMM}
                                onChange={() => setEquationType(EQUATION_TYPE.PROP_COMM)}
                            />
                            <InfoOption
                                id="assoc"
                                groupName="eqType"
                                label="Properties — Associative"
                                tooltip="(a ⊕ b) ⊕ c = a ⊕ (b ⊕ c). Works for + or ×. Uses whichever you enabled. Fill numbers or operators per Solve Mode."
                                checked={equationType === EQUATION_TYPE.PROP_ASSOC}
                                onChange={() => setEquationType(EQUATION_TYPE.PROP_ASSOC)}
                            />
                        </div>
                    </div>
                </fieldset>
            </div>

            {/* Run bar */}
            <div className="runBar">
                <button
                    className="primaryBtn"
                    onClick={generateAll}
                    disabled={locked || noneSelected}
                    title={noneSelected ? "Select at least one operation" : "Start practice"}
                >
                    {locked ? "In Progress…" : "Start"}
                </button>
                {!locked && hasGenerated && (
                    <button className="primaryBtn secondary" onClick={resetAll}>Clear</button>
                )}
            </div>

            {/* OUTPUT */}
            {equationType === EQUATION_TYPE.BASIC ? (
                <div className="columns">
                    {renderBasicColumn("Addition", addition, "add")}
                    {renderBasicColumn("Subtraction", subtraction, "sub")}
                    {renderBasicColumn("Multiplication", multiplication, "mul")}
                    {renderBasicColumn("Division", division, "div")}
                </div>
            ) : (
                hasGenerated && propertiesProblems.length > 0 && (
                    <div className="columns">
                        {renderPropertiesColumn(
                            equationType === EQUATION_TYPE.PROP_DIST
                                ? "Properties — Distributive"
                                : equationType === EQUATION_TYPE.PROP_COMM
                                    ? "Properties — Commutative"
                                    : "Properties — Associative",
                            propertiesProblems
                        )}
                    </div>
                )
            )}
            {(
                equationType === EQUATION_TYPE.BASIC
                    ? addition.length + subtraction.length + multiplication.length + division.length
                    : propertiesProblems.length
            ) > 0 && !finished && (
                    <div style={{ textAlign: "center", marginTop: 16 }}>
                        <button className="primaryBtn" onClick={() => setSubmitted(true)} disabled={submitted}>
                            {submitted ? "Submitted" : "Submit Answers"}
                        </button>
                    </div>
                )}
        </div>
    );
}

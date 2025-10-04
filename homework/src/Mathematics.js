import React, { useState } from "react";

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateExpressions(type, count, min, max) {
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
                expr = `${a} - ${b}`;
                answer = a - b;
                break;
            case "mul":
                expr = `${a} × ${b}`;
                answer = a * b;
                break;
            case "div":
                b = getRandomInt(min, max);
                if (b === 0) b = 1;
                const quotient = getRandomInt(min, max);
                a = b * quotient;
                expr = `${a} ÷ ${b}`;
                answer = quotient;
                break;
            default:
                break;
        }

        expressions.push({ expr, answer, userAnswer: "" });
    }
    return expressions;
}

export default function Mathematics() {
    const [numEquations, setNumEquations] = useState(5);
    const [minNumber, setMinNumber] = useState(1);
    const [maxNumber, setMaxNumber] = useState(10);

    const [addition, setAddition] = useState([]);
    const [subtraction, setSubtraction] = useState([]);
    const [multiplication, setMultiplication] = useState([]);
    const [division, setDivision] = useState([]);

    const [submitted, setSubmitted] = useState(false);

    const generateAll = () => {
        setAddition(generateExpressions("add", numEquations, minNumber, maxNumber));
        setSubtraction(generateExpressions("sub", numEquations, minNumber, maxNumber));
        setMultiplication(generateExpressions("mul", numEquations, minNumber, maxNumber));
        setDivision(generateExpressions("div", numEquations, minNumber, maxNumber));
        setSubmitted(false);
    };

    const handleChange = (type, index, value) => {
        const setterMap = {
            add: setAddition,
            sub: setSubtraction,
            mul: setMultiplication,
            div: setDivision,
        };
        const dataMap = {
            add: addition,
            sub: subtraction,
            mul: multiplication,
            div: division,
        };
        const newData = [...dataMap[type]];
        newData[index].userAnswer = value;
        setterMap[type](newData);
    };

    const handleSubmit = () => setSubmitted(true);

    const renderColumn = (title, data, type) => (
        <div style={{
            flex: 1,
            margin: 10,
            padding: 15,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
        }}>
            <h3 style={{ marginBottom: 15 }}>{title}</h3>
            <div style={{ display: "grid", gap: "16px" }}>
                {data.map((item, idx) => {
                    const [a, operator, b] = item.expr.split(" ");
                    return (
                        <div key={idx} style={{ textAlign: "center" }}>
                            {/* Numbers stacked vertically */}
                            <div style={{ fontSize: "20px", textAlign: "right", width: "70px", margin: "0 auto" }}>
                                {a}
                                <div>
                                    {operator} {b}
                                </div>
                                <div style={{ borderTop: "2px solid #000", marginTop: "2px" }}></div>
                            </div>

                            {/* Answer input */}
                            <div style={{ marginTop: 4 }}>
                                <input
                                    type="number"
                                    value={item.userAnswer}
                                    onChange={(e) => handleChange(type, idx, e.target.value)}
                                    disabled={submitted && item.userAnswer == item.answer}   // ✅ only disable if correct
                                    style={{ width: 70, fontSize: "16px" }}
                                />
                                {submitted && (
                                    <span style={{
                                        marginLeft: 8,
                                        fontSize: "18px",
                                        fontWeight: "bold",
                                        color: item.userAnswer == item.answer ? "green" : "red"
                                    }}>
                                        {item.userAnswer == item.answer ? "✓" : "✗"}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div style={{ textAlign: "center" }}>
            <h2>Mathematics Practice</h2>

            <div style={{ marginBottom: 20 }}>
                <label>Equations per type: </label>
                <input
                    type="number"
                    value={numEquations}
                    onChange={(e) => setNumEquations(Number(e.target.value))}
                    style={{ width: 60, marginRight: 10 }}
                />
                <label>Min number: </label>
                <input
                    type="number"
                    value={minNumber}
                    onChange={(e) => setMinNumber(Number(e.target.value))}
                    style={{ width: 60, marginRight: 10 }}
                />
                <label>Max number: </label>
                <input
                    type="number"
                    value={maxNumber}
                    onChange={(e) => setMaxNumber(Number(e.target.value))}
                    style={{ width: 60, marginRight: 10 }}
                />
                <button onClick={generateAll}>Generate</button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
                {renderColumn("Addition", addition, "add")}
                {renderColumn("Subtraction", subtraction, "sub")}
                {renderColumn("Multiplication", multiplication, "mul")}
                {renderColumn("Division", division, "div")}
            </div>

            {addition.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <button onClick={handleSubmit} disabled={submitted}>Submit Answers</button>
                </div>
            )}
        </div>
    );
}

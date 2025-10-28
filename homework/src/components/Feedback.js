import React, { useRef, useState } from "react";

export default function Feedback() {
  const [state, setState] = useState({ sending: false, ok: null, msg: "" });
  const formRef = useRef(null);
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/mrbylblr";

  async function handleSubmit(e) {
    e.preventDefault();
    if (state.sending) return;

    const form = formRef.current;
    const fd = new FormData(form);

    // client-side quick check
    const name = (fd.get("name") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const message = (fd.get("message") || "").toString().trim();
    if (!name || !email || !message) {
      setState({ sending: false, ok: false, msg: "Please fill out all fields." });
      return;
    }

    // 5s throttle to reduce accidental double submits
    if (window.__lastSend && Date.now() - window.__lastSend < 5000) {
      setState({ sending: false, ok: false, msg: "Please wait a few seconds before trying again." });
      return;
    }

    setState({ sending: true, ok: null, msg: "" });

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      window.__lastSend = Date.now();

      if (res.ok) {
        form.reset();
        setState({ sending: false, ok: true, msg: "Thanks! We'll get back to you shortly." });
      } else {
        setState({
          sending: false,
          ok: false,
          msg: data?.error || data?.message || "Something went wrong.",
        });
      }
    } catch {
      setState({ sending: false, ok: false, msg: "Network error. Please try again." });
    }
  }

  const nameId = "fb-name";
  const emailId = "fb-email";
  const msgId = "fb-message";

  return (
    <div className="feedbackWrap">
      <style>{`
        .feedbackWrap{
          max-width: 720px;
          margin: 0 auto;
          padding: 16px;
          color: var(--text-color);
        }
        .feedbackHead{ 
          text-align:center; 
          margin: 0 0 6px; 
          font-size: clamp(20px, 6vw, 32px);
          font-weight: 800;
        }
        .feedbackSub{ 
          text-align:center; 
          opacity:.85; 
          margin: 0 0 16px; 
          font-size: clamp(14px, 3.8vw, 18px);
        }

        .feedbackForm{
          display:grid;
          gap:12px;
          background: var(--header-bg);
          border: 1px solid var(--divider);
          border-radius: 12px;
          padding: 16px;
          box-shadow: var(--shadow-1);
        }

        .feedbackRow{
          display:grid;
          gap:12px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 560px){
          .feedbackRow{ grid-template-columns: 1fr 1fr; }
        }

        .feedbackCtrl{ display:flex; flex-direction:column; gap:6px; }
        .feedbackLabel{ font-weight:700; }
        .feedbackInput{ width:100%; box-sizing:border-box; }
        textarea.feedbackInput{
          min-height: 130px;
          resize: vertical;
          text-align: left;
        }

        .feedbackActions{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        }

        /* status chip colors */
        .feedbackMsg{
          display:inline-flex;
          align-items:center;
          gap:8px;
          border-radius: 999px;
          padding: 6px 12px;
          border: 1px solid var(--divider);
          background: var(--header-bg);
          color: var(--text-color);
          font-weight: 700;
        }
        .feedbackMsg.ok{
          color: var(--ok);
          border-color: color-mix(in oklab, var(--ok) 50%, var(--divider));
        }
        .feedbackMsg.err{
          color: var(--no);
          border-color: color-mix(in oklab, var(--no) 50%, var(--divider));
        }
      `}</style>

      <h1 className="feedbackHead">Contact Us</h1>
      <p className="feedbackSub">Send feedback or ask for support. We’ll email you back.</p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="feedbackForm"
        noValidate
        aria-busy={state.sending ? "true" : "false"}
      >
        {/* Honeypot */}
        <input type="text" name="_gotcha" tabIndex="-1" autoComplete="off" style={{ display: "none" }} />

        {/* Optional metadata fields sent to Formspree */}
        <input type="hidden" name="_subject" value="Tini-Tiny Labs Feedback" />
        <input type="hidden" name="page" value={typeof window !== "undefined" ? window.location.href : ""} />

        <div className="feedbackRow">
          <div className="feedbackCtrl">
            <label htmlFor={nameId} className="feedbackLabel">Your name</label>
            <input
              id={nameId}
              name="name"
              type="text"
              required
              className="numberInput feedbackInput"
              maxLength={80}
              autoComplete="name"
              placeholder="Jane Doe"
            />
          </div>

          <div className="feedbackCtrl">
            <label htmlFor={emailId} className="feedbackLabel">Your email</label>
            <input
              id={emailId}
              name="email"
              type="email"
              required
              className="numberInput feedbackInput"
              maxLength={120}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="feedbackCtrl">
          <label htmlFor={msgId} className="feedbackLabel">Message</label>
          <textarea
            id={msgId}
            name="message"
            rows={5}
            required
            className="numberInput feedbackInput"
            maxLength={4000}
            placeholder="Tell us what’s on your mind…"
          />
        </div>

        <div className="feedbackActions">
          <button className="primaryBtn" type="submit" disabled={state.sending}>
            {state.sending ? "Sending…" : "Send"}
          </button>

          {/* a11y: live region for status */}
          <span
            role="status"
            aria-live="polite"
            className={`feedbackMsg ${state.ok == null ? "" : state.ok ? "ok" : "err"}`}
            style={{ display: state.msg ? "inline-flex" : "none" }}
          >
            {state.ok === true ? "✓" : state.ok === false ? "⚠" : ""} {state.msg}
          </span>
        </div>
      </form>

      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>
        Tip: please include screenshots or steps to reproduce if it’s a bug.
      </p>
    </div>
  );
}

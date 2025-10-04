import React, { useRef, useState } from "react";

export default function Feedback() {
  const [state, setState] = useState({ sending: false, ok: null, msg: "" });
  const formRef = useRef(null);
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/mrbylblr";

  async function handleSubmit(e) {
    e.preventDefault();
    if (state.sending) return;
    setState({ sending: true, ok: null, msg: "" });

    const fd = new FormData(formRef.current);

    if (window.__lastSend && Date.now() - window.__lastSend < 5000) {
      setState({ sending: false, ok: false, msg: "Please wait a few seconds before trying again." });
      return;
    }

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });
      const data = await res.json();
      window.__lastSend = Date.now();

      if (res.ok) {
        formRef.current.reset();
        setState({ sending: false, ok: true, msg: "Thanks! We'll get back to you shortly." });
      } else {
        setState({ sending: false, ok: false, msg: data?.error || "Something went wrong." });
      }
    } catch (err) {
      setState({ sending: false, ok: false, msg: "Network error. Please try again." });
    }
  }

  const nameId = "fb-name";
  const emailId = "fb-email";
  const msgId = "fb-message";

  return (
    <div className="feedbackWrap">
      <style>{`
        .feedbackWrap{ max-width: 560px; margin: 0 auto; padding: 16px; }
        .feedbackHead{ text-align:center; margin:0 0 6px; }
        .feedbackSub{ text-align:center; opacity:.8; margin: 0 0 16px; }

        .feedbackForm{
          display:grid;
          gap:12px;
          background: var(--header-bg);
          border: 1px solid var(--divider);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .feedbackCtrl{
          display:flex;
          flex-direction:column;
          gap:6px;
        }
        .feedbackLabel{ font-weight:700; }
        .feedbackInput{
          width:100%;
          box-sizing:border-box;
        }
        textarea.feedbackInput{
          min-height:120px;
          resize: vertical;
          text-align: left;
        }

        .feedbackActions{
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
        }
      `}</style>

      <h1 className="feedbackHead">Contact Us</h1>
      <p className="feedbackSub">Send feedback or ask for support. We’ll email you back.</p>

      <form ref={formRef} onSubmit={handleSubmit} className="feedbackForm" noValidate>
        {/* Honeypot */}
        <input type="text" name="_gotcha" tabIndex="-1" autoComplete="off" style={{ display: "none" }} />

        <div className="feedbackCtrl">
          <label htmlFor={nameId} className="feedbackLabel">Your name</label>
          <input id={nameId} name="name" type="text" required className="numberInput feedbackInput" />
        </div>

        <div className="feedbackCtrl">
          <label htmlFor={emailId} className="feedbackLabel">Your email</label>
          <input id={emailId} name="email" type="email" required className="numberInput feedbackInput" />
        </div>

        <div className="feedbackCtrl">
          <label htmlFor={msgId} className="feedbackLabel">Message</label>
          <textarea id={msgId} name="message" rows="5" required className="numberInput feedbackInput" />
        </div>

        <div className="feedbackActions">
          <button className="primaryBtn" type="submit" disabled={state.sending}>
            {state.sending ? "Sending…" : "Send"}
          </button>
          {state.msg && <span className="pill">{state.msg}</span>}
        </div>
      </form>

      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>
        Tip: please include screenshots or steps to reproduce if it’s a bug.
      </p>
    </div>
  );
}

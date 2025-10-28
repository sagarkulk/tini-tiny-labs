import React, { useRef, useState } from "react";
import "../components/styles/App.Feedback.css";

export default function Feedback() {
  const [state, setState] = useState({ sending: false, ok: null, msg: "" });
  const formRef = useRef(null);
  const FORMSPREE_ENDPOINT = "https://formspree.io/f/mrbylblr";

  async function handleSubmit(e) {
    e.preventDefault();
    if (state.sending) return;

    const form = formRef.current;
    const fd = new FormData(form);
    const name = (fd.get("name") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const message = (fd.get("message") || "").toString().trim();

    if (!name || !email || !message) {
      setState({ sending: false, ok: false, msg: "Please fill out all fields." });
      return;
    }

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

  return (
    <div className="feedbackWrap">
      <h1 className="feedbackHead">Contact Us</h1>
      <p className="feedbackSub">Send feedback or ask for support. We’ll email you back.</p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="feedbackForm"
        noValidate
        aria-busy={state.sending ? "true" : "false"}
      >
        <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" style={{ display: "none" }} />
        <input type="hidden" name="_subject" value="Tini-Tiny Labs Feedback" />
        <input
          type="hidden"
          name="page"
          value={typeof window !== "undefined" ? window.location.href : ""}
        />

        <div className="feedbackCtrl">
          <label htmlFor="fb-name" className="feedbackLabel">Your name</label>
          <input id="fb-name" name="name" type="text" required className="feedbackInput" placeholder="Jane Doe" />
        </div>

        <div className="feedbackCtrl">
          <label htmlFor="fb-email" className="feedbackLabel">Your email</label>
          <input id="fb-email" name="email" type="email" required className="feedbackInput" placeholder="you@example.com" />
        </div>

        <div className="feedbackCtrl">
          <label htmlFor="fb-message" className="feedbackLabel">Message</label>
          <textarea id="fb-message" name="message" rows={5} required className="feedbackInput" placeholder="Tell us what’s on your mind…" />
        </div>

        <div className="feedbackActions">
          <button className="primaryBtn" type="submit" disabled={state.sending}>
            {state.sending ? "Sending…" : "Send"}
          </button>

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

      <p className="feedbackTip">
        Tip: please include screenshots or steps to reproduce if it’s a bug.
      </p>
    </div>
  );
}

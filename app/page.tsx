"use client";
import React, { useState } from "react";

export default function Home() {
  // UI state
  const [email, setEmail] = useState("");
  const [freeText, setFreeText] = useState(
    "I am 30 with $10k saved, contribute $500/mo, target $200k by 40, expect 6% returns, 2% inflation, retire at 40."
  );
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<any>(null);
  const [status, setStatus] = useState<string>("");

  // 1) Generate plan (calls /api/compose → NLP + Python math)
  async function onGenerate() {
    setStatus("Generating…");
    setLoading(true);
    setPayload(null);
    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: freeText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate");
      setPayload(json);     // { inputs, results }
      setStatus("Done ✅");
    } catch (e: any) {
      setStatus(e.message || "Error ❌");
    } finally {
      setLoading(false);
    }
  }

  // 2) Email plan (calls /api/send-plan)
  async function onEmail() {
    if (!email) return alert("Please enter your email.");
    if (!payload) return alert("Generate your plan first.");

    setStatus("Emailing…");
    setLoading(true);
    try {
      const r = await fetch("/api/send-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          inputs: payload.inputs,
          results: payload.results,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to send");
      setStatus("Sent ✉️");
      alert("Plan sent! Check your inbox.");
    } catch (e: any) {
      setStatus(e.message || "Email error ❌");
    } finally {
      setLoading(false);
    }
  }

  // — Simple UI (you can swap this markup later and keep the two handlers) —
  return (
    <main style={{ minHeight: "100vh", padding: 16, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>FIRE Plan Generator</h1>

      <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Your email</label>
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: 10, marginBottom: 12 }}
      />

      <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Describe your situation</label>
      <textarea
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
        style={{ width: "100%", border: "1px solid #ddd", borderRadius: 8, padding: 10, height: 120, marginBottom: 12 }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={onGenerate}
          disabled={loading}
          style={{ background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 8, border: 0, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Working..." : "Generate my plan"}
        </button>
        <button
          onClick={onEmail}
          disabled={loading}
          style={{ background: "#0a7", color: "#fff", padding: "10px 14px", borderRadius: 8, border: 0, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Sending..." : "Email me the plan"}
        </button>
      </div>

      <div style={{ color: "#555", marginTop: 6 }}>{status}</div>

      {payload && (
        <section style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Result (debug view)</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(payload, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}

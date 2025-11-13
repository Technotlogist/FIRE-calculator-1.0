import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_FROM = "FIRE Calculator <onboarding@resend.dev>";

function fmt(n: number, style: "money" | "pct" | "int" = "money") {
  if (n == null) return "-";
  if (style === "money")
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  if (style === "pct") return `${(n * 100).toFixed(1)}%`;
  return String(Math.round(n));
}

export async function POST(req: NextRequest) {
  try {
    const { email, inputs, results, from } = await req.json();

    if (!email || !inputs || !results) {
      return NextResponse.json({ error: "Missing email, inputs, or results" }, { status: 400 });
    }

    const {
      age, currentSavings, monthlyContribution, expectedReturn, inflation, targetNestEgg, retirementAge
    } = inputs;

    const rows = (results.projections || []).slice(0, 12).map((p: any) => `
      <tr>
        <td style="padding:6px;border:1px solid #eee;">${p.age}</td>
        <td style="padding:6px;border:1px solid #eee;">${fmt(p.balance_nominal)}</td>
        <td style="padding:6px;border:1px solid #eee;">${fmt(p.balance_real)}</td>
      </tr>
    `).join("");

    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 8px">Your FIRE Plan</h2>
        <h3 style="margin:16px 0 6px">Inputs</h3>
        <ul style="margin:0 0 16px;padding-left:18px">
          <li>Age: <b>${age}</b></li>
          <li>Current savings: <b>${fmt(currentSavings)}</b></li>
          <li>Monthly contribution: <b>${fmt(monthlyContribution)}</b></li>
          <li>Expected return: <b>${fmt(expectedReturn, "pct")}</b></li>
          <li>Inflation: <b>${fmt(inflation, "pct")}</b></li>
          <li>Target nest egg: <b>${fmt(targetNestEgg)}</b></li>
          <li>Retirement age: <b>${retirementAge}</b></li>
        </ul>
        <h3 style="margin:16px 0 6px">Outcome</h3>
        <p style="margin:0 0 8px">
          ${results.reached
            ? `🎯 You reach your target in ~<b>${results.years_to_target}</b> year(s).`
            : `📈 Not reached by age ${retirementAge}. Consider higher contribution or return.`}
        </p>
        <h3 style="margin:16px 0 6px">Projection (first 12 years)</h3>
        <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #eee;margin:8px 0;">
          <thead>
            <tr>
              <th align="left" style="padding:6px;border:1px solid #eee;background:#fafafa;">Age</th>
              <th align="left" style="padding:6px;border:1px solid #eee;background:#fafafa;">Balance (Nominal)</th>
              <th align="left" style="padding:6px;border:1px solid #eee;background:#fafafa;">Balance (Real)</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="3" style="padding:6px;border:1px solid #eee;">No rows</td></tr>`}</tbody>
        </table>
      </div>
    `;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || DEFAULT_FROM,
        to: email,
        subject: "Your FIRE Plan",
        html,
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      return NextResponse.json({ error: `Resend error: ${text}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

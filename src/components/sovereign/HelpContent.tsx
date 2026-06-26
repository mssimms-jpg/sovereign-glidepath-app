import React from "react";
import "@/components/sovereign/desk.css";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="shd-card" style={{ marginBottom: "1.5rem" }}>
      <h2 className="shd-h2" style={{ marginBottom: "0.75rem" }}>
        {title}
      </h2>
      <div style={{ lineHeight: 1.7, color: "var(--text-main)" }}>{children}</div>
    </section>
  );
}

export function HelpContent() {
  return (
    <div className="shd-root">
      <div className="shd-container" style={{ maxWidth: 900 }}>
        <header className="shd-header">
          <h1>Help &amp; User Manual</h1>
        </header>

        <Section title="What this app is">
          <p>
            <strong>Sovereign Glidepath</strong> is a recreational retirement-withdrawal modelling
            dashboard. You enter your current equity and money-market balances each quarter, and the
            desk recommends how much to draw and from which pot, using the Guyton-Klinger guardrail
            method combined with a phase-of-life adjustment and a cash-shield runway target.
          </p>
          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)" }}>
            It is a planning aid, not financial advice. Always sanity-check the directives against
            your own circumstances.
          </p>
        </Section>

        <Section title="Quick start (6 steps)">
          <div
            style={{
              padding: "0.85rem 1rem",
              background: "rgba(59,130,246,0.08)",
              border: "1px solid var(--accent-blue)",
              borderRadius: 8,
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
          >
            <strong>Assumption: the two-bucket strategy.</strong> The desk assumes you are using (or
            planning to use) a two-bucket withdrawal strategy — a <strong>Cash Pot</strong> sized to
            fund the next 12–36 months of spending and a <strong>Global Equities Pot</strong> for
            everything else. See the <em>Two-bucket strategy</em>
            section below, and chapter 3 of the Full Manual, for the rationale.
            <div style={{ marginTop: "0.5rem" }}>
              <strong>Planning shortcut:</strong> if you don't physically run two pots today it's
              perfectly fine to <em>notionally</em> group your existing holdings. Bundle cash /
              money-market funds / premium bonds / high-interest savings into the{" "}
              <strong>Cash Pot</strong>, and ETFs / index funds / individual equities into the{" "}
              <strong>Global Equities Pot</strong>. The model only cares about the totals.
            </div>
          </div>
          <ol style={{ paddingLeft: "1.25rem" }}>
            <li>
              Pick your display <strong>currency</strong> (£ / € / $) in Pane 1. This is cosmetic —
              no FX conversion happens.
            </li>
            <li>
              Set your <strong>current age</strong> and <strong>capping age</strong> (the age you
              plan the model to run to).
            </li>
            <li>
              Enter your <strong>Global Equities</strong> balance, <strong>Cash Pot</strong>{" "}
              balance, and your portfolio <strong>All-Time High (ATH)</strong>.
            </li>
            <li>
              Enter your <strong>Target Annual Base Withdrawal</strong>.
            </li>
            <li>
              Read the <strong>Directive</strong> pane (3): it tells you how much to draw this
              quarter and from which pot.
            </li>
            <li>
              Click <strong>Commit</strong> to log the quarter to the ledger; scroll to the{" "}
              <strong>Risk Simulator</strong> (panel 5) to stress-test the plan against 2,750
              possible futures.
            </li>
          </ol>
        </Section>

        <Section title="Two-bucket strategy">
          <p>
            The desk is built around a deliberately simple two-bucket model: a{" "}
            <strong>Cash Pot</strong> (months of spending you can draw without selling anything
            risky) and a <strong>Global Equities Pot</strong> (everything that grows). The Cash Pot
            exists so a market drawdown never forces you to sell shares at the bottom; the Equities
            Pot exists so inflation never quietly eats the plan. The guardrails decide which pot to
            draw from each quarter.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            If your real holdings don't already look like this, the simplest way to start using the
            desk is to <em>group</em> them on paper. Cash, money-market funds, premium bonds,
            high-interest accounts, NS&amp;I, short-dated gilts held to maturity → Cash Pot. Global
            equity trackers, regional / sector ETFs, individual shares, equity-heavy mixed funds →
            Global Equities Pot. Long-dated bonds and gold sit outside this two-bucket
            simplification; many users hold them within the Equities Pot for modelling purposes and
            accept the small loss of fidelity.
          </p>
        </Section>

        <Section title="Risk Simulator — Monte Carlo fan chart">
          <p>
            The rest of the desk gives you one answer: at your assumed growth rate, your capital
            traces a single straight line. The Risk Simulator gives you{" "}
            <strong>2,750 answers</strong>. It re-runs your retirement 2,750 times with fresh annual
            returns each run, and shows the spread as a coloured fan. The point is not to predict
            the future — it's to make the <em>shape</em> of uncertainty visible.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Historical vs Parametric.</strong> Historical draws each year at random from
            MSCI World (Net Total Return, GBP) annual returns 1970–2024 — a global-tracker proxy
            more appropriate for a typical UK investor than a single-country index. It keeps the fat
            tails (1974, 2002, 2008, 2022). Parametric manufactures returns from a normal curve with
            a mean and volatility you control. If your conclusion changes dramatically between the
            two, the bell-curve assumption is probably flattering you.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Yearly Withdrawal Increase Rate (0–5%).</strong> The slider above the chart
            escalates your withdrawal smoothly each year — a stand-in for inflation or planned wage
            growth. Returns are deflated by the same rate, so the whole chart is shown in{" "}
            <strong>today's pounds</strong>. £100k at year 30 means £100k of today's purchasing
            power. Set to 0% to model pure nominal returns with a flat withdrawal.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Annual Pension &amp; Pension Start Age.</strong> The pension amount (in today's
            money) is netted off your withdrawal once you reach the start age. Before that age the
            full withdrawal is funded from capital. A 64-year-old with a state pension at 67, for
            example, funds three years from the pots alone before the pension reduces the net draw.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Assumed State Pension Annual Increase (0–6%).</strong> Escalates the pension
            each year, starting the year after the simulation begins. Setting this <em>above</em>{" "}
            the withdrawal-inflation slider models a pension that grows in real terms (e.g. a UK
            triple-lock state pension running ahead of CPI); equal models a flat-real pension; below
            models real erosion. Combined with the start-age field this gives a much more realistic
            long-run outcome for users counting on a DB or state pension later in retirement.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Reading the chart.</strong> Light blue band = 10–90th percentile (80% of futures
            finished there). Darker blue = 25–75th (the central half). Solid blue line = the median.
            Dashed line = your deterministic projection at the Assumed Growth Rate. Dashed below
            median = cautious. Dashed above = optimistic. The fan widens every year — that widening{" "}
            <em>is</em> sequence-of-returns risk made visible.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>"Sims beating your assumption."</strong> The headline % of futures that ended at
            or above your dashed line. Framed so higher is better: <strong>75%+ green</strong>{" "}
            (conservative, margin to spare), <strong>50–74% amber</strong> (reasonable),
            <strong> 25–49%</strong> (optimistic), <strong>&lt; 25% red</strong> (aggressive — the
            plan leans hard on luck).
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Why the dashed line curves (it isn't a bug).</strong> The dashed line is your
            starting capital projected forward deterministically each year as{" "}
            <code>next = prev × (1 + r) − withdrawal</code>. Two effects shape it:
          </p>
          <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
            <li>
              <strong>Compounding is exponential, not linear.</strong> Even with zero withdrawals,
              growing at e.g. 7%/yr produces a curve that bends <em>upward</em> over time — each
              year's growth is applied to a larger base. On a linear Y-axis that is a curve, not a
              straight line.
            </li>
            <li>
              <strong>Withdrawals tilt the curve.</strong> Subtracting a fixed cash amount each year
              doesn't subtract a fixed <em>percentage</em>: early on it's a small slice of capital,
              later it can be a large slice. So the same withdrawal "bites" more or less depending
              on the balance.
            </li>
          </ul>
          <p style={{ marginTop: "0.5rem" }}>
            Net effect: high capital + low withdrawal → curves <strong>up</strong> (compounding
            wins). Low capital + high withdrawal → curves <strong>down</strong> (withdrawals win,
            and the decline accelerates). Balanced → near-flat. A truly straight line would only
            appear with simple (non-compounding) interest, or on a log scale at zero withdrawals —
            neither reflects how a real portfolio behaves. The Monte Carlo percentile bands curve
            for the same reason; the dashed line is just the deterministic version of that maths.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Capital preserved</strong> = % of runs ending ≥ starting capital. In withdrawal
            mode this is a tough bar by design. The more useful question: is the 10th-percentile
            ending value still positive? If so, even the unlucky 10% of futures didn't run out.
          </p>
          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)" }}>
            <strong>What it does NOT model:</strong> taxes, fees, your actual asset mix, behavioural
            cuts during crashes, surprise CPI shocks, or future regime change. (Smooth yearly
            inflation
            <em> is</em> now modelled via the slider above the chart.) It's a stress test, not a
            forecast. Most useful when the answer makes you uncomfortable.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Zoom brush &amp; hover tooltip.</strong> Drag the handles on the strip beneath
            the chart to zoom into a specific time window — the Y-axis auto-rescales to the visible
            range so short horizons no longer look flat. Drag the highlighted region to pan,
            double-click the brush to reset. Hover anywhere on the chart for a crosshair and a card
            showing the focused Age plus Assumed Growth, Median Path, and the 10th/90th percentile
            values at that year.
          </p>

          <div
            style={{
              marginTop: "1rem",
              padding: "0.85rem 1rem",
              background: "rgba(59,130,246,0.06)",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
            }}
          >
            <p style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>
              FAQ — "Is the maths broken?"
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              <strong>
                Q. My Expected Return is 7% and my Assumed Growth is 7%, so why does the median
                path sit well below the dashed line — and the gap grows with volatility?
              </strong>
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              A. This is <em>volatility drag</em> (a.k.a. the arithmetic-vs-geometric-mean gap),
              and it's real money, not a chart glitch. The number you type is the{" "}
              <strong>arithmetic</strong> mean of annual returns. What a portfolio actually
              compounds at over many years is the <strong>geometric</strong> mean, which is always
              lower whenever returns vary. A good approximation is{" "}
              <code>geometric ≈ arithmetic − σ² / 2</code>:
            </p>
            <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.25rem" }}>
              <li>σ = 0% → drag = 0, the median sits exactly on the dashed line.</li>
              <li>
                σ = 15% → drag ≈ 0.15² / 2 ≈ <strong>1.13 %/yr</strong>, so the median compounds
                at ~5.9% instead of 7%.
              </li>
              <li>σ = 25% → drag ≈ 3.1 %/yr — the median falls visibly away from the dashed line.</li>
            </ul>
            <p style={{ margin: "0 0 0.5rem" }}>
              Intuition: a portfolio that gains 20% then loses 20% ends at 0.96, not 1.00. Bigger
              swings → bigger losses you have to "claw back" the next year. The dashed line ignores
              that; the median respects it.
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              <strong>
                Q. Why is the upper half of the fan so much wider than the lower half?
              </strong>
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              A. Returns compound <em>multiplicatively</em>, which produces a{" "}
              <strong>log-normal</strong> distribution of ending capital. The downside is bounded
              (capital can fall <em>at most</em> to zero — a 100% loss), but the upside is
              unbounded. So the distribution is right-skewed: the 90th percentile sits further{" "}
              <em>above</em> the median than the 10th percentile sits <em>below</em> it. That
              asymmetric fan is the correct visualisation of compounded risk, not a plotting bug.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Q. So the maths is solid?</strong> Yes. A simulator that produced a
              symmetric fan centred on the dashed line at 7% would be the broken one — it would
              mean either zero volatility or a model that conveniently forgets compounding works
              both ways.
            </p>
          </div>
        </Section>


        <Section title="Phases of life">
          <ul style={{ paddingLeft: "1.25rem" }}>
            <li>
              <span className="phase-badge pb-gogo">Go-Go</span> &nbsp;up to age 75. Full
              discretionary spending; guardrails fully active.
            </li>
            <li>
              <span className="phase-badge pb-goslow">Go-Slow</span> &nbsp;76–85. Cash shield caps
              at 24 months; spending naturally tapers.
            </li>
            <li>
              <span className="phase-badge pb-nogo">No-Go</span> &nbsp;86+. Amortization mode:
              shield caps at 12 months and guardrails are suspended.
            </li>
          </ul>
        </Section>

        <Section title="Guyton-Klinger guardrails">
          <p>
            The desk compares your <em>current withdrawal rate</em> (target ÷ total capital) against
            your <em>target withdrawal rate</em>
            (target ÷ ATH):
          </p>
          <ul style={{ paddingLeft: "1.25rem" }}>
            <li>
              If current rate is <strong>≥ 1.2×</strong> target → apply a{" "}
              <strong>10% reduction</strong> (Preservation).
            </li>
            <li>
              If current rate is <strong>≤ 0.8×</strong> target → apply a <strong>10% bonus</strong>{" "}
              (Prosperity).
            </li>
            <li>Otherwise → normal payout.</li>
          </ul>
        </Section>

        <Section title="The cash shield (runway)">
          <p>
            The shield is your money-market balance, expressed in months of target spend. The desk
            recommends keeping it close to your
            <strong> Desired Runway</strong> (default 36 months) so a market crash doesn't force you
            to sell equities at the bottom. When the shield is short, the directive switches into a{" "}
            <em>Refill</em>
            mode; when it's overstuffed, into <em>Reverse-Shielding</em>.
          </p>
        </Section>

        <Section title="The ledger and trend chart">
          <p>
            Each Commit adds one row to the ledger. With two or more rows the trend chart shows
            Total Capital, ATH, and the Cash Shield over time, and the trajectory indicator reports
            whether your equities are ascending, descending, or stable vs. the previous commit.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            The ledger is laid out in six columns: <strong>Timeline</strong> (period + age / phase),{" "}
            <strong>Asset Pools</strong> (Equities and Cash), <strong>Portfolio Total</strong>{" "}
            (Total and ATH), <strong>Drawdown from ATH</strong> (peak-to-trough decline; 0% means at
            a new ATH), <strong>Drawdown Income</strong> (withdrawal £ and WR %), and{" "}
            <strong>Status &amp; Controls</strong> (execution rule + Edit/Del). The Drawdown from
            ATH figure is colour-coded by magnitude: green below 5%, muted 5–10%, amber 10–20%, red
            beyond 20%.
          </p>
        </Section>

        <Section title="Backup &amp; restore">
          <p>
            <strong>Backup</strong> exports your ledger as an obfuscated
            <code>.shd</code> file protected by a password you set.
            <strong> Restore</strong> reads a previously exported file (or a plain JSON ledger
            array). All data lives only on this device — we do not upload anything.
          </p>
        </Section>

        <Section title="Evaluation period &amp; licensing">
          <p>
            Sovereign Glidepath runs as a <strong>30-day evaluation copy</strong> on first install.
            During the trial, all features are fully unlocked and a small dismissible banner shows
            days remaining at the top of the dashboard.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            After day 30, an unlicensed copy continues to work but the Historical Timeline Ledger is{" "}
            <strong>capped at 5 entries</strong>. Committing a 6th entry opens a lockout dialog that
            points to the License screen.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            To unlock, click <strong>🔑 License</strong> in the top-right, enter the{" "}
            <strong>registered name or email</strong> you supplied at purchase, paste your{" "}
            <strong>license key</strong> and press Activate. The banner switches to "Licensed to: …"
            and the key is stored only in this browser.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Transferring to another machine.</strong> Re-open the License dialog on the
            licensed machine and click <strong>Deactivate License</strong> (left of Cancel). This
            wipes the saved key from this browser and restores the banner / 5-entry cap. You can
            then enter the same name and key on the new machine. While a license is loaded the
            primary button reads <strong>Re-activate</strong> rather than Activate, so you can
            re-enter a different name/key without deactivating first.
          </p>
        </Section>

        <Section title="Privacy">
          <p>
            All inputs, ledger entries and license state are kept in this browser's{" "}
            <code>localStorage</code>. Nothing is sent to a server. Clearing your browser data will
            wipe the ledger — use Backup first.
          </p>
        </Section>

        <Section title="Disclaimer">
          <p>
            <strong>
              Sovereign Glidepath is a personal planning and modelling tool, not financial advice.
            </strong>{" "}
            It is provided for educational and recreational use only. The figures, directives,
            guardrail triggers, phase rules, runway targets and projections it produces are the
            output of a simplified mathematical model. They make no allowance for your specific tax
            position, jurisdiction, fees, inflation assumptions, health, longevity, dependants,
            debts, pensions, annuities, government benefits, currency exposure or
            sequence-of-returns risk.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            Past market behaviour does not predict future returns. The Guyton-Klinger guardrails,
            phase-of-life caps and cash-shield heuristics used here are reasonable rules of thumb
            drawn from the public retirement-planning literature, but they can and do fail in
            unusual markets. Following the desk's directive will not guarantee that your capital
            lasts, that your spending is sustainable, or that any particular outcome is achieved.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            Nothing in this app constitutes a personal recommendation, solicitation or offer to buy
            or sell any security or product. You are solely responsible for your own financial
            decisions. Before acting on anything you see here, consult a qualified, regulated
            financial adviser who knows your full circumstances.
          </p>
          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)" }}>
            The software is supplied "as is", without warranty of any kind, express or implied. The
            authors accept no liability for any loss, damage or cost arising from its use.
          </p>
        </Section>
      </div>
    </div>
  );
}

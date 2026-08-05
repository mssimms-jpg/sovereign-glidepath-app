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
          <h1>Quick Start Guide &amp; Overview Manual</h1>
          <p style={{ marginTop: "0.4rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            A short, task-oriented tour of the desk. For chapter-length background, worked examples, and the full
            mathematics, open the{" "}
            <a
              href="/sovereign-glidepath-manual.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-blue)", textDecoration: "underline" }}
            >
              Full Manual
            </a>
            .
          </p>
        </header>

        <Section title="What this app is">
          <p>
            <strong>Sovereign Glidepath</strong> is a recreational retirement-withdrawal modelling dashboard. You enter
            your current equity and money-market balances each quarter, and the desk recommends how much to draw and
            from which pot, using the Guyton-Klinger guardrail method combined with a phase-of-life adjustment and a
            cash-shield runway target.
          </p>
          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)" }}>
            It is a planning aid, not financial advice. Always sanity-check the directives against your own
            circumstances.
          </p>
        </Section>

        <Section title="Quick start (8 steps)">
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
            <strong>Assumption: the two-bucket strategy.</strong> The desk assumes you are using (or planning to use) a
            two-bucket withdrawal strategy — a <strong>Cash Pot</strong> sized to fund the next 12–36 months of spending
            and a <strong>Global Equities Pot</strong> for everything else. See the <em>Two-bucket strategy</em>
            section below, and chapter 3 of the Full Manual, for the rationale.
            <div style={{ marginTop: "0.5rem" }}>
              <strong>Planning shortcut:</strong> if you don't physically run two pots today it's perfectly fine to{" "}
              <em>notionally</em> group your existing holdings. Bundle cash / money-market funds / premium bonds /
              high-interest savings into the <strong>Cash Pot</strong>, and ETFs / index funds / individual equities
              into the <strong>Global Equities Pot</strong>. The model only cares about the totals.
            </div>
          </div>
          <p style={{ marginBottom: "0.75rem", color: "var(--text-muted)" }}>
            These steps follow the order of the fields in Pane 1 (Parameters), top to bottom.
          </p>
          <ol style={{ paddingLeft: "1.5rem", listStyle: "decimal" }}>
            <li>
              <strong>Set your Target Horizon Age.</strong> This is your <em>planning horizon</em> — the age you'd like
              the plan to cover. Set it a little beyond a realistic life-expectancy estimate so the model doesn't run
              out of road; running it a few years long costs nothing.
            </li>
            <li>
              <strong>Set your current age</strong> using the slider (default <strong>55</strong>). The phase badge
              (Go-Go / Go-Slow / No-Go) updates as you move it.
            </li>
            <li>
              <strong>Reporting Period.</strong> The current quarter is filled in automatically (e.g. <em>Q2 2026</em>).
              You can overtype it or click <strong>Auto-Label</strong> at any time — useful when back-filling old
              quarters.
            </li>
            <li>
              <strong>Enter your Global Equities balance and your Cash Pot balance.</strong> The
              <strong> All-Time High (ATH)</strong> is auto-calculated on the first ledger commit. Pick your display{" "}
              <strong>currency</strong> (£ / € / $) from the dropdown — cosmetic only, no FX conversion.
            </li>
            <li>
              <strong>Assumed Growth Rate</strong> (default <strong>4%</strong>). The long-run blended return the
              deterministic projections use. Adjustable at any time — the default is deliberately conservative; a
              balanced two-bucket portfolio has historically beaten it over the long run, but starting low avoids
              flattering the plan.
            </li>
            <li>
              <strong>Cash Buffer Target</strong> (months, default <strong>36</strong>). How many months of target
              spending you want sitting in the Cash Pot as a defensive reserve, so a market crash never forces you to
              sell equities at the bottom. <strong>24–36 months is the conventional comfort zone</strong> — shorter is
              racier, longer is a deeper cash drag.
            </li>
            <li>
              <strong>Target Annual Base Withdrawal.</strong> Your planned yearly spend in today's money. The desk
              converts it to a quarterly request and applies the Guyton-Klinger guardrails from there.
            </li>
            <li>
              <strong>Legacy Target</strong> (optional, default <strong>0</strong>). A real-terms amount you want to
              leave behind — an inheritance or bequest. Set to zero to draw the pot to nothing; any positive figure is
              held aside from the Fun Bucket and factored into every directive.
            </li>
          </ol>
          <p style={{ marginTop: "0.75rem" }}>
            Read the <strong>Directive</strong> pane (3) for this quarter's recommendation, click{" "}
            <strong>Commit</strong> — a confirmation dialog appears so you can spot typos before anything is written —
            then launch the <strong>Risk Simulator</strong> from <em>Companion Apps</em> at the foot of Pane 2 to
            stress-test the plan against 10,000 possible
            futures. Need to record a one-off expense (car, kitchen, gift)? Use the purple <em>Commit Special Event</em>{" "}
            button in Pane 5 — it deducts from your pots and lowers the ATH automatically so the plan's baseline stays
            honest.
          </p>
        </Section>

        <Section title="Legacy Target, Special Events &amp; the auto-ATH">
          <p>Three related features that make the desk's arithmetic honest at the extremes.</p>
          <p style={{ marginTop: "0.5rem" }}>
            <strong>Legacy Target (Pane 1).</strong> A real-terms floor of capital you want left at horizon age. The
            engine subtracts it from the surplus <em>before</em> computing comfort-years, so directives, the Fun Bucket,
            and the "Comfortable Amortization" override all respect it automatically. £0 means "draw the pot to zero";
            anything positive is protected.
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            <strong>Automatic ATH baseline.</strong> The Stored All-Time High is maintained by the app — when you commit
            an entry whose Total Capital exceeds the stored ATH, the field is raised for you. Treat the ATH field as
            read-only for normal quarters. The one time it moves <em>down</em> is on a Special-Event commit (below),
            which lowers the ATH by the exact expense so next quarter doesn't look like a phantom crash.
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            <strong>Special-Event withdrawals (Pane 5).</strong> Model a one-off expense in the "Can I Afford This?"
            calculator, then commit it as a real ledger entry with a short description. The pots are reduced, the ATH is
            reduced by the same amount, and a purple <code>★ EVENT</code> row appears in the ledger with the date,
            description, and Equities/Cash split. Use it for the car, the kitchen refit, the gift — not for ordinary
            quarterly draws.
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            <strong>Commit-confirmation modal.</strong> Every ledger commit now pops a review dialog first, listing
            exactly what will be written (label, balances, ATH, drawdown, target draw, directive). A quick sanity check
            for typos before anything is stored.
          </p>
        </Section>

        <Section title="Two-bucket strategy">
          <p>
            The desk is built around a deliberately simple two-bucket model: a <strong>Cash Pot</strong> (months of
            spending you can draw without selling anything risky) and a <strong>Global Equities Pot</strong> (everything
            that grows). The Cash Pot exists so a market drawdown never forces you to sell shares at the bottom; the
            Equities Pot exists so inflation never quietly eats the plan. The guardrails decide which pot to draw from
            each quarter.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            If your real holdings don't already look like this, the simplest way to start using the desk is to{" "}
            <em>group</em> them on paper. Cash, money-market funds, premium bonds, high-interest accounts, NS&amp;I,
            short-dated gilts held to maturity → Cash Pot. Global equity trackers, regional / sector ETFs, individual
            shares, equity-heavy mixed funds → Global Equities Pot. Long-dated bonds and gold sit outside this
            two-bucket simplification; many users hold them within the Equities Pot for modelling purposes and accept
            the small loss of fidelity.
          </p>
        </Section>

        <Section title="Risk Simulator — Monte Carlo fan chart">
          <p>
            The rest of the desk gives you one answer: at your assumed growth rate, your capital traces a single
            straight line. The Risk Simulator gives you <strong>10,000 answers</strong>. It re-runs your retirement
            10,000 times with fresh annual returns each run, and shows the spread as a coloured fan. The point is not to
            predict the future — it's to make the <em>shape</em> of uncertainty visible.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>How to read this pane (updated in Build 099).</strong> The pane now reads top-to-bottom in the order
            you'd actually use it: <em>inputs</em> (pot, withdrawal, pension) → <em>sliders</em> (expected return,
            volatility, growth, cash real return, pension real increase) → <em>Defensive-Draw Threshold</em> → the{" "}
            <em>fan chart</em> → the <em>percentile stats</em> → <em>Allocation Bias</em> →{" "}
            <em>Future Extraordinary Inflow</em>. The methodology footnote that used to sit at the bottom is now behind
            the <strong>About these figures</strong> button next to the stats.
          </p>
          <ul style={{ paddingLeft: "1.25rem", marginTop: "0.4rem" }}>
            <li>
              <strong>Pension inputs now live in Pane 1.</strong> Your real pension amount, start age and real increase
              are entered once, alongside the Target Annual Base Withdrawal, and every pane reads them. The simulator
              shows them read-only with a <strong>Use real pension details</strong> / <strong>Hypothetical</strong>{" "}
              switch — pick Hypothetical to test a different pension here without ever changing Pane 1.
            </li>
            <li>
              <strong>Assumed Real Growth Rate and Cash Real Return are independent of Pane 1</strong> — exactly like
              Inflation / Escalation, each slider simply keeps whatever value you last left it at and only affects this
              simulator. Changing them here never changes Pane 1, and changing Pane 1 never moves them.
            </li>
            <li>
              <strong>Allocation Bias</strong> shifts money between Equities and Cash while keeping the total pot fixed.
              "Reset split to actual" restores your real split.
            </li>
            <li>
              <strong>Future Extraordinary Inflow</strong> now has a <strong>Destination</strong> choice — Equities or
              Cash. Previously a windfall was always split 50/50; the whole amount now lands in the bucket you pick, at
              the end of year N, and re-anchors the ATH.
            </li>
          </ul>

          <p style={{ marginTop: "0.75rem" }}>
            <strong>True two-bucket simulation (new in Build 053).</strong> The simulator now runs <em>two</em> separate
            buckets through every year — Equities (volatile, real growth from the chosen return model) and Cash
            (deterministic, earns the <em>Cash real return</em> slider in real terms). Each year the engine decides
            which bucket to spend from using a <em>defensive draw threshold</em>: in a <strong>good</strong> year it
            spends from Equities and refills the Cash Pot up to its starting size; in a <strong>bad</strong> year it
            spends from Cash to avoid selling shares at a discount. This captures the modest <em>cash drag</em> on the
            median (cash compounds slower than equities) while showing how the buffer lifts the 5th–10th percentile
            floor when sequence-of-returns risk bites early.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Defensive draw threshold.</strong> Three presets:
          </p>
          <ul style={{ paddingLeft: "1.25rem", marginTop: "0.4rem" }}>
            <li>
              <strong>Strict</strong> — spend from cash only when the <em>real</em> equity return is below{" "}
              <strong>−5%</strong> (a serious drawdown year). Closest to "hold cash for crashes only", so cash drag is
              minimal but the buffer is rarely used.
            </li>
            <li>
              <strong>Standard</strong> (default) — spend from cash in flat or weak equity years. Refill the buffer in
              clearly positive years. This gives a visible middle setting between crash-only and highly defensive
              behaviour.
            </li>
            <li>
              <strong>Aggressive</strong> — spend from cash unless equities are clearly above the expected-return
              hurdle. Uses the buffer most often; biggest reduction in sequence-of-returns risk but largest cash drag.
            </li>
          </ul>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Equities (override) &amp; Cash Pot (override).</strong> Both buckets are seeded from your latest
            ledger entry but freely editable for "what-if" experiments. An amber <em>✎ what-if</em> marker appears when
            you've overridden them; click <em>Reset to actual</em> to snap back. The overrides are never persisted —
            refreshing the app, or committing a new ledger entry, restores the real values.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Allocation bias slider (new in Build 054).</strong> Sits directly under the two override fields and
            rebalances Equities↔Cash while keeping the total pot fixed — the fastest way to see what tilting another 10%
            into cash (or out of it) does to the fan. The free-text overrides above still take priority, and{" "}
            <em>Reset split to actual</em> returns the dial to your live ledger ratio.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Defensive-draw counter.</strong> Next to the threshold buttons you'll see e.g.{" "}
            <em>avg 12.4 of 30 yrs (41%) draw from cash</em> — the average number of years per simulated run that pulled
            from the Cash Pot. Flipping Strict → Standard → Aggressive should visibly change this number and re-run all
            10,000 paths against the same seeded return sequence; the visible difference is therefore from the draw
            rule, not random re-rolling.
          </p>

          <p style={{ marginTop: "0.75rem" }}>
            <strong>Yearly vs Quarterly tick (new in Build 061).</strong> A toggle in the simulator header switches the
            engine between two modes. <em>Yearly tick</em> is the original engine — one G-K check per year across 10,000
            paths. <em>Quarterly tick</em> is a companion mode that steps the same 10,000 paths four times per year and
            re-applies the Guyton-Klinger ±10% guardrail every quarter against a per-path all-time high, exactly the
            discipline the live app enforces on your quarterly commits. Flipping between the two shows how much of the
            p10-floor gap the quarterly discipline actually closes.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Withdrawal Recorded field (new in Build 062).</strong> Pane 1 now carries a "Withdrawal Recorded"
            money input, auto-seeded from the guardrail-adjusted <em>Request</em>. Overwrite it with the actual £ that
            left the pot each quarter; the value is stored on the ledger row and shown in the timeline table so every
            commit has a clean audit trail of what was withdrawn.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Audit Mode (hidden, Build 062).</strong> Double-click the "5. Risk Simulator" header to freeze the
            RNG and run a single deterministic path with canonical inputs (Age 64→85, £610k/£90k, £36k draw, £12,700
            pension @ 67). A 2-decimal step ledger renders beneath the chart for pocket-calculator reproduction.
            Double-click again to exit.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Historical vs Parametric.</strong> Historical draws each year at random from MSCI World (Net Total
            Return, GBP) annual returns 1970–2024 — a global-tracker proxy more appropriate for a typical UK investor
            than a single-country index. It keeps the fat tails (1974, 2002, 2008, 2022). Parametric manufactures
            returns from a normal curve with a mean and volatility you control. If your conclusion changes dramatically
            between the two, the bell-curve assumption is probably flattering you.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Yearly Withdrawal Increase Rate (0–5%).</strong> The slider above the chart escalates your
            withdrawal smoothly each year — a stand-in for inflation or planned wage growth. Returns are deflated by the
            same rate, so the whole chart is shown in <strong>today's pounds</strong>. £100k at year 30 means £100k of
            today's purchasing power. Set to 0% to model pure nominal returns with a flat withdrawal.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Annual Pension &amp; Pension Start Age.</strong> The pension amount (in today's money) is netted off
            your withdrawal once you reach the start age. Before that age the full withdrawal is funded from capital. A
            64-year-old with a state pension at 67, for example, funds three years from the pots alone before the
            pension reduces the net draw.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Assumed State Pension Annual Increase (0–6%).</strong> Escalates the pension each year, starting the
            year after the simulation begins. Setting this <em>above</em> the withdrawal-inflation slider models a
            pension that grows in real terms (e.g. a UK triple-lock state pension running ahead of CPI); equal models a
            flat-real pension; below models real erosion. Combined with the start-age field this gives a much more
            realistic long-run outcome for users counting on a DB or state pension later in retirement.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Reading the chart.</strong> Light blue band = 10–90th percentile (80% of futures finished there).
            Darker blue = 25–75th (the central half). Solid blue line = the median. Dashed line = your deterministic
            reference path — the <em>return</em> is held flat at your Assumed Growth Rate, but the <em>withdrawal</em>{" "}
            is fully live: the same guardrails, bucket-sourcing and pension logic drive it as everywhere else in the
            desk. Dashed below median = cautious. Dashed above = optimistic. The fan widens every year — that widening{" "}
            <em>is</em> sequence-of-returns risk made visible.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>"Sims beating your assumption."</strong> The headline % of futures that ended at or above your
            dashed line. Framed so higher is better: <strong>75%+ green</strong> (conservative, margin to spare),{" "}
            <strong>50–74% amber</strong> (reasonable),
            <strong> 25–49%</strong> (optimistic), <strong>&lt; 25% red</strong> (aggressive — the plan leans hard on
            luck).
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Why the dashed line curves — and can reach zero.</strong> Two things combine to shape it, and
            neither is a bug:
          </p>
          <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
            <li>
              <strong>The return is flat by design.</strong> Every period compounds at exactly your Assumed Real Growth
              Rate (Equities) and Cash Real Return (Cash) — no randomness at all. That is the one deliberately "assumed"
              input, and the reason it's called deterministic.
            </li>
            <li>
              <strong>The withdrawal is not flat.</strong> Each period's actual draw runs through the exact same engine
              as the stochastic paths: Guyton-Klinger guardrails can cut or raise it by 10%, the defensive-draw rule
              decides whether Equities or Cash funds it, your pension (once in payment) reduces what's actually needed
              from the pot, and guardrails switch off entirely once you reach No-Go phase. So even though the{" "}
              <em>return</em> never varies, the <em>withdrawal</em> genuinely can — which is why the line's slope can
              change noticeably even though the assumed growth rate didn't.
            </li>
          </ul>
          <p style={{ marginTop: "0.5rem" }}>
            Compounding alone already bends the line — each period's growth applies to a larger or smaller base than the
            last — and a shortfall between the assumed return and the actual withdrawal need steepens that bend further.
            If the withdrawal rate is unsustainable against the assumed return, the line will decline toward, and can
            genuinely reach, zero — the same way the 10th percentile band can fail. Two things distinguish it from the
            stochastic paths: the return is always the same fixed number, and there is only ever one dashed line, never
            a distribution of them.
          </p>
          <p style={{ marginTop: "0.5rem" }}>
            <strong>Capital preserved</strong> = % of runs ending ≥ starting capital. In withdrawal mode this is a tough
            bar by design. The more useful question: is the 10th-percentile ending value still positive? If so, even the
            unlucky 10% of futures didn't run out.
          </p>
          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)" }}>
            <strong>What it does NOT model:</strong> taxes, fees, your actual asset mix, behavioural cuts during
            crashes, surprise CPI shocks, or future regime change. (Smooth yearly inflation
            <em> is</em> now modelled via the slider above the chart.) It's a stress test, not a forecast. Most useful
            when the answer makes you uncomfortable.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Want to see one full path play out?</strong> The Full Manual has a worked 30-year example —
            year-by-year returns, which bucket fired each year, and how the State Pension layers in — at{" "}
            <a
              href="/sovereign-glidepath-manual.html#ch-23c"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent-blue)", textDecoration: "underline" }}
            >
              §23c — Worked example: a 30-year stress test
            </a>
            . It also explains how the simulator differs from the live quarterly app.
          </p>

          <p style={{ marginTop: "0.75rem" }}>
            <strong>Zoom brush &amp; hover tooltip.</strong> Drag the handles on the strip beneath the chart to zoom
            into a specific time window — the Y-axis auto-rescales to the visible range so short horizons no longer look
            flat. Drag the highlighted region to pan, double-click the brush to reset. Hover anywhere on the chart for a
            crosshair and a card showing the focused Age plus Assumed Growth, Median Path, and the 10th/90th percentile
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
            <p style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>FAQ — "Is the maths broken?"</p>
            <p style={{ margin: "0 0 0.5rem" }}>
              <strong>
                Q. My Expected Return is 7% and my Assumed Growth is 7%, so why does the median path sit well below the
                dashed line — and the gap grows with volatility?
              </strong>
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              A. This is <em>volatility drag</em> (a.k.a. the arithmetic-vs-geometric-mean gap), and it's real money,
              not a chart glitch. The number you type is the <strong>arithmetic</strong> mean of annual returns. What a
              portfolio actually compounds at over many years is the <strong>geometric</strong> mean, which is always
              lower whenever returns vary. A good approximation is <code>geometric ≈ arithmetic − σ² / 2</code>:
            </p>
            <ul style={{ margin: "0 0 0.5rem", paddingLeft: "1.25rem" }}>
              <li>σ = 0% → drag = 0, the median sits exactly on the dashed line.</li>
              <li>
                σ = 15% → drag ≈ 0.15² / 2 ≈ <strong>1.13 %/yr</strong>, so the median compounds at ~5.9% instead of 7%.
              </li>
              <li>σ = 25% → drag ≈ 3.1 %/yr — the median falls visibly away from the dashed line.</li>
            </ul>
            <p style={{ margin: "0 0 0.5rem" }}>
              Intuition: a portfolio that gains 20% then loses 20% ends at 0.96, not 1.00. Bigger swings → bigger losses
              you have to "claw back" the next year. The dashed line ignores that; the median respects it.
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              <strong>Q. Why is the upper half of the fan so much wider than the lower half?</strong>
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              A. Returns compound <em>multiplicatively</em>, which produces a <strong>log-normal</strong> distribution
              of ending capital. The downside is bounded (capital can fall <em>at most</em> to zero — a 100% loss), but
              the upside is unbounded. So the distribution is right-skewed: the 90th percentile sits further{" "}
              <em>above</em> the median than the 10th percentile sits <em>below</em> it. That asymmetric fan is the
              correct visualisation of compounded risk, not a plotting bug.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Q. So the maths is solid?</strong> Yes. A simulator that produced a symmetric fan centred on the
              dashed line at 7% would be the broken one — it would mean either zero volatility or a model that
              conveniently forgets compounding works both ways.
            </p>
          </div>
        </Section>

        <Section title="Phases of life">
          <ul style={{ paddingLeft: "1.25rem" }}>
            <li>
              <span className="phase-badge pb-gogo">Go-Go</span> &nbsp;up to age 75. Full discretionary spending;
              guardrails fully active.
            </li>
            <li>
              <span className="phase-badge pb-goslow">Go-Slow</span> &nbsp;76–85. Cash shield caps at 24 months;
              spending naturally tapers.
            </li>
            <li>
              <span className="phase-badge pb-nogo">No-Go</span> &nbsp;86+. Amortization mode: shield caps at 12 months
              and guardrails are suspended.
            </li>
          </ul>
        </Section>

        <Section title="Guyton-Klinger guardrails">
          <p>
            The desk compares your <em>current withdrawal rate</em> (target ÷ total capital) against your{" "}
            <em>target withdrawal rate</em>
            (target ÷ ATH):
          </p>
          <ul style={{ paddingLeft: "1.25rem" }}>
            <li>
              If current rate is <strong>≥ 1.2×</strong> target → apply a <strong>10% reduction</strong> (Preservation).
            </li>
            <li>
              If current rate is <strong>≤ 0.8×</strong> target → apply a <strong>10% bonus</strong> (Prosperity).
            </li>
            <li>Otherwise → normal payout.</li>
          </ul>
        </Section>

        <Section title="The cash buffer (runway)">
          <p>
            The cash buffer is your money-market balance, expressed in months of target spend. The desk recommends
            keeping it close to your
            <strong> Cash Buffer Target</strong> (default 36 months) so a market crash doesn't force you to sell
            equities at the bottom. When the buffer is short, the directive switches into a <em>Refill</em> mode; when
            it's overstuffed, into <em>Reverse-Shielding</em>.
          </p>
        </Section>

        <Section title="The ledger and trend chart">
          <p>
            Each Commit adds one row to the ledger. With two or more rows the trend chart shows Total Capital, ATH, and
            the Cash Shield over time, and the trajectory indicator reports whether your equities are ascending,
            descending, or stable vs. the previous commit.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            The ledger is laid out in six columns: <strong>Timeline</strong> (period + age / phase),{" "}
            <strong>Asset Pools</strong> (Equities and Cash), <strong>Portfolio Total</strong> (Total and ATH),{" "}
            <strong>Drawdown from ATH</strong> (peak-to-trough decline; 0% means at a new ATH),{" "}
            <strong>Drawdown Income</strong> (withdrawal £ and WR %), and <strong>Status &amp; Controls</strong>{" "}
            (execution rule + Edit/Del). The Drawdown from ATH figure is colour-coded by magnitude: green below 5%,
            muted 5–10%, amber 10–20%, red beyond 20%.
          </p>
        </Section>

        <Section title="App-lock &amp; encryption">
          <p>
            On first launch you set an <strong>app-lock passphrase</strong> (at least 8 characters). Your ledger, your
            saved settings and your licence details are encrypted on this device with AES-256-GCM, and the dashboard
            will not open until you enter it. If you already had data before this build, it is encrypted in place
            automatically the first time you set a passphrase — nothing needs re-entering.
          </p>
          <p>
            <strong>The passphrase cannot be recovered.</strong> There is no reset and no backdoor: if it is lost, the
            data cannot be decrypted by anyone. Use <strong>🔑 Passphrase</strong> in the header to change it (you will
            need the current one), and keep an exported backup somewhere safe.
          </p>
        </Section>

        <Section title="Backup &amp; restore">
          <p>
            <strong>Backup</strong> exports your ledger as an encrypted
            <code>.shd</code> file (AES-256-GCM, keyed from a password you set at export time).
            <strong> Restore</strong> reads a previously exported file — including older backups made before build 117 —
            or a plain JSON ledger array. All data lives only on this device — we do not upload anything.
          </p>
        </Section>

        <Section title="Companion Apps — Compare vs 4% Rule (Historical)">
          <p>
            Pane 2's <strong>Companion Apps</strong> section is home to spin-off tools built on the same engine as the
            main dashboard. The first is the <strong>Comparison Builder</strong>, which backtests your plan against
            every real rolling US retirement since 1928, alongside a faithful classic 4% Rule replica — using the same
            Guyton-Klinger engine that drives this app, not a separate approximation.
          </p>
          <p>
            Click <strong>📊 Compare vs 4% Rule (Historical)</strong> and it opens in a new tab with your live Pane 1
            figures already filled in — equities, cash, age, horizon, gross target withdrawal, and your State Pension
            details if you have one configured. Nothing is re-typed, and the comparison runs on open. If you open the
            Comparison Builder on its own, with no plan attached, it falls back to its own editable example values.
          </p>
        </Section>

        <Section title="Evaluation period &amp; licensing">
          <p>
            Sovereign Glidepath runs as a <strong>30-day evaluation copy</strong> on first install. During the trial,
            all features are fully unlocked and a small dismissible banner shows days remaining at the top of the
            dashboard.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            After day 30, an unlicensed copy continues to work but the Historical Timeline Ledger is{" "}
            <strong>capped at 5 entries</strong>. Committing a 6th entry opens a lockout dialog that points to the
            License screen.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            To unlock, click <strong>🔑 License</strong> in the top-right, enter the{" "}
            <strong>registered name or email</strong> you supplied at purchase, paste your <strong>license key</strong>{" "}
            and press Activate. The banner switches to "Licensed to: …" and the key is stored only in this browser.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Transferring to another machine.</strong> Re-open the License dialog on the licensed machine and
            click <strong>Deactivate License</strong> (left of Cancel). This wipes the saved key from this browser and
            restores the banner / 5-entry cap. You can then enter the same name and key on the new machine. While a
            license is loaded the primary button reads <strong>Re-activate</strong> rather than Activate, so you can
            re-enter a different name/key without deactivating first.
          </p>
        </Section>

        <Section title="Privacy">
          <p>
            All inputs, ledger entries and license state are kept in this browser's <code>localStorage</code>. Nothing
            is sent to a server. Clearing your browser data will wipe the ledger — use Backup first.
          </p>
        </Section>

        <Section title="Disclaimer">
          <p>
            <strong>Sovereign Glidepath is a personal planning and modelling tool, not financial advice.</strong> It is
            provided for educational and recreational use only. The figures, directives, guardrail triggers, phase
            rules, runway targets and projections it produces are the output of a simplified mathematical model. They
            make no allowance for your specific tax position, jurisdiction, fees, inflation assumptions, health,
            longevity, dependants, debts, pensions, annuities, government benefits, currency exposure or
            sequence-of-returns risk.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            Past market behaviour does not predict future returns. The Guyton-Klinger guardrails, phase-of-life caps and
            cash-shield heuristics used here are reasonable rules of thumb drawn from the public retirement-planning
            literature, but they can and do fail in unusual markets. Following the desk's directive will not guarantee
            that your capital lasts, that your spending is sustainable, or that any particular outcome is achieved.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            Nothing in this app constitutes a personal recommendation, solicitation or offer to buy or sell any security
            or product. You are solely responsible for your own financial decisions. Before acting on anything you see
            here, consult a qualified, regulated financial adviser who knows your full circumstances.
          </p>
          <p style={{ marginTop: "0.75rem", color: "var(--text-muted)" }}>
            The software is supplied "as is", without warranty of any kind, express or implied. The authors accept no
            liability for any loss, damage or cost arising from its use.
          </p>
        </Section>
      </div>
    </div>
  );
}

# 👓 Rangefinder

**Liquidity ranges from what the market expects, not what already happened.**

Rangefinder turns Gemini's live BTC prediction-market ladder into a probability forecast, recommends the price range for a Uniswap v3 liquidity-style provider should use, records every decision onchain, rebalances automatically when the crowd moves, hedges on Gemini, and checks how trustworthy the crowd has been.

- **Track:** DeFi & Onchain Applications
- **Bounty:** Gemini Prediction Markets
- **Chain award:** None
- **Event:** University Blockchain Conference 2026 Hackathon (built Nov 12–20, 2026)

|                            |                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 🌐 Live app                | https://ubc2026-hackathon-ishanesha.vercel.app/                                                                                                                  |
| 🎬 Demo video (2–3 min)    | [[VIDEO_URL]]                                                                                                                   |
| 📜 Contract (Base Sepolia) | [`0x47cd5D831bEcdD1d90F25f32B128b43598A4d1CA`](https://sepolia.basescan.org/address/0x47cd5D831bEcdD1d90F25f32B128b43598A4d1CA) |
| 🔗 Example transaction     | [View on Basescan](https://sepolia.basescan.org/tx/0xd329c36fa8a2b55c9a4c603c4565412a31f61f15d98f32bdc1d1823dd985da2f)          |

---

## The problem

Uniswap v3 liquidity providers (LPs) earn fees only while the price stays inside the range they choose. A narrow range earns more but is easy to fall out of; when the price leaves it, the position stops earning and takes impermanent loss.

Most range tools size ranges from **past** volatility, which can't anticipate a Fed decision tomorrow or a big announcement this afternoon.

## The solution

Prediction markets price the **future** directly, with real money behind every number. Gemini lists a daily BTC "ladder" of about 20 contracts ("BTC ≥ $60,500 at 4 PM CT", "BTC ≥ $61,000", …). Each contract's price is the crowd's probability. Rangefinder joins them into one forecast curve and uses it to:

1. **Recommend a range** at the confidence you choose (e.g. "71% chance BTC ends between $60,280 and $63,480").
2. **Record it onchain** in our `RangeVault` contract, creating a permanent, public decision trail.
3. **Watch and rebalance** automatically when live odds move, within guardrails.
4. **Hedge on Gemini**, buying contracts that pay if BTC leaves the range, and record each hedge onchain.
5. **Check the crowd's track record**, rebuilding past forecasts from Gemini trade history and scoring them against Gemini's official settlement prices.

## Features (one page each)

| Page                           | What it does                                                                                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forecast** (`/`)             | Live Gemini curve, recommended range, confidence slider (50–90%), chance below/above the range, protection cost                                                                          |
| **Set & Protect** (`/actions`) | Record the range onchain; simulate an odds shift (labeled demo); place Gemini sandbox hedge orders (downside, or both sides) and record them onchain; activity log with explorer links   |
| **Watch mode** (`/watch`)      | 60-second live odds timeline; a bot that rebalances onchain when the crowd's median moves past a trigger, auto re-hedges on Gemini, and respects a cooldown, hourly cap and hedge budget |
| **Report card** (`/report`)    | 5-day crowd report card (hit rate vs. target, calibration, median error, days the hedge would have paid) and **Replay a past day** (hour-by-hour crowd forecast vs. actual settlement)   |
| **Why / About**                | The reasoning behind Rangefinder and the team                                                                                                                                            |

The 👓 logo's glint changes color with how much traders agree (spread between the 25% and 75% price levels as a % of the median: gold < 1.5%, amber 1.5–3%, coral ≥ 3%).

## What's real vs. simulated

- **Real data:** all market data is live from Gemini, including trade history and official settlement prices.
- **Real transactions, test money:** onchain records are real transactions on **Base Sepolia** (testnet). Hedge orders are real orders on **Gemini's sandbox** (test exchange).
- **Simulated:** only the **"Simulate odds shift (−$500)"** button. It's labeled as a demo in the UI, and its onchain record says so.
- **Not built yet:** opening real Uniswap positions (see _What's next_).

---

## Architecture

```
                    ┌──────────────────────── Browser (Next.js, Vercel) ────────────────────────┐
                    │  Forecast · Set & Protect · Watch mode · Report card · Why · About          │
                    │  RangeProvider (shared state): curve, recorded range, log, watch loop (60s) │
                    └───────┬───────────────┬───────────────────┬──────────────────┬─────────────┘
                            │               │                   │                  │
                     /api/curve      /api/history,       /api/onchain        /api/protect
                            │        /api/replay                │                  │
                            ▼               ▼                   ▼                  ▼
              Gemini public API    Gemini public API     RangeVault (Solidity)   Gemini SANDBOX
              (live BTC ladder)    (settled ladders +    on Base Sepolia via     (signed REST orders)
                                    trade history)       backend wallet (viem)
```

**Flow:** the browser asks `/api/curve` for the live forecast → the user (or Watch mode) records or rebalances via `/api/onchain` → hedges go through `/api/protect` to Gemini's sandbox, and each order is also recorded onchain → `/api/history` and `/api/replay` rebuild past forecasts for the report card.

## Economic design

**1. Probabilities from prices.** For each ladder contract "BTC ≥ K", the YES mid price `(bestBid + bestAsk) / 2` (or the last trade) is read as P(BTC > K at expiry).

**2. Forecast curve.** Points are sorted by strike and forced non-increasing (a higher strike can't be more likely). Values between strikes are linearly interpolated; beyond the ladder they are linearly extrapolated.

**3. Recommended range.** Start at the median (P = 50%) and widen both sides in $50 steps until
`P(L ≤ S ≤ H) = P(S > L) − P(S > H) ≥ target confidence` (default 70%).

**4. Rebalance rule (Watch mode).** Rebalance when `|live median − recorded median| ≥ trigger × recorded range width` (trigger 10/20/30%).

**5. Hedging.**

- _Downside (always):_ buy **NO** on the ladder strike at or just below the range bottom (falls back to the lowest listed strike). Price ≈ `1 − YES bid`. Pays if BTC finishes below that strike.
- _Upside (optional):_ buy **YES** on the first strike at or above the range top. Price ≈ `P(above) + $0.01`. Pays if BTC finishes above it.
- Cost of one contract ≈ its price; each pays $1 if it resolves in your favour.

**6. Bot budget.** Automatic hedges are capped at **$1.00 (sandbox) per hour**; manual hedges are not capped.

## Risk assumptions

- **Trusted operator:** only the owner wallet (held by our backend) can write to `RangeVault`; the data source (Gemini) is offchain. There is no decentralized oracle yet.
- **Market quality:** thin or wide-spread contracts distort the curve. Tails beyond the ladder are extrapolated, so confidence above about 80% is less reliable. Near expiry the curve becomes a cliff, so ladders expiring within 3 hours are skipped.
- **Hedge mismatch:** sandbox orders use the _nearest sandbox contract_, which can differ from the production strike shown. When no strike exists below the range, the downside hedge strike sits slightly _above_ the range bottom.
- **No capital deployed:** the range is recommended and recorded, but no Uniswap liquidity is provided, so fee income and impermanent loss are not modelled.
- **Bot risk:** Watch mode could react to noise; mitigated by the trigger threshold, a 5-minute cooldown, at most 3 auto-rebalances per hour, a $1/hour hedge budget, and logging of every decision.
- **Public routes:** the demo's API routes are unauthenticated on testnet; anyone with the URL could trigger testnet transactions or sandbox orders.
- **Testnet only:** no real funds. Nothing here is financial advice.

## Smart contract: `RangeVault`

- **Network:** Base Sepolia (chain ID 84532)
- **Address:** `0x47cd5D831bEcdD1d90F25f32B128b43598A4d1CA` ([Basescan](https://sepolia.basescan.org/address/0x47cd5D831bEcdD1d90F25f32B128b43598A4d1CA))
- **Source:** [`contracts/RangeVault.sol`](contracts/RangeVault.sol)

| Function                                                             | Records                                                        | Event                |
| -------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------- |
| `setRange(lower, upper, confidenceBps, probInRangeBps, geminiEvent)` | Recommended range and the Gemini market it came from           | `RangeSet`           |
| `rebalance(lower, upper, probInRangeBps, reason)`                    | New range plus the reason (simulated, or "Gemini odds moved…") | `Rebalanced`         |
| `recordProtection(geminiOrderId, strike, costCents)`                 | Each Gemini hedge order                                        | `ProtectionRecorded` |
| `getRange()`                                                         | Read the current range                                         | —                    |

Prices are whole US dollars; probabilities are basis points (7000 = 70%). All writes are `onlyOwner`.

## How we use Gemini Prediction Markets

| Endpoint                                                                    | Used for                                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `GET /v1/prediction-markets/events?status=active&category=crypto`           | Live BTC ladder → forecast curve (Forecast, Watch mode)                    |
| `GET /v1/prediction-markets/events/{ticker}`                                | Settled ladders: `settlementValue`, `resolutionSide` (Report card, Replay) |
| `GET /v1/trades/{instrumentSymbol}`                                         | Trade history to rebuild past forecasts (Report card, Replay)              |
| `POST /v1/prediction-markets/order` (sandbox, signed)                       | Hedge orders: NO below the range, optional YES above                       |
| `POST /v1/prediction-markets/orders/active` and `/orders/history` (sandbox) | Order status and proof of orders                                           |

## Watch mode: decision loop and guardrails

1. Every **60 s**, fetch the live Gemini ladder and add a point to the timeline.
2. If Watch mode is on and a range is recorded, compare the live median with the recorded median.
3. If the move is below the trigger → log "no rebalance needed".
4. If it is above the trigger → check the guardrails: **≥ 5 min since the last auto-rebalance** and **≤ 3 per hour**. If blocked → log why.
5. Otherwise → `rebalance()` onchain with the reason, then (if auto re-hedge is on) place hedge orders on Gemini's sandbox within the **$1/hour budget** and record each one onchain.

## Report card and replay method

- **Report card:** for each of the last 5 daily BTC ladders, take the **last Gemini trade of every contract before the snapshot time** (3, 6 or 12 hours before the 4 PM CT settlement), build the curve and range, and compare with Gemini's `settlementValue`. Days whose curve is too jumpy (thin trading) are marked "not scored".
- **Replay:** the same method **every hour** across a settled day, showing how the crowd's median and range moved toward the actual settlement.
- Limits: Gemini returns at most 500 trades per request; contracts with no trade in the previous 12 hours are left out of that snapshot. Five days is a small sample: a sanity check, not proof.

---

## Tech stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS · Recharts · viem · Solidity (RangeVault) · Base Sepolia · Gemini Prediction Markets API (public + sandbox) · Vercel

## Use of AI tools
We used AI assistants (Claude) throughout the hackathon, as the guide encourages: to brainstorm and compare project ideas, check the hackathon rules, draft and debug code (API routes, React components, curve math), and write documentation. Every feature was integrated, tested and verified by us against live Gemini data and real Base Sepolia transactions, and all product decisions (what to build, what to cut, how to present it honestly) were ours.

## Run it locally

**Prerequisites:** Node 20+, a Base Sepolia wallet with test ETH, a Gemini **sandbox** account with an API key (Trader role) and the Prediction Markets terms accepted.

```bash
git clone https://github.com/rangefinderubc-2026/ubc2026-hackathon-ishanesha.git
cd ubc2026-hackathon-ishanesha
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable                                       | What it is                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `CHAIN`                                        | `baseSepolia` (or `local` for Anvil)                                         |
| `RPC_URL`                                      | e.g. `https://sepolia.base.org`                                              |
| `PRIVATE_KEY`                                  | Backend wallet that owns RangeVault (`0x…`, **testnet only, never commit**)  |
| `VAULT_ADDRESS`                                | Deployed RangeVault address                                                  |
| `GEMINI_SANDBOX_KEY` / `GEMINI_SANDBOX_SECRET` | Gemini sandbox API credentials (**never commit**)                            |
| `NEXT_PUBLIC_USE_MOCKS`                        | `true` to mock onchain calls (UI development), `false` for real transactions |
| `NEXT_PUBLIC_MOCK_PROTECT`                     | `true` to mock Gemini orders, `false` for real sandbox orders                |

### Deploying the contract

Open `contracts/RangeVault.sol` in [Remix](https://remix.ethereum.org), compile with Solidity 0.8.24, deploy with **Injected Provider (MetaMask on Base Sepolia)** from the same wallet as `PRIVATE_KEY`, then set `VAULT_ADDRESS`.

## API reference (our routes)

| Route                                                 | Purpose                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /api/curve?confidence=0.7&shift=0`               | Live forecast: summary, median, range, probabilities, protection contract, curve  |
| `GET /api/history?confidence=0.7&hours=6&days=5`      | Crowd report card                                                                 |
| `GET /api/replay?confidence=0.7&ticker=BTC2611192200` | Hour-by-hour replay of a settled day                                              |
| `POST /api/onchain`                                   | `{action: "set" \| "rebalance" \| "protect", …}` → `{hash, url}`                  |
| `POST /api/protect`                                   | `{strike, price, quantity, outcome}` → Gemini sandbox `{orderId, symbol, status}` |
| `GET /api/protect`                                    | Recent sandbox orders                                                             |

## Testing

**Smoke test:**

- [ ] Forecast loads live data; slider changes the range
- [ ] Set range → Basescan shows `RangeSet`
- [ ] Simulate shift → `Rebalanced` (labeled simulated); Reset returns to live odds
- [ ] Protect → Gemini sandbox order ID, then `ProtectionRecorded`
- [ ] Watch mode: Set range → Simulate → Reset → trigger 10% → Check now → auto-rebalance plus auto-hedge
- [ ] Report card and Replay load (about 10 s the first time)

**Quick API checks:**

```bash
curl "localhost:3000/api/curve?confidence=0.7"
curl "localhost:3000/api/history?confidence=0.7"
curl "localhost:3000/api/replay?confidence=0.7"
```

## Known limitations

- No Uniswap position is opened; the range is recommended and recorded only.
- Single trusted backend wallet and an offchain data source.
- The live timeline only covers the time since the page was opened; the recorded range in the UI resets on reload (it remains onchain).
- Sandbox contracts and prices differ from production.
- Only BTC daily ladders are supported.

## What's next

1. **Uniswap integration:** convert the range to Uniswap v3 ticks against a live pool.
2. **Forecast oracle:** publish the crowd forecast onchain so lending protocols, AMMs and vaults can read it.
3. **Optimal range engine:** choose the range with the best expected return after fees, out-of-range risk and hedge cost.
4. **Forecast-driven LP vault:** hold deposits and open/rebalance real Uniswap v3 positions automatically, widening before scheduled events.
5. **More markets** (ETH, SOL) and decentralized attestations of Gemini data.

## Team

- **Esha Bapat**: smart contract, onchain integration, Gemini trading integration (ebapat)
- **Ishan Ghosh**: forecast math, report card and replay, Watch mode, frontend and design (ghosh1330)

Built during the UBC 2026 Hackathon (Nov 12–20, 2026).

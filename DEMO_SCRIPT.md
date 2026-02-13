# Demo Video Script (2-3 minutes)

Record your screen with voiceover. Keep it fast-paced.

---

## Scene 1: Intro (10 seconds)

**Show:** Landing page at localhost:3000

**Say:** "This is Synthetic Order Flow: an autonomous AI agent that adds limit order trading to every nad.fun token on Monad."

---

## Scene 2: Connect Wallet (15 seconds)

**Action:** Click "Connect Wallet" -> Select MetaMask -> Approve

**Say:** "First, connect your wallet. The platform creates a dedicated agent wallet for you, encrypted and managed by the system."

**Show:** Settings page briefly showing agent wallet address + MON balance

---

## Scene 3: Create Order via Form (30 seconds)

**Action:** Go to /create page. Select a token (CHOG). Choose:
- Direction: BUY
- Trigger: MCAP_BELOW
- Value: 8650 (8.65k market cap)
- Amount: 0.01 MON
- Click "Create Order"

**Say:** "Creating orders is simple. Pick your token, choose from 12 trigger types: price targets, market cap, DCA intervals, trailing stops, take profit, stop loss, set your parameters, and submit. The agent monitors every 5 seconds and auto-executes when conditions are met."

**Show:** Green success banner

---

## Scene 4: AI Chat (40 seconds)

**Action:** Navigate to /chat page. Type:
"I want to buy 0.01 MON worth of CHOG when the market cap drops below 9000 MON"

**Show:** AI response summarizing the order details and asking for confirmation

**Action:** Type "yes" or "confirm"

**Show:** AI creates the order, green banner appears

**Say:** "You can also create orders through the AI chat. Just describe what you want in natural language. The AI understands all 12 trigger types, converts your intent to exact parameters, and creates the order after confirmation. It supports 4 AI providers: Groq, Claude, GPT-4o, and Gemini, with automatic fallback."

---

## Scene 5: Orders Dashboard (20 seconds)

**Action:** Go to /orders page

**Show:** List of active orders with status badges, trigger details, amounts

**Say:** "The orders page shows all your active, executed, and cancelled orders in real time. SSE push notifications update the dashboard instantly when order status changes."

**Action:** Click cancel on one order to show cancellation flow

---

## Scene 6: Orderbook (15 seconds)

**Action:** Go to /orderbook/[chog-address]

**Show:** CLOB-style orderbook with buy/sell sides

**Say:** "Every token gets a CLOB-style orderbook view showing all active buy and sell orders, aggregated by trigger level."

---

## Scene 7: AI Features (20 seconds)

**Action:** Quick cuts showing:
1. Token analysis on the create page (click AI Analyze)
2. Strategy suggestion (click AI Suggest Strategy)
3. Settings page showing BYOK AI key configuration

**Say:** "The AI layer goes beyond chat. It provides token analysis, strategy suggestions, and optional pre-execution risk checks. Users can bring their own API keys for any of the 4 supported providers."

---

## Scene 8: Closing (10 seconds)

**Show:** Architecture diagram from README (or the running terminal showing monitor loop logs)

**Say:** "12 trigger types. 4 AI providers. Fully autonomous execution. Real-time updates. Built on Monad for the Moltiverse Hackathon. Check out the GitHub repo for the full source code."

**Show:** GitHub URL

---

## Recording Tips

- Use 1920x1080 resolution
- Dark mode browser
- Close unnecessary tabs
- Have test orders pre-created so the orders page isn't empty
- Have CHOG token loaded so prices show up
- Make sure agent is running (check health endpoint first)
- Record audio separately if background is noisy, then overlay
- Keep total under 3 minutes
- Use OBS Studio or Loom for recording

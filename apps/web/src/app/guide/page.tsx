'use client';

import Link from 'next/link';

export default function GuidePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">User Guide</h1>
      <p className="text-gray-400 text-sm">
        Step-by-step instructions for creating and managing synthetic limit orders on Monad.
      </p>

      {/* Getting Started */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-monad-400">1. Connect Your Wallet</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-300">
          <p>Click <strong className="text-white">Connect Wallet</strong> in the top-right corner.</p>
          <p>MetaMask and WalletConnect are supported. Make sure you are on the <strong className="text-white">Monad</strong> network (Chain ID: 143).</p>
        </div>
      </section>

      {/* Agent Wallet */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-monad-400">2. Create Your Agent Wallet</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-300">
          <p>Go to <Link href="/settings" className="text-monad-400 underline">Settings</Link> and click <strong className="text-white">Create AI Agent</strong>.</p>
          <p>The system generates a dedicated wallet for auto-executing trades. This wallet is separate from your main wallet.</p>
          <p>Your agent wallet's private key is encrypted and stored securely. You can export it from Settings if needed.</p>
        </div>
      </section>

      {/* Fund Agent */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-monad-400">3. Fund Your Agent Wallet</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-300">
          <p><strong className="text-white">For buy orders:</strong> Send MON to your agent wallet address (shown in Settings and Dashboard).</p>
          <p><strong className="text-white">For sell orders:</strong> Transfer the ERC-20 tokens you want to sell to the agent wallet address.</p>
          <p>Only deposit the amount you intend to trade.</p>
        </div>
      </section>

      {/* Create Order */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-monad-400">4. Create an Order</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 text-sm text-gray-300">
          <p>Go to <Link href="/create" className="text-monad-400 underline">New Order</Link>. Enter the token contract address and click <strong className="text-white">Load</strong>.</p>
          <p>Fill in the order details:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-white">Direction:</strong> BUY or SELL</li>
            <li><strong className="text-white">Trigger type:</strong> Choose when the order should execute (see trigger types below)</li>
            <li><strong className="text-white">Trigger value:</strong> The threshold for your chosen trigger</li>
            <li><strong className="text-white">Amount:</strong> How much to trade (MON for buys, tokens for sells)</li>
            <li><strong className="text-white">Slippage:</strong> Maximum acceptable price slippage (default 3%)</li>
            <li><strong className="text-white">Expiry:</strong> When the order should expire if not triggered</li>
          </ul>
          <p>Click <strong className="text-white">Create Order</strong> to submit.</p>
        </div>
      </section>

      {/* Trigger Types */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-monad-400">5. Trigger Types</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm">
          <div className="space-y-1">
            <h3 className="text-white font-medium mb-2">Buy Triggers</h3>
            <div className="grid grid-cols-[140px_1fr] gap-y-1 text-gray-300">
              <span className="font-mono text-green-400 text-xs">PRICE_BELOW</span><span>Buy when token price drops to your target</span>
              <span className="font-mono text-green-400 text-xs">MCAP_BELOW</span><span>Buy when market cap drops below target</span>
              <span className="font-mono text-green-400 text-xs">PROGRESS_BELOW</span><span>Buy when bonding curve progress drops</span>
              <span className="font-mono text-green-400 text-xs">DCA_INTERVAL</span><span>Recurring buys at fixed time intervals</span>
              <span className="font-mono text-green-400 text-xs">PRICE_DROP_PCT</span><span>Buy after X% price drop from creation time</span>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-3 pt-3 space-y-1">
            <h3 className="text-white font-medium mb-2">Sell Triggers</h3>
            <div className="grid grid-cols-[140px_1fr] gap-y-1 text-gray-300">
              <span className="font-mono text-red-400 text-xs">PRICE_ABOVE</span><span>Sell when price rises to target</span>
              <span className="font-mono text-red-400 text-xs">MCAP_ABOVE</span><span>Sell when market cap exceeds target</span>
              <span className="font-mono text-red-400 text-xs">PROGRESS_ABOVE</span><span>Sell when bonding curve progress rises</span>
              <span className="font-mono text-red-400 text-xs">POST_GRADUATION</span><span>Sell when token graduates to DEX</span>
              <span className="font-mono text-red-400 text-xs">TRAILING_STOP</span><span>Sell after X% drop from peak price</span>
              <span className="font-mono text-red-400 text-xs">TAKE_PROFIT</span><span>Sell after X% gain from entry</span>
              <span className="font-mono text-red-400 text-xs">STOP_LOSS</span><span>Sell after X% loss from entry</span>
            </div>
          </div>
        </div>
      </section>

      {/* Monitor & Execute */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-monad-400">6. How Execution Works</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-300">
          <p>Once your order is active, the agent monitors it every 5 seconds:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Fetches the token's current price, progress, and graduation status from the blockchain</li>
            <li>Compares current state against your trigger conditions</li>
            <li>When conditions are met, fetches a fresh quote and checks slippage</li>
            <li>Signs and submits the transaction using your agent wallet</li>
            <li>Sends you a real-time notification with the result</li>
          </ol>
          <p>No manual signing required. The agent wallet handles everything automatically.</p>
        </div>
      </section>

      {/* AI Features */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-monad-400">7. AI Features (Optional)</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-300">
          <p>Configure your AI API keys in <Link href="/settings" className="text-monad-400 underline">Settings</Link> to unlock:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-white">AI Chat:</strong> Create orders in natural language (e.g., "Buy 0.01 MON of TOKEN when market cap drops below 5000")</li>
            <li><strong className="text-white">Token Analysis:</strong> Get market data analysis for any token</li>
            <li><strong className="text-white">Strategy Suggestions:</strong> AI recommends trigger type and value based on market conditions</li>
            <li><strong className="text-white">Risk Check:</strong> Optional pre-execution risk assessment</li>
          </ul>
          <p>Supported providers: Groq, Claude, OpenAI, Gemini. Bring your own API keys (BYOK).</p>
        </div>
      </section>

      {/* Manage Orders */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-monad-400">8. Manage Your Orders</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-300">
          <p>View all your orders on the <Link href="/orders" className="text-monad-400 underline">My Orders</Link> page.</p>
          <p>Orders show their current status: Active, Triggered, Executed, Expired, Cancelled, or Failed.</p>
          <p>You can cancel any active order at any time.</p>
          <p>Use the <Link href="/orderbook" className="text-monad-400 underline">Orderbook</Link> to see all active orders for a specific token.</p>
        </div>
      </section>

      {/* Example Flow */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-monad-400">Example: Buy the Dip</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-300">
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Connect wallet, create agent, fund it with 0.1 MON</li>
            <li>Go to New Order, paste the token address, click Load</li>
            <li>Set direction to <strong className="text-white">BUY</strong>, trigger to <strong className="text-white">PRICE_BELOW</strong></li>
            <li>Set the trigger value to your target price (e.g., the current price minus 20%)</li>
            <li>Set amount to <strong className="text-white">0.05 MON</strong>, expiry to 7 days</li>
            <li>Submit the order</li>
            <li>The agent watches the price every 5 seconds. When it drops to your target, it buys automatically</li>
          </ol>
        </div>
      </section>

      <div className="text-center pt-4">
        <Link
          href="/create"
          className="inline-block px-8 py-3 bg-monad-600 hover:bg-monad-700 text-white font-medium rounded-lg transition"
        >
          Create Your First Order
        </Link>
      </div>
    </div>
  );
}

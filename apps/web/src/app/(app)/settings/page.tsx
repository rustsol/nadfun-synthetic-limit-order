'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [preferred, setPreferred] = useState('auto');
  const [groqKey, setGroqKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiRiskCheck, setAiRiskCheck] = useState(false);

  // Agent wallet state
  const [agentAccount, setAgentAccount] = useState<any>(null);
  const [agentBalance, setAgentBalance] = useState<any>(null);
  const [exportedKey, setExportedKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);

  useEffect(() => {
    if (!address) return;
    api.getAiConfig(address).then(config => {
      setPreferred(config.preferred || 'auto');
    }).catch(() => {});

    api.getAccount(address).then(account => {
      setAgentAccount(account);
      if (account.aiRiskCheck !== undefined) setAiRiskCheck(account.aiRiskCheck);
      api.getAgentBalance(address).then(bal => setAgentBalance(bal)).catch(() => {});
    }).catch(() => {});
  }, [address]);

  const handleCreateAgent = async () => {
    if (!address) return;
    setCreatingAgent(true);
    try {
      const account = await api.createAccount(address);
      setAgentAccount(account);
      const bal = await api.getAgentBalance(address);
      setAgentBalance(bal);
    } catch (err) {
      console.error('Failed to create agent:', err);
    } finally {
      setCreatingAgent(false);
    }
  };

  const [exportError, setExportError] = useState('');

  const handleExportKey = async () => {
    if (!address || !walletClient) return;
    setExportError('');
    try {
      const timestamp = Date.now();
      const message = `Export agent private key for ${address.toLowerCase()} at ${timestamp}`;
      const signature = await walletClient.signMessage({ message });
      const result = await api.exportPrivateKey(address, message, signature);
      setExportedKey(result.privateKey);
      setShowKey(true);
    } catch (err: any) {
      const msg = err.message || 'Failed to export key';
      setExportError(msg.includes('rejected') ? 'Signature rejected' : msg);
      console.error('Failed to export key:', err);
    }
  };

  const handleSave = async () => {
    if (!address) return;
    setLoading(true);
    setSaved(false);
    try {
      await api.updateAiConfig({
        walletAddress: address,
        preferred,
        ...(groqKey ? { groqApiKey: groqKey } : {}),
        ...(claudeKey ? { claudeApiKey: claudeKey } : {}),
        ...(openaiKey ? { openaiApiKey: openaiKey } : {}),
        ...(geminiKey ? { geminiApiKey: geminiKey } : {}),
      });
      // Save risk check setting
      if (agentAccount) {
        await api.updateAccountSettings(address, { aiRiskCheck });
      }
      setSaved(true);
      setGroqKey('');
      setClaudeKey('');
      setOpenaiKey('');
      setGeminiKey('');
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center text-gray-500 py-20">
        Connect your wallet to access settings
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Agent Wallet Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">AI Agent Wallet</h2>
        <p className="text-xs text-gray-400">
          Your AI agent has a dedicated wallet to auto-execute limit orders on your behalf.
          Fund this wallet with MON and tokens to enable trading.
        </p>

        {!agentAccount ? (
          <button
            onClick={handleCreateAgent}
            disabled={creatingAgent}
            className="w-full py-3 bg-monad-600 hover:bg-monad-700 disabled:bg-gray-700 text-white font-bold rounded-lg transition"
          >
            {creatingAgent ? 'Creating Agent...' : 'Create AI Agent'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Agent Address</span>
                <span className="text-white font-mono text-xs">{agentAccount.agentAddress}</span>
              </div>
              {agentBalance && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">MON Balance</span>
                  <span className="text-white font-mono">
                    {agentBalance.monBalanceFormatted?.slice(0, 12)} MON
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Auto-Execute</span>
                <span className="text-green-400 text-xs font-medium">Enabled</span>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 text-xs text-yellow-300">
              Send MON to the agent address above to fund limit order execution.
              For sell orders, also send the tokens you want to sell.
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(agentAccount.agentAddress);
                }}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition"
              >
                Copy Address
              </button>
              <button
                onClick={handleExportKey}
                disabled={!walletClient}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm font-medium rounded-lg transition"
              >
                Export Private Key
              </button>
            </div>

            {exportError && (
              <p className="text-xs text-red-400">{exportError}</p>
            )}

            {showKey && exportedKey && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 space-y-2">
                <p className="text-xs text-red-400 font-medium">
                  Private Key: Keep this safe! Anyone with this key can access funds.
                </p>
                <div className="bg-gray-900 rounded p-2 text-xs font-mono text-gray-300 break-all select-all">
                  {exportedKey}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(exportedKey);
                  }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Copy to clipboard
                </button>
                <button
                  onClick={() => { setShowKey(false); setExportedKey(''); }}
                  className="text-xs text-red-400 hover:text-red-300 ml-4"
                >
                  Hide
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Agent Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-white">AI Agent Settings</h2>
        <p className="text-sm text-gray-400">
          Your AI agent uses multiple providers for token analysis, strategy suggestions,
          risk checks, and execution explanations. Configure API keys below (BYOK).
          The agent auto-switches between providers based on availability.
        </p>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Default AI Provider</label>
          <select
            value={preferred}
            onChange={e => setPreferred(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-monad-500"
          >
            <option value="auto">Auto (Round-Robin)</option>
            <option value="groq">Groq (Fastest - LPU)</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">GPT (OpenAI)</option>
            <option value="gemini">Gemini (Google)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {preferred === 'auto'
              ? 'Automatically rotates between providers and falls back on failure.'
              : `Uses ${preferred} first, falls back to others if unavailable.`}
          </p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Groq API Key</label>
          <input
            type="password"
            value={groqKey}
            onChange={e => setGroqKey(e.target.value)}
            placeholder="gsk_..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-monad-500 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Claude API Key</label>
          <input
            type="password"
            value={claudeKey}
            onChange={e => setClaudeKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-monad-500 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">OpenAI API Key</label>
          <input
            type="password"
            value={openaiKey}
            onChange={e => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-monad-500 font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Gemini API Key</label>
          <input
            type="password"
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-monad-500 font-mono text-sm"
          />
        </div>

        {/* AI Risk Check Toggle */}
        {agentAccount && (
          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm text-gray-300 font-medium">AI Pre-Execution Risk Check</label>
              <p className="text-xs text-gray-500">
                AI evaluates risk before auto-executing orders. If high-risk, execution is paused.
              </p>
            </div>
            <button
              onClick={() => setAiRiskCheck(!aiRiskCheck)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                aiRiskCheck ? 'bg-monad-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  aiRiskCheck ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        )}

        {saved && <p className="text-sm text-green-400">Settings saved!</p>}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-2.5 bg-monad-600 hover:bg-monad-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

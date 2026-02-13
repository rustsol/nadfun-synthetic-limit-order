const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001';

export async function fetchFromAgent(path: string, options?: RequestInit) {
  const res = await fetch(`${AGENT_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Account / Agent Wallet
  createAccount: (walletAddress: string) =>
    fetchFromAgent('/account', { method: 'POST', body: JSON.stringify({ walletAddress }) }),
  getAccount: (wallet: string) =>
    fetchFromAgent(`/account?wallet=${wallet}`),
  getAgentBalance: (wallet: string, token?: string) =>
    fetchFromAgent(`/account/balance?wallet=${wallet}${token ? `&token=${token}` : ''}`),
  exportPrivateKey: (walletAddress: string, message: string, signature: string) =>
    fetchFromAgent('/account/export-key', { method: 'POST', body: JSON.stringify({ walletAddress, message, signature }) }),

  // Orders
  getOrders: (wallet: string) => fetchFromAgent(`/orders?wallet=${wallet}`),
  getOrder: (id: string) => fetchFromAgent(`/orders/${id}`),
  createOrder: (data: any) => fetchFromAgent('/orders', { method: 'POST', body: JSON.stringify(data) }),
  cancelOrder: (id: string) => fetchFromAgent(`/orders/${id}/cancel`, { method: 'PATCH' }),
  confirmOrder: (id: string, txHash: string) => fetchFromAgent(`/orders/${id}/confirm`, { method: 'POST', body: JSON.stringify({ txHash }) }),

  // Orderbook
  getOrderbook: (token: string) => fetchFromAgent(`/orderbook/${token}`),

  // Token
  getTokenState: (address: string) => fetchFromAgent(`/token/${address}`),
  getQuote: (token: string, amount: string, isBuy: boolean) => fetchFromAgent(`/quote?token=${token}&amount=${amount}&isBuy=${isBuy}`),

  // AI Config
  getAiConfig: (wallet: string) => fetchFromAgent(`/ai-config?wallet=${wallet}`),
  updateAiConfig: (data: any) => fetchFromAgent('/ai-config', { method: 'POST', body: JSON.stringify(data) }),

  // Account Settings
  updateAccountSettings: (wallet: string, data: { aiRiskCheck?: boolean }) =>
    fetchFromAgent('/account/settings', { method: 'PATCH', body: JSON.stringify({ walletAddress: wallet, ...data }) }),

  // AI Features
  analyzeToken: (token: string, wallet: string) =>
    fetchFromAgent(`/ai/analyze/${token}?wallet=${wallet}`),
  suggestStrategy: (data: { tokenAddress: string; direction: string; inputAmount: string; wallet: string }) =>
    fetchFromAgent('/ai/suggest-strategy', { method: 'POST', body: JSON.stringify(data) }),
  aiChat: (data: { wallet: string; messages: Array<{ role: string; content: string }> }) =>
    fetchFromAgent('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
};

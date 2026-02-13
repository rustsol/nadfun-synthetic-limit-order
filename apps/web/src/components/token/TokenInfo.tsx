'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import type { TokenStateData } from '@/hooks/useTokenState';
import { BondingCurveProgress } from './BondingCurveProgress';
import { PriceDisplay } from './PriceDisplay';
import { api } from '@/lib/api';

interface Props {
  token: TokenStateData;
}

export function TokenInfo({ token }: Props) {
  const { address } = useAccount();
  const [analysis, setAnalysis] = useState('');
  const [analysisProvider, setAnalysisProvider] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleAnalyze = async () => {
    if (!address) return;
    setAnalyzing(true);
    setShowAnalysis(true);
    try {
      const result = await api.analyzeToken(token.tokenAddress, address);
      setAnalysis(result.analysis);
      setAnalysisProvider(result.provider);
    } catch {
      setAnalysis('Analysis unavailable. Configure AI API keys in Settings.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{token.symbol}</h3>
          <p className="text-sm text-gray-400">{token.name}</p>
        </div>
        <div className="flex gap-2">
          {token.isGraduated && (
            <span className="px-2 py-1 text-xs bg-green-900/50 text-green-400 rounded-full">
              Graduated (DEX)
            </span>
          )}
          {token.isLocked && (
            <span className="px-2 py-1 text-xs bg-red-900/50 text-red-400 rounded-full">
              Locked
            </span>
          )}
          {!token.isGraduated && !token.isLocked && (
            <span className="px-2 py-1 text-xs bg-monad-900/50 text-monad-400 rounded-full">
              Bonding Curve
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 font-mono break-all">{token.tokenAddress}</p>

      <BondingCurveProgress progress={token.progress} isGraduated={token.isGraduated} />

      <div className="grid grid-cols-2 gap-4">
        <PriceDisplay label="Buy Price" amountOut={token.buyAmountOut} isBuy={true} />
        <PriceDisplay label="Sell Price" amountOut={token.sellAmountOut} isBuy={false} />
      </div>

      {/* AI Analysis */}
      {address && (
        <div className="pt-2 border-t border-gray-800">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-monad-400 text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <span className="w-3 h-3 border-2 border-monad-400 border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>🤖 AI Token Analysis</>
            )}
          </button>

          {showAnalysis && (
            <div className="mt-3 bg-gray-800/50 rounded-lg p-3 space-y-2">
              {analyzing ? (
                <p className="text-xs text-gray-400 animate-pulse">AI is analyzing this token...</p>
              ) : (
                <>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{analysis}</p>
                  {analysisProvider && analysisProvider !== 'none' && (
                    <p className="text-[10px] text-gray-500">via {analysisProvider}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

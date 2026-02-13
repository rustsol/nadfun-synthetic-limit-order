'use client';

import { useState } from 'react';

interface Props {
  onSelect: (address: string) => void;
  value?: string;
}

export function TokenSearch({ onSelect, value = '' }: Props) {
  const [input, setInput] = useState(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.match(/^0x[a-fA-F0-9]{40}$/)) {
      onSelect(input);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter token address (0x...)"
        className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-monad-500 font-mono text-sm"
      />
      <button
        type="submit"
        disabled={!input.match(/^0x[a-fA-F0-9]{40}$/)}
        className="px-6 py-2.5 bg-monad-600 hover:bg-monad-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition"
      >
        Load
      </button>
    </form>
  );
}

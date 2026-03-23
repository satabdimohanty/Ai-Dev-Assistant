"use client";

import { useState } from "react";

type HistoryItem = {
  input: string;
  type: string;
  result: string;
  time?: string;
};

type Props = {
  history: HistoryItem[];
  setInput: (value: string) => void;
  setResult: (value: string) => void;
  clearHistory: () => void;
  deleteItem: (index: number) => void;
};

export default function HistorySidebar({
  history,
  setInput,
  setResult,
  clearHistory,
  deleteItem,
}: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="col-span-3 h-screen bg-white/10 backdrop-blur-xl border-r border-white/10 p-4 flex flex-col">

      {/* Title */}
      <h2 className="text-white text-lg font-bold mb-4 sticky top-0">
        🕘 History
      </h2>

      {/* History List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">

        {history.length === 0 ? (
          <p className="text-gray-300 text-sm">No history yet</p>
        ) : (
          history.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                setInput(item.input);
                setResult(item.result);
                setActiveIndex(index);
              }}
              className={`p-3 rounded-xl cursor-pointer transition relative group
                ${
                  activeIndex === index
                    ? "bg-white/30"
                    : "bg-white/10 hover:bg-white/20"
                }`}
            >
              {/* Type */}
              <p className="text-xs text-purple-300 font-semibold">
                {item.type.toUpperCase()}
              </p>

              {/* Input Preview */}
              <p className="text-sm text-white truncate">
                {item.input}
              </p>

              {/* Time */}
              {item.time && (
                <p className="text-[10px] text-gray-400 mt-1">
                  {item.time}
                </p>
              )}

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // prevent click conflict
                  deleteItem(index);
                }}
                className="absolute top-2 right-2 text-xs bg-black/40 px-2 py-1 rounded opacity-0 group-hover:opacity-100"
              >
                ❌
              </button>
            </div>
          ))
        )}
      </div>

      {/* Clear All */}
      {history.length > 0 && (
        <button
          onClick={clearHistory}
          className="mt-4 bg-red-500/70 hover:bg-red-600 text-white py-2 rounded-xl"
        >
          Clear History
        </button>
      )}
    </div>
  );
}
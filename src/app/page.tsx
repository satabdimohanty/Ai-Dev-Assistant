"use client";

import { useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (type: string) => {
    if (!input.trim()) return;

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: input, type }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();
      setResult(data.result || data.error);
    } catch (err: any) {
      console.error(err);
      setResult("Error: " + err.message);
    }

    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-5">
      <div className="backdrop-blur-xl bg-white/10 p-6 rounded-2xl w-full max-w-6xl shadow-2xl border border-white/10">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-white via-gray-400 to-gray-900 text-transparent bg-clip-text animate-gradient">
            🚀 AI Dev Assistant
          </h1>

          <p className="text-gray-300 mt-2 text-sm md:text-base">
            Your smart coding companion for debugging, explaining & generating
            code
          </p>
        </div>

        {/* Input */}
        <textarea
          className="w-full p-3 rounded-lg bg-white/10 text-white outline-none resize-none focus:ring-2 focus:ring-purple-500"
          rows={5}
          placeholder="Enter code or prompt..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && input.trim()) {
              e.preventDefault();
              handleSubmit("generate");
            }
          }}
        />

        {/* Hint */}
        {!input.trim() && (
          <p className="text-xs text-gray-300 mt-2">
            ✍️ Enter something to enable actions
          </p>
        )}

        {/* Buttons */}
        <div className="mt-5 flex flex-wrap gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
          <button
            disabled={loading || !input.trim()}
            onClick={() => handleSubmit("explain")}
            className="pro-btn blue"
          >
            <span>🧠</span>
            Explain
          </button>

          <button
            disabled={loading || !input.trim()}
            onClick={() => handleSubmit("debug")}
            className="pro-btn red"
          >
            <span>🐞</span>
            Debug
          </button>

          <button
            disabled={loading || !input.trim()}
            onClick={() => handleSubmit("generate")}
            className="pro-btn green"
          >
            {loading ? <span className="loader"></span> : <span>⚡</span>}
            Generate
          </button>

          <button
            onClick={() => {
              setInput("");
              setResult("");
            }}
            className="pro-btn gray"
          >
            <span>❌</span>
            Clear
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-4 text-gray-300 animate-pulse">
            🤖 AI is thinking...
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-4 relative p-4 bg-white/10 rounded-lg text-white whitespace-pre-wrap border border-white/10">
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 text-xs bg-black/30 px-2 py-1 rounded"
            >
              Copy
            </button>

            {result}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import HistorySidebar from "../components/history";
export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const deleteItem = (index: number) => {
    setHistory((prev) => prev.filter((_, i) => i !== index));
  };
  const [history, setHistory] = useState<
    { input: string; type: string; result: string }[]
  >([]);
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

      const finalResult = data.result || data.error;

      setResult(finalResult);

      // ✅ ADD HISTORY HERE 🔥
      setHistory((prev) => [
        {
          input,
          type,
          result: finalResult,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error(err);
      setResult("Error: " + err.message);
    }

    setLoading(false);
  };
  const copyToClipboard = () => {
    if (!result) return;

    navigator.clipboard.writeText(result);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-12 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* ✅ LEFT SIDE - HISTORY */}
      <HistorySidebar
        history={history}
        setInput={setInput}
        setResult={setResult}
        clearHistory={() => setHistory([])}
        deleteItem={deleteItem}
      />

      {/* ✅ RIGHT SIDE - MAIN UI */}
      <div className="col-span-9 flex items-center justify-center p-5">
        <div className="backdrop-blur-xl bg-white/10 p-6 rounded-2xl w-full max-w-6xl shadow-2xl border border-white/10">
          {/* Title */}
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
          />

          {/* Buttons */}
          <div className="mt-5 flex flex-wrap gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <button
              onClick={() => handleSubmit("explain")}
              className="pro-btn blue"
            >
              🧠 Explain
            </button>
            <button
              onClick={() => handleSubmit("debug")}
              className="pro-btn red"
            >
              🐞 Debug
            </button>
            <button
              onClick={() => handleSubmit("generate")}
              className="pro-btn green"
            >
              ⚡ Generate
            </button>
            <button
              onClick={() => {
                setInput("");
                setResult("");
              }}
              className="pro-btn gray"
            >
              ❌ Clear
            </button>
          </div>

        {result && (
  <div className="mt-6 relative">
    
    {/* CODE CONTAINER */}
    <div className="bg-[#0d1117] rounded-xl border border-gray-700 shadow-lg overflow-hidden">
      
      {/* HEADER BAR (like VS Code) */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#161b22] border-b border-gray-700">
        <span className="text-xs text-gray-400">Code Output</span>

        {/* COPY BUTTON */}
        <button
          onClick={copyToClipboard}
          className="text-xs flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-md 
                  transition"
        >
          {copied ? "✅ Copied" : "📋 Copy"}
        </button>
      </div>

      {/* CODE BLOCK */}
      <pre className="p-4 text-sm text-green-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
        <code>{result}</code>
      </pre>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
}

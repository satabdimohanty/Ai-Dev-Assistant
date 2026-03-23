"use client";

type Props = {
  history: { prompt: string; result: string }[];
  setInput: (value: string) => void;
  setHistory: (value: any) => void;
};

export default function Sidebar({ history, setInput, setHistory }: Props) {
  return (
    <div className="w-72 h-screen bg-white/10 backdrop-blur-md p-4 border-r border-white/20 text-white">

      <div className="flex justify-between mb-4">
        <h2 className="font-semibold">History</h2>
        <button onClick={() => setHistory([])} className="text-red-400 text-sm">
          Clear
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto h-[90%]">
        {history.map((item, i) => (
          <div
            key={i}
            onClick={() => setInput(item.prompt)}
            className="bg-white/10 p-2 rounded cursor-pointer hover:bg-white/20 text-sm"
          >
            {item.prompt}
          </div>
        ))}
      </div>
    </div>
  );
}
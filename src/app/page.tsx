"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type HistoryItem = {
  input: string;
  type: string;
  result: string;
  time: string;
};

type LineAnnotation = {
  line: number;
  explanation: string;
  loading: boolean;
};

const TYPE_META: Record<string, { label: string; accent: string; bg: string; border: string }> = {
  explain:  { label: "Explain",  accent: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.3)" },
  debug:    { label: "Debug",    accent: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.3)" },
  generate: { label: "Generate", accent: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.3)"  },
};

// ── Syntax Tokeniser ─────────────────────────────────────────────────────────
type Token = { type: string; value: string };

const KEYWORDS = new Set([
  "const","let","var","function","return","if","else","for","while","do",
  "class","new","import","export","default","from","async","await","try",
  "catch","throw","typeof","instanceof","in","of","this","super","extends",
  "interface","type","enum","implements","readonly","public","private",
  "protected","static","abstract","void","null","undefined","true","false",
  "break","continue","switch","case","yield","delete","get","set",
]);

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
      const q = line[i]; let j = i + 1;
      while (j < line.length && !(line[j] === q && line[j - 1] !== "\\")) j++;
      tokens.push({ type: "string", value: line.slice(i, j + 1) });
      i = j + 1; continue;
    }
    if (line[i] === "/" && line[i + 1] === "/") {
      tokens.push({ type: "comment", value: line.slice(i) });
      break;
    }
    if (/\d/.test(line[i])) {
      let j = i;
      while (j < line.length && /[\d.xXa-fA-F_]/.test(line[j])) j++;
      tokens.push({ type: "number", value: line.slice(i, j) });
      i = j; continue;
    }
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[\w$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const isFunc = line[j] === "(";
      tokens.push({ type: KEYWORDS.has(word) ? "keyword" : isFunc ? "function" : "identifier", value: word });
      i = j; continue;
    }
    if (/[{}[\]().,;:=<>!&|+\-*/%^~?]/.test(line[i])) {
      tokens.push({ type: "punctuation", value: line[i] });
      i++; continue;
    }
    tokens.push({ type: "plain", value: line[i] });
    i++;
  }
  return tokens;
}

const TOKEN_COLOR: Record<string, string> = {
  keyword:     "#c084fc",
  string:      "#86efac",
  comment:     "#6b7280",
  number:      "#fbbf24",
  function:    "#60a5fa",
  punctuation: "#94a3b8",
  identifier:  "#e2e8f0",
  plain:       "#e2e8f0",
};

function HighlightedLine({ line }: { line: string }) {
  return (
    <>
      {tokenizeLine(line).map((t, i) => (
        <span key={i} style={{ color: TOKEN_COLOR[t.type] }}>{t.value}</span>
      ))}
    </>
  );
}

// ── CodePanel ────────────────────────────────────────────────────────────────
function CodePanel({ code, type }: { code: string; type: string }) {
  const lines = code.split("\n");
  const meta = TYPE_META[type] ?? TYPE_META.generate;
  const [annotations, setAnnotations] = useState<Record<number, LineAnnotation>>({});
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  // detect logical sections separated by blank lines
  const sections: { start: number; end: number }[] = [];
  let sStart = 0;
  for (let i = 0; i <= lines.length; i++) {
    if (i === lines.length || lines[i].trim() === "") {
      if (i > sStart) sections.push({ start: sStart, end: i - 1 });
      sStart = i + 1;
    }
  }

  const explainLine = useCallback(async (lineIdx: number) => {
    if (annotations[lineIdx]?.explanation) return;
    setAnnotations(prev => ({ ...prev, [lineIdx]: { line: lineIdx, explanation: "", loading: true } }));
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          messages: [{
            role: "user",
            content: `Explain this single line of code in ONE plain-English sentence, no jargon:\n\n${lines[lineIdx]}\n\nContext:\n${lines.slice(Math.max(0, lineIdx - 2), lineIdx + 3).join("\n")}`,
          }],
        }),
      });
      const data = await res.json();
      const explanation = data.content?.[0]?.text?.trim() ?? "Could not explain.";
      setAnnotations(prev => ({ ...prev, [lineIdx]: { line: lineIdx, explanation, loading: false } }));
    } catch {
      setAnnotations(prev => ({ ...prev, [lineIdx]: { line: lineIdx, explanation: "Error fetching explanation.", loading: false } }));
    }
  }, [lines, annotations]);

  const explainSection = useCallback(async (secIdx: number) => {
    const sec = sections[secIdx];
    const key = -secIdx - 1;
    if (annotations[key]?.explanation) {
      setActiveSection(activeSection === secIdx ? null : secIdx);
      return;
    }
    setActiveSection(secIdx);
    setAnnotations(prev => ({ ...prev, [key]: { line: key, explanation: "", loading: true } }));
    const secCode = lines.slice(sec.start, sec.end + 1).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `Explain what this code block does in 2-3 sentences. Plain English, concise:\n\n${secCode}`,
          }],
        }),
      });
      const data = await res.json();
      const explanation = data.content?.[0]?.text?.trim() ?? "Could not explain.";
      setAnnotations(prev => ({ ...prev, [key]: { line: key, explanation, loading: false } }));
    } catch {
      setAnnotations(prev => ({ ...prev, [key]: { line: key, explanation: "Error.", loading: false } }));
    }
  }, [sections, lines, annotations, activeSection]);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      border: `1px solid ${meta.border}`,
      borderRadius: 14,
      overflow: "hidden",
      background: "#0d1117",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", background: "#161b22",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
          ))}
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase",
            padding: "2px 10px", borderRadius: 20,
            background: meta.bg, color: meta.accent, border: `1px solid ${meta.border}`,
          }}>{meta.label}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
            {lines.length} lines · {code.length} chars
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setWrapLines(w => !w)} style={{
            fontSize: 10, padding: "4px 10px", borderRadius: 6, cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.12)",
            background: wrapLines ? "rgba(255,255,255,0.08)" : "transparent",
            color: wrapLines ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)",
            fontFamily: "inherit",
          }}>Wrap</button>
          <button onClick={copy} style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 6, cursor: "pointer",
            border: copied ? "1px solid rgba(52,211,153,0.4)" : "1px solid rgba(255,255,255,0.12)",
            background: copied ? "rgba(52,211,153,0.1)" : "transparent",
            color: copied ? "#34d399" : "rgba(255,255,255,0.45)",
            fontFamily: "inherit", transition: "all 0.15s",
          }}>{copied ? "✓ Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Section buttons */}
      {sections.length > 1 && (
        <div style={{
          padding: "8px 12px", background: "#0d1117",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          display: "flex", gap: 6, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", alignSelf: "center", marginRight: 4 }}>Explain block:</span>
          {sections.map((sec, si) => {
            const key = -si - 1;
            const ann = annotations[key];
            const isActive = activeSection === si;
            return (
              <button key={si} onClick={() => explainSection(si)} style={{
                fontSize: 10, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
                border: isActive ? `1px solid ${meta.border}` : "1px solid rgba(255,255,255,0.1)",
                background: isActive ? meta.bg : "transparent",
                color: isActive ? meta.accent : "rgba(255,255,255,0.35)",
                fontFamily: "inherit", transition: "all 0.15s",
              }}>
                {ann?.loading ? "…" : `L${sec.start + 1}–${sec.end + 1}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Active section explanation */}
      {activeSection !== null && (() => {
        const key = -activeSection - 1;
        const ann = annotations[key];
        return ann ? (
          <div style={{
            padding: "10px 16px 10px 52px",
            background: "rgba(167,139,250,0.06)",
            borderBottom: "1px solid rgba(167,139,250,0.12)",
            borderLeft: "3px solid rgba(167,139,250,0.5)",
            fontSize: 12, lineHeight: 1.65,
            color: "rgba(255,255,255,0.65)",
          }}>
            {ann.loading
              ? <span style={{ color: "rgba(255,255,255,0.3)" }}>Thinking…</span>
              : ann.explanation}
          </div>
        ) : null;
      })()}

      {/* Code lines */}
      <div style={{ overflowX: wrapLines ? "hidden" : "auto", maxHeight: 420, overflowY: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: wrapLines ? "100%" : "max-content" }}>
          <tbody>
            {lines.map((line, idx) => {
              const ann = annotations[idx];
              const isAnnotated = ann && !ann.loading && ann.explanation;
              const inActiveSection = activeSection !== null &&
                idx >= sections[activeSection]?.start && idx <= sections[activeSection]?.end;

              return (
                <tr key={idx} style={{
                  background: inActiveSection ? "rgba(167,139,250,0.04)" : "transparent",
                  transition: "background 0.15s",
                }}>
                  {/* line number */}
                  <td style={{
                    userSelect: "none", width: 44, minWidth: 44,
                    textAlign: "right", paddingRight: 16, paddingLeft: 12,
                    fontSize: 11, color: "rgba(255,255,255,0.18)",
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                    verticalAlign: "top", paddingTop: 3, paddingBottom: 3,
                  }}>{idx + 1}</td>

                  {/* explain button */}
                  <td style={{ width: 26, minWidth: 26, textAlign: "center", verticalAlign: "top", paddingTop: 5 }}>
                    {line.trim() && (
                      <button
                        onClick={() => explainLine(idx)}
                        title="Explain this line"
                        style={{
                          width: 16, height: 16, borderRadius: "50%",
                          border: ann?.loading
                            ? "1px solid rgba(167,139,250,0.5)"
                            : isAnnotated
                            ? "1px solid rgba(52,211,153,0.5)"
                            : "1px solid rgba(255,255,255,0.12)",
                          background: ann?.loading
                            ? "rgba(167,139,250,0.15)"
                            : isAnnotated ? "rgba(52,211,153,0.1)" : "transparent",
                          cursor: "pointer", fontSize: 9, lineHeight: "16px",
                          color: ann?.loading ? "#a78bfa" : isAnnotated ? "#34d399" : "rgba(255,255,255,0.25)",
                          transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                        {ann?.loading ? "·" : isAnnotated ? "✓" : "?"}
                      </button>
                    )}
                  </td>

                  {/* code content */}
                  <td style={{
                    paddingLeft: 12, paddingRight: 16,
                    paddingTop: 3, paddingBottom: 3,
                    fontSize: 12.5, lineHeight: 1.7,
                    whiteSpace: wrapLines ? "pre-wrap" : "pre",
                    wordBreak: wrapLines ? "break-all" : undefined,
                    verticalAlign: "top",
                  }}>
                    <HighlightedLine line={line} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inline line annotations */}
      {Object.entries(annotations)
        .filter(([k, v]) => Number(k) >= 0 && !v.loading && v.explanation)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([k, ann]) => (
          <div key={k} style={{
            display: "flex",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            background: "rgba(52,211,153,0.04)",
          }}>
            <div style={{
              width: 44, minWidth: 44, fontSize: 10,
              textAlign: "right", paddingRight: 16, paddingLeft: 12,
              color: "rgba(52,211,153,0.5)", paddingTop: 8, paddingBottom: 8,
              borderRight: "1px solid rgba(255,255,255,0.05)",
              flexShrink: 0,
            }}>L{Number(k) + 1}</div>
            <div style={{
              width: 26, minWidth: 26, flexShrink: 0,
              borderRight: "2px solid rgba(52,211,153,0.35)",
            }} />
            <div style={{
              flex: 1, padding: "6px 14px",
              fontSize: 11.5, lineHeight: 1.65,
              color: "rgba(255,255,255,0.6)",
            }}>
              {ann.explanation}
              <button onClick={() => setAnnotations(prev => {
                const next = { ...prev }; delete next[Number(k)]; return next;
              })} style={{
                marginLeft: 10, fontSize: 10, color: "rgba(255,255,255,0.2)",
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              }}>dismiss</button>
            </div>
          </div>
        ))}

      {/* Footer hint */}
      <div style={{
        padding: "8px 16px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        fontSize: 10, color: "rgba(255,255,255,0.2)",
        background: "#161b22",
      }}>
        <span>Click <span style={{ color: "rgba(52,211,153,0.5)" }}>?</span> on any line for an AI explanation</span>
        <span style={{ opacity: 0.3 }}>·</span>
        <span>Use block buttons to explain a whole section</span>
        {Object.keys(annotations).filter(k => Number(k) >= 0).length > 0 && (
          <>
            <span style={{ opacity: 0.3 }}>·</span>
            <button onClick={() => setAnnotations({})} style={{
              fontSize: 10, color: "rgba(248,113,113,0.5)", background: "none",
              border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>clear annotations</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [result]);

  const handleSubmit = async (type: string) => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult("");
    setActiveType(type);

    const prompts: Record<string, string> = {
      explain:  `Explain this code clearly and concisely:\n\n${input}`,
      debug:    `Find bugs and fix them. Show corrected code with brief explanation:\n\n${input}`,
      generate: `Generate clean, production-ready code for: ${input}`,
    };

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompts[type], type }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const finalResult = data.result || data.error;
      setResult(finalResult);
      setHistory(prev => [{ input, type, result: finalResult, time: new Date().toLocaleTimeString() }, ...prev]);
    } catch (err: any) {
      setResult("Error: " + err.message);
    }
    setLoading(false);
  };

  const loadItem = (item: HistoryItem) => {
    setInput(item.input);
    setResult(item.result);
    setActiveType(item.type);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&family=Syne:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#080a0f;color:#e2e8f0;font-family:'Syne',sans-serif;min-height:100vh}
        .app-shell{display:grid;grid-template-columns:${sidebarOpen ? "260px 1fr" : "0px 1fr"};min-height:100vh;transition:grid-template-columns 0.3s cubic-bezier(0.4,0,0.2,1)}
        .sidebar{background:#0d1018;border-right:1px solid rgba(255,255,255,0.06);overflow:hidden;display:flex;flex-direction:column}
        .sidebar-header{padding:20px 16px 14px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between}
        .sidebar-title{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3)}
        .clear-btn{font-size:10px;color:rgba(255,255,255,0.3);background:none;border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:3px 8px;cursor:pointer;font-family:'Syne',sans-serif}
        .clear-btn:hover{color:rgba(255,255,255,0.6);border-color:rgba(255,255,255,0.2)}
        .hist-scroll{flex:1;overflow-y:auto;padding:8px}
        .hist-scroll::-webkit-scrollbar{width:3px}
        .hist-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .hist-empty{padding:32px 16px;text-align:center;font-size:12px;color:rgba(255,255,255,0.2);line-height:1.6}
        .h-item{padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:4px;border:1px solid transparent;transition:all 0.15s;position:relative}
        .h-item:hover{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.07)}
        .h-item-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}
        .h-badge{font-size:9px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;padding:2px 7px;border-radius:20px}
        .h-badge-explain{background:rgba(167,139,250,0.15);color:#a78bfa}
        .h-badge-debug{background:rgba(248,113,113,0.15);color:#f87171}
        .h-badge-generate{background:rgba(52,211,153,0.15);color:#34d399}
        .h-time{font-size:10px;color:rgba(255,255,255,0.2);font-family:'JetBrains Mono',monospace}
        .h-preview{font-size:11px;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'JetBrains Mono',monospace}
        .h-del{position:absolute;top:8px;right:8px;font-size:10px;color:rgba(255,255,255,0.2);background:none;border:none;cursor:pointer;padding:2px 5px;border-radius:4px;opacity:0;transition:opacity 0.15s}
        .h-item:hover .h-del{opacity:1}
        .h-del:hover{color:#f87171}
        .main{display:flex;flex-direction:column;background:#080a0f;position:relative}
        .bg-grid{position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:40px 40px;mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,black 30%,transparent 100%)}
        .topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;border-bottom:1px solid rgba(255,255,255,0.05);position:relative;z-index:10;background:rgba(8,10,15,0.95)}
        .logo-area{display:flex;align-items:center;gap:12px}
        .logo-icon{width:34px;height:34px;background:linear-gradient(135deg,#7c3aed,#34d399);border-radius:9px;display:flex;align-items:center;justify-content:center}
        .logo-icon svg{width:16px;height:16px;stroke:white;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
        .logo-name{font-size:16px;font-weight:700;letter-spacing:-0.3px;color:#fff}
        .logo-sub{font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:0.5px}
        .topbar-right{display:flex;align-items:center;gap:10px}
        .status-pill{display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);padding:5px 12px;border-radius:20px}
        .status-dot{width:6px;height:6px;border-radius:50%;background:#34d399;animation:pulse 2s ease-in-out infinite}
        .status-dot.busy{background:#f59e0b;animation:none}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .tog-btn{width:32px;height:32px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;color:rgba(255,255,255,0.4)}
        .tog-btn:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7)}
        .content{flex:1;padding:32px 28px;max-width:960px;width:100%;position:relative;z-index:1}
        .sec-label{font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.25);margin-bottom:10px}
        .textarea-wrap{position:relative;margin-bottom:16px}
        textarea{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px 16px 40px;font-size:13px;color:#e2e8f0;resize:none;font-family:'JetBrains Mono',monospace;outline:none;line-height:1.7;transition:border-color 0.2s,background 0.2s;min-height:160px}
        textarea:focus{border-color:rgba(124,58,237,0.4);background:rgba(124,58,237,0.03)}
        textarea::placeholder{color:rgba(255,255,255,0.18)}
        .char-count{position:absolute;bottom:12px;right:14px;font-size:10px;color:rgba(255,255,255,0.2);font-family:'JetBrains Mono',monospace;pointer-events:none}
        .actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}
        .action-btn{display:flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;font-family:'Syne',sans-serif;cursor:pointer;border:1px solid;transition:all 0.2s}
        .action-btn:disabled{opacity:0.4;cursor:not-allowed}
        .action-btn:not(:disabled):active{transform:scale(0.97)}
        .btn-explain{background:rgba(167,139,250,0.08);border-color:rgba(167,139,250,0.3);color:#a78bfa}
        .btn-explain:not(:disabled):hover{border-color:rgba(167,139,250,0.6)}
        .btn-debug{background:rgba(248,113,113,0.08);border-color:rgba(248,113,113,0.3);color:#f87171}
        .btn-debug:not(:disabled):hover{border-color:rgba(248,113,113,0.6)}
        .btn-generate{background:rgba(52,211,153,0.08);border-color:rgba(52,211,153,0.3);color:#34d399}
        .btn-generate:not(:disabled):hover{border-color:rgba(52,211,153,0.6)}
        .btn-clear{background:transparent;border-color:rgba(255,255,255,0.1);color:rgba(255,255,255,0.35);margin-left:auto}
        .btn-clear:not(:disabled):hover{border-color:rgba(255,255,255,0.2);color:rgba(255,255,255,0.6)}
        .loading-bar-wrap{height:2px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden;margin-bottom:16px}
        .loading-bar{height:100%;background:linear-gradient(90deg,#7c3aed,#34d399,#7c3aed);background-size:200% 100%;animation:shimmer 1.4s linear infinite;border-radius:2px}
        @keyframes shimmer{to{background-position:-200% 0}}
        .fade-up{animation:fadeUp 0.3s ease both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:640px){.app-shell{grid-template-columns:1fr!important}.sidebar{display:none}.content{padding:20px 16px}}
      `}</style>

      <div className="bg-grid" />

      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">History</span>
            {history.length > 0 && (
              <button className="clear-btn" onClick={() => setHistory([])}>Clear all</button>
            )}
          </div>
          <div className="hist-scroll">
            {history.length === 0 ? (
              <div className="hist-empty">No sessions yet.<br />Run a query to start.</div>
            ) : (
              history.map((item, i) => (
                <div key={i} className="h-item" onClick={() => loadItem(item)}>
                  <div className="h-item-top">
                    <span className={`h-badge h-badge-${item.type}`}>{item.type}</span>
                    <span className="h-time">{item.time}</span>
                  </div>
                  <div className="h-preview">{item.input.slice(0, 56)}{item.input.length > 56 ? "…" : ""}</div>
                  <button className="h-del" onClick={e => { e.stopPropagation(); setHistory(prev => prev.filter((_, j) => j !== i)); }}>✕</button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          <header className="topbar">
            <div className="logo-area">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              </div>
              <div>
                <div className="logo-name">AI Dev Assistant</div>
                <div className="logo-sub">debug · explain · generate</div>
              </div>
            </div>
            <div className="topbar-right">
              <div className="status-pill">
                <div className={`status-dot ${loading ? "busy" : ""}`} />
                {loading ? "Processing…" : "Ready"}
              </div>
              <button className="tog-btn" onClick={() => setSidebarOpen(v => !v)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" />
                </svg>
              </button>
            </div>
          </header>

          <div className="content">
            <div className="sec-label">Input</div>
            <div className="textarea-wrap">
              <textarea
                rows={7}
                placeholder="Paste your code or describe what you need…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit("explain"); }}
              />
              <div className="char-count">{input.length} chars</div>
            </div>

            <div className="actions">
              {(["explain", "debug", "generate"] as const).map(type => (
                <button key={type} className={`action-btn btn-${type}`} onClick={() => handleSubmit(type)} disabled={loading}>
                  {TYPE_META[type].label}
                </button>
              ))}
              <button className="action-btn btn-clear" onClick={() => { setInput(""); setResult(""); setActiveType(null); }} disabled={loading}>
                Clear
              </button>
            </div>

            {loading && (
              <div className="loading-bar-wrap">
                <div className="loading-bar" />
              </div>
            )}

            {result && activeType && (
              <div ref={outputRef} className="fade-up">
                <div className="sec-label" style={{ marginBottom: 10 }}>Output</div>
                <CodePanel code={result} type={activeType} />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
# 🚀 AI Dev Assistant

An AI-powered developer tool built with **Next.js, React, Tailwind CSS, and Groq API** to help you **explain, debug, and generate code instantly** ⚡

---

## ✨ Features

* 💡 **Explain Code** – Understand complex logic easily
* 🐞 **Debug Code** – Detect and fix errors
* ⚡ **Generate Code** – Create code snippets instantly
* 🕘 **Sidebar History** – Chat-like history panel
* 🎨 **Modern UI** – Glassmorphism + gradient design
* ❌ **Clear Input** – Reset with one click
* ⚡ **Ultra-fast AI responses (Groq)**

---

## 🛠️ Tech Stack

* **Next.js (App Router)**
* **React**
* **TypeScript**
* **Tailwind CSS**
* **Groq API (LLM inference)**

---

## 🔌 Groq API Integration

This project uses **Groq** for lightning-fast AI responses.

### 📦 Install Groq SDK

```bash
npm install groq-sdk
```

---

### 🔑 Setup Environment Variables

Create a `.env.local` file:

```env
GROQ_API_KEY=your_groq_api_key_here
```

👉 Get your API key from: https://console.groq.com/

---

### ⚙️ Example API Route (Next.js)

Create:

```bash
app/api/ai/route.ts
```

```ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: Request) {
  const { input, type } = await req.json();

  let prompt = "";

  if (type === "explain") {
    prompt = `Explain this code:\n${input}`;
  } else if (type === "debug") {
    prompt = `Debug this code and fix errors:\n${input}`;
  } else {
    prompt = `Generate code for:\n${input}`;
  }

  const response = await groq.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [
      { role: "user", content: prompt }
    ],
  });

  return NextResponse.json({
    result: response.choices[0]?.message?.content,
  });
}
```

---

## 🧠 How It Works

1. Enter your **code or prompt**
2. Choose an action:

   * 💡 Explain
   * 🐞 Debug
   * ⚡ Generate
3. Request is sent to **Groq API**
4. Response is displayed instantly

---

## 📁 Project Structure

```bash
app/
 ├── page.tsx           # Main UI
 ├── api/
 │    └── ai/route.ts   # Groq API handler
components/
 ├── Sidebar.tsx
 ├── Buttons.tsx
styles/
 └── globals.css
```

---

## ⚙️ Installation & Setup

### 1. Clone repo

```bash
git clone https://github.com/satabdimohanty/Ai-Dev-Assistant.git
cd ai-dev-assistant
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add environment variable

```env
GROQ_API_KEY=your_key_here
```

### 4. Run project

```bash
npm run dev
```

👉 Open:

```
http://localhost:3000
```

---

## 🔮 Future Improvements

* 💬 ChatGPT-like streaming UI
* 📋 Copy response button
* 🌙 Dark/Light mode toggle
* 🧾 Code formatting & syntax highlighting
* 🔐 Authentication

---

## 🤝 Contributing

```bash
fork → clone → create branch → commit → push → PR
```



## 👨‍💻 Author

**Satabdi Mohanty**

---

⭐ Star this repo if you like it!

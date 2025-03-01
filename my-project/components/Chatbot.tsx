"use client";
import "../styles/globals.css";
import { useState } from "react";

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ text: string; isTyping?: boolean }[]>([]);
  const [chatVisible, setChatVisible] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!chatVisible) setChatVisible(true);

    const userMessage = { text: `You: ${input}` };
    setMessages([...messages, userMessage, { text: "Bot: " , isTyping: true }]);
    setInput("");

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      simulateTyping(`Bot: ${data.response}`);
    } catch (error: any) {
      simulateTyping(`Bot: ${error.message}`);
    }
  };

  const simulateTyping = (text: string) => {
    let index = 0;
    setMessages((prev) => [...prev.slice(0, -1), { text: "Bot: " , isTyping: true }]);
    
    const interval = setInterval(() => {
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { text: text.slice(0, index + 1), isTyping: true };
        return newMessages;
      });
      index++;
      if (index === text.length) {
        clearInterval(interval);
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { text };
          return newMessages;
        });
      }
    }, 50);
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900 text-white font-sans">
      <h1 className="text-3xl font-bold mb-5 text-center">Weather Chatbot</h1>

      <div className="flex w-3/5">
        <input
          type="text"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 p-4 text-lg bg-gray-800 text-white rounded-full shadow-md border-none outline-none focus:ring-0 placeholder-gray-400"
        />
        <button
          onClick={handleSend}
          className="ml-3 p-3 bg-blue-500 text-white text-lg rounded-full hover:bg-blue-600 transition-all">
          ➤
        </button>
      </div>

      <div
        className={`w-3/5 h-[350px] bg-gray-800 p-4 rounded-lg overflow-y-auto flex flex-col mt-4 transition-opacity transform ${
          chatVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}>
        {messages.map((msg, i) => (
          <p key={i} className={`p-3 text-lg font-medium rounded-lg mb-1 animate-fadeIn ${msg.text.startsWith("You") ? "bg-blue-500 text-white self-end" : "bg-gray-700 text-white self-start"}`}>
            {msg.text}
          </p>
        ))}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.5s ease;
          }
        `}
      </style>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "../components/ui/button";
import Sidebar from "../components/Sidebar";
import { Send, Loader2, Mic } from "lucide-react";
import {
  healthCheck as apiHealthCheck,
  chat as apiChat,
  chatStream,
  getHistory as apiGetHistory,
} from "../lib/api";

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const [connectionStatus, setConnectionStatus] = useState("unknown"); // 'unknown'|'healthy'|'unreachable'
  const [recents, setRecents] = useState([
    {
      id: 1,
      title: "Chat information asked",
      preview: "Recent conversation...",
    },
  ]);
  const [activeChat, setActiveChat] = useState("new");
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const sessionId = useState(() => {
    const stored = localStorage.getItem("sessionId");
    if (stored) return stored;
    const newSession = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    localStorage.setItem("sessionId", newSession);
    return newSession;
  })[0];

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      },
    ]);

    let fullContent = "";

    try {
      console.log("Starting stream...");

      for await (const chunk of chatStream(messageText, sessionId)) {
        console.log("Chunk received:", chunk);

        if (chunk.content) {
          fullContent += chunk.content;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: fullContent } : msg
            )
          );
        }

        if (chunk.done) {
          console.log("Stream complete", fullContent);
          // Finalize message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, isStreaming: false, content: fullContent }
                : msg
            )
          );
          setConnectionStatus("healthy");
          break;
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                id: assistantId,
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
                isStreaming: false,
              }
            : msg
        )
      );
      setConnectionStatus("unreachable");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // run health check first
        const h = await apiHealthCheck();
        if (h?.status === "healthy") setConnectionStatus("healthy");

        const data = await apiGetHistory(sessionId);
        setMessages(data.messages || []);
      } catch (error) {
        console.error("Failed to load history or health check:", error);
        setConnectionStatus("unreachable");
      }
    };
    loadHistory();
  }, [sessionId, API_BASE_URL]);

  const sendMessage = async (e) => {
    e.preventDefault();
    await handleSendMessage(input);
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar
        recents={recents}
        setRecents={setRecents}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
      />

      <div className="flex-1 flex flex-col bg-gradient-to-b from-[#06102A] via-[#0a0f1f] to-black">
        <div className="flex-1 overflow-y-auto px-8 py-12">
          {/* Connection status indicator */}
          <div className="max-w-4xl mx-auto mb-6 flex justify-end items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span
                className={`inline-block w-3 h-3 rounded-full ${
                  connectionStatus === "healthy"
                    ? "bg-green-400"
                    : connectionStatus === "unreachable"
                    ? "bg-red-500"
                    : "bg-yellow-400"
                }`}
                aria-hidden
              />
              <span>
                {connectionStatus === "healthy"
                  ? "Connected"
                  : connectionStatus === "unreachable"
                  ? "Disconnected"
                  : "Checking..."}
              </span>
            </div>
          </div>
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center animate-fade-in">
                <h1 className="text-6xl font-bold text-white mb-4 animate-slide-up">
                  Nyay Mitra
                </h1>
                <p className="text-xl text-[#EFBF04] mb-8 animate-slide-up-delay">
                  "Your Friend of justice"
                </p>
                <p className="text-gray-400 max-w-md animate-slide-up-delay-2">
                  Ask me any legal questions related to Indian law. I can help
                  with the Constitution, Consumer Protection Act, IT Act, and
                  more.
                </p>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-6 py-4 shadow-lg transition-all duration-200 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-[#2323FF] to-[#3A3AFF] text-white"
                      : "bg-gray-800 text-white border border-gray-700"
                  } ${
                    message.isStreaming
                      ? "border-l-4 border-blue-400 ring-2 ring-blue-400/30"
                      : ""
                  }`}
                >
                  {message.isStreaming && !message.content && (
                    <div className="flex items-center space-x-3 py-4">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce [animation-delay:0s]" />
                        <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-blue-300 font-medium">
                        Nyay Mitra is thinking...
                      </span>
                    </div>
                  )}

                  {message.content && (
                    <div>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                              className || ""
                            );
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={dracula}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                  borderRadius: "12px",
                                  margin: "0 -12px",
                                  background: "rgb(12,15,31)",
                                }}
                                {...props}
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code
                                className="bg-[#1a1a2e]/50 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-mono border border-[#EFBF04]/20 inline-block"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>

                      {message.isStreaming && (
                        <div className="mt-3 flex items-center space-x-2 pt-3 border-t border-blue-400/30">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                          <span className="text-xs text-blue-400 font-medium">
                            streaming...
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-800 bg-black/50 backdrop-blur-md px-8 py-6">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Chat Here"
                className="w-full bg-gray-900 border-2 border-[#EFBF04] rounded-full px-6 py-4 pr-32 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EFBF04] transition-all duration-300"
                disabled={isLoading}
              />

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    isListening
                      ? "bg-red-500 animate-pulse"
                      : "hover:bg-gray-800"
                  }`}
                  disabled={isLoading}
                >
                  <Mic
                    className={`h-6 w-6 ${
                      isListening ? "text-white" : "text-[#2323FF]"
                    }`}
                  />
                </Button>

                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2 hover:bg-gray-800 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 text-[#EFBF04] animate-spin" />
                  ) : (
                    <Send className="h-6 w-6 text-[#EFBF04]" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

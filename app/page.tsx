"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./components/DemoComponents";
import { motion, AnimatePresence } from "framer-motion";
import { startUploadProcess } from "../lib/arweave-client";

type Message = {
  id: string;
  text: string;
  sender: "user" | "other" | "system";
  timestamp: Date;
  type: "text" | "image" | "system";
  imageUrl?: string;
  arweaveUrl?: string;
  status?: "uploading" | "success" | "error";
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: `init-${Date.now()}`,
      text: "Welcome to Flowweave Chat! 👋 Type /upload to start uploading images to Arweave via our Telegram bot.",
      sender: "other",
      timestamp: new Date(),
      type: "text",
    },
  ]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Function to generate unique message IDs
  const generateMessageId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleUploadCommand = async () => {
    // Add initial message
    const startMessage: Message = {
      id: generateMessageId(),
      text: "Upload process started!\nSend your image to our Telegram bot: https://t.me/aogen_bot",
      sender: "system",
      timestamp: new Date(),
      type: "system",
    };
    setMessages(prev => [...prev, startMessage]);

    try {
      const arweaveUrl = await startUploadProcess();
      
      // Add success message
      const successMessage: Message = {
        id: generateMessageId(),
        text: `Image uploaded successfully! View on Arweave: ${arweaveUrl}`,
        sender: "system",
        timestamp: new Date(),
        type: "system",
        arweaveUrl,
        status: "success",
      };
      setMessages(prev => [...prev, successMessage]);
    } catch (error) {
      // Add error message
      const errorMessage: Message = {
        id: generateMessageId(),
        text: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: "system",
        timestamp: new Date(),
        type: "system",
        status: "error",
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: generateMessageId(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");

    // Check for /upload command
    if (newMessage.trim().toLowerCase() === "/upload") {
      handleUploadCommand();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle clipboard paste events
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault(); // Prevent default paste behavior
        
        const file = item.getAsFile();
        if (!file) continue;

        // Create a preview URL
        const previewUrl = URL.createObjectURL(file);
        
        // Add image message immediately with preview
        const message: Message = {
          id: generateMessageId(),
          text: "",
          sender: "user",
          timestamp: new Date(),
          type: "image",
          imageUrl: previewUrl,
          status: "uploading",
        };
        setMessages(prev => [...prev, message]);

        try {
          // Start the upload process
          const arweaveUrl = await startUploadProcess();
          
          // Update the message with Arweave URL
          setMessages(prev => prev.map(msg => 
            msg.id === message.id ? {
              ...msg,
              arweaveUrl,
              status: "success",
            } : msg
          ));

          // Add success message
          const successMessage: Message = {
            id: generateMessageId(),
            text: `Image uploaded successfully!\n${arweaveUrl}`,
            sender: "system",
            timestamp: new Date(),
            type: "system",
            arweaveUrl,
            status: "success",
          };
          setMessages(prev => [...prev, successMessage]);
        } catch (error) {
          // Update message with error status
          setMessages(prev => prev.map(msg => 
            msg.id === message.id ? {
              ...msg,
              status: "error",
            } : msg
          ));

          // Add error message
          const errorMessage: Message = {
            id: generateMessageId(),
            text: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            sender: "system",
            timestamp: new Date(),
            type: "system",
            status: "error",
          };
          setMessages(prev => [...prev, errorMessage]);
        }

        // Clean up the preview URL
        URL.revokeObjectURL(previewUrl);
        break; // Only handle the first image
      }
    }
  };

  return (
    <div className="flex flex-col h-screen relative">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: -1 }}
      >
        <source src="/base_bg.mp4" type="video/mp4" />
      </video>
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30" style={{ zIndex: -1 }}></div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.8,
          ease: [0.04, 0.62, 0.23, 0.98],
          delay: 0.2
        }}
        className="bg-black outline-dashed m-2 px-4 py-4 flex items-center justify-center shadow-md rounded-lg hover:rounded-3xl hover:mx-[450px] transition-all duration-500"
      >
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.5
            }}
            className="font-semibold text-2xl text-[var(--text-primary)]"
          >
            Flowweave Chat
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.7
            }}
          >
            Create automations that don't 404.
          </motion.p>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ 
                  opacity: 0,
                  y: 20,
                  scale: 0.9,
                  x: message.sender === "user" ? 20 : -20,
                  filter: "blur(10px)"
                }}
                animate={{ 
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  x: 0,
                  filter: "blur(0px)"
                }}
                exit={{ 
                  opacity: 0,
                  scale: 0.9,
                  filter: "blur(10px)",
                  transition: { duration: 0.3 }
                }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  mass: 0.8,
                  opacity: { duration: 0.5 },
                  filter: { duration: 0.4 }
                }}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <motion.div
                  initial={{ rotate: message.sender === "user" ? 5 : -5 }}
                  animate={{ rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                                  className={`max-w-[80%] rounded-2xl px-4 py-2 backdrop-blur-md backdrop-saturate-150 ${
                  message.type === "system"
                    ? "bg-black/20 text-[var(--text-primary)] italic system-message border-[var(--text-secondary)] border-dashed border"
                    : message.sender === "user"
                    ? "bg-black/20 text-[var(--text-primary)] border-[var(--primary)] border-dashed border"
                    : "bg-black/20 text-[var(--text-primary)] border-[var(--text-primary)] border-dashed border"
                } ${
                  message.status === "error" ? "!border-[var(--error)]" : 
                  message.status === "success" ? "!border-[var(--success)]" : ""
                }`}
              >
                {message.type === "image" && message.imageUrl && (
                  <div className="mb-2 relative">
                    <img
                      src={message.imageUrl}
                      alt="Shared image"
                      className={`rounded-lg max-w-full h-auto ${
                        message.status === "uploading" ? "opacity-50" : ""
                      }`}
                    />
                    {message.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--app-accent)] border-t-transparent"></div>
                      </div>
                    )}
                    {message.arweaveUrl && (
                      <a
                        href={message.arweaveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--app-accent)] hover:underline mt-1 block"
                      >
                        View on Arweave
                      </a>
                    )}
                  </div>
                )}
                {message.text && (
                  <p className={`break-words message-text ${message.status === "uploading" ? "text-[var(--app-foreground-muted)]" : ""}`}>
                    {message.text.split(/(https:\/\/[^\s]+)/).map((part, index) => {
                      if (part.startsWith('https://')) {
                        if (part.includes('arweave.net')) {
                          return (
                            <div key={index} className="mt-2">
                              <a 
                                href={part} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[var(--primary)] hover:text-[var(--primary-hover)] hover:underline transition-colors"
                              >
                                View on Arweave
                              </a>
                              <img 
                                src={part}
                                alt="Arweave content"
                                className="mt-2 rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(part, '_blank')}
                                onError={(e) => {
                                  // Hide image if it fails to load
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        } else if (part.includes('t.me')) {
                          return (
                            <a 
                              key={index}
                              href={part} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[var(--app-accent)] hover:underline"
                            >
                              {part}
                            </a>
                          );
                        }
                      }
                      return part;
                    })}
                  </p>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-[var(--border)] bg-[var(--bubble-system)] backdrop-blur-sm p-4">
        {imagePreview && (
          <div className="mb-4 relative">
            <img
              src={imagePreview}
              alt="Selected image"
              className="max-h-48 rounded-lg object-contain bg-[var(--app-gray)]"
            />
            <button
              onClick={clearImageSelection}
              className="absolute top-2 right-2 bg-black/50 text-[#f2f2f2] rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            onPaste={handlePaste}
            placeholder="Type a message"
            className="flex-1 resize-none rounded-lg bg-[var(--app-gray)] text-[var(--app-foreground)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] min-h-[44px] max-h-32"
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() && !selectedImage}
            className="h-11 px-6"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Messages.css";

function Messages() {
  const { user } = useAuth();

  // Mock initial threads based on standard seed data from proposal
  const [threads] = useState([
    {
      id: 1,
      sender: "Seller Test",
      listing: "Used Laptop (15-inch)",
      lastMessage: "Is the laptop still available?",
      time: "2h ago",
      unread: true,
      initial: "S"
    },
    {
      id: 2,
      sender: "Alex Johnson",
      listing: "Sony WH-1000XM4 Headphones",
      lastMessage: "Would you take $220 for it?",
      time: "Yesterday",
      unread: false,
      initial: "A"
    }
  ]);

  const [activeThread, setActiveThread] = useState(threads[0]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "Seller Test",
      isMe: false,
      text: "Hi! Thanks for reaching out. Yes, the laptop is still available and in great condition.",
      time: "10:14 AM"
    },
    {
      id: 2,
      sender: user?.full_name || "Me",
      isMe: true,
      text: "Great! Does it come with the original charger and box?",
      time: "10:18 AM"
    }
  ]);

  const [inputMsg, setInputMsg] = useState("");

  function handleSendMessage(e) {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: user?.full_name || "Me",
      isMe: true,
      text: inputMsg.trim(),
      time: "Just now"
    };

    setMessages([...messages, newMsg]);
    setInputMsg("");
  }

  return (
    <div className="inbox-page-container">
      <header className="inbox-header">
        <h1 className="inbox-title">Messages &amp; Inbox</h1>
        <p className="inbox-subtitle">
          Negotiate and communicate securely with buyers and sellers.
        </p>
      </header>

      <div className="inbox-card-wrapper">
        {/* Threads List (Mockup 3) */}
        <aside className="threads-sidebar" aria-label="Conversation threads">
          <div className="threads-search-box">
            <input
              type="text"
              placeholder="Search conversations..."
              className="threads-search-input"
            />
          </div>

          <ul className="threads-list">
            {threads.map((thread) => (
              <li
                key={thread.id}
                className={`thread-item ${activeThread?.id === thread.id ? "active" : ""}`}
                onClick={() => setActiveThread(thread)}
              >
                <div className="thread-avatar">{thread.initial}</div>
                <div className="thread-info">
                  <div className="thread-top-row">
                    <h3 className="thread-user-name">{thread.sender}</h3>
                    <span className="thread-time">{thread.time}</span>
                  </div>
                  <p className="thread-listing-tag">📦 {thread.listing}</p>
                  <p className="thread-preview-snippet">{thread.lastMessage}</p>
                </div>
                {thread.unread && <span className="unread-dot" title="Unread message" />}
              </li>
            ))}
          </ul>
        </aside>

        {/* Chat Pane */}
        <section className="chat-pane" aria-label="Chat conversation">
          <div className="chat-header">
            <div className="chat-header-user">
              <div className="avatar-mini" style={{ width: "36px", height: "36px", fontSize: "14px" }}>
                {activeThread?.initial || "U"}
              </div>
              <div>
                <strong>{activeThread?.sender}</strong>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Discussing: <em>{activeThread?.listing}</em>
                </div>
              </div>
            </div>

            <div className="chat-security-badge">
              🔒 End-to-End Encrypted
            </div>
          </div>

          <div className="chat-messages-container">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble ${msg.isMe ? "bubble-sent" : "bubble-received"}`}
              >
                <div>{msg.text}</div>
                <div className="bubble-time">{msg.time}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-bar">
            <input
              type="text"
              placeholder="Write a message..."
              className="chat-text-input"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
            />
            <button type="submit" className="chat-send-btn">
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Messages;
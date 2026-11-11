import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { getImageUrl } from "../services/api";
import "./Messages.css";

function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeThreadData, setActiveThreadData] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState("");

  const [inputMsg, setInputMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef(null);

  // 1. Fetch user inbox threads on mount
  useEffect(() => {
    async function fetchInbox() {
      try {
        setLoadingInbox(true);
        setError("");
        const res = await api.get("/messages/inbox");
        if (res.data.success) {
          const list = res.data.threads || [];
          setThreads(list);

          // Check if threadId or listingId is specified in URL query params
          const paramThreadId = searchParams.get("threadId");
          const paramListingId = searchParams.get("listingId");

          if (paramThreadId) {
            setActiveThreadId(Number(paramThreadId));
          } else if (paramListingId) {
            // Check if thread exists for this listing
            const match = list.find(
              (t) => String(t.listing?.listing_id) === String(paramListingId)
            );
            if (match) {
              setActiveThreadId(match.thread_id);
            } else if (list.length > 0) {
              setActiveThreadId(list[0].thread_id);
            }
          } else if (list.length > 0) {
            setActiveThreadId(list[0].thread_id);
          }
        }
      } catch (err) {
        console.error("Fetch inbox error:", err);
        setError(
          err.response?.data?.message || "Unable to load conversations. Please refresh."
        );
      } finally {
        setLoadingInbox(false);
      }
    }

    fetchInbox();
  }, [searchParams]);

  // 2. Fetch messages whenever activeThreadId changes
  useEffect(() => {
    if (!activeThreadId) {
      setActiveThreadData(null);
      setMessages([]);
      return;
    }

    async function fetchThreadMessages() {
      try {
        setLoadingMessages(true);
        const res = await api.get(`/messages/threads/${activeThreadId}`);
        if (res.data.success) {
          setActiveThreadData(res.data.thread);
          setMessages(res.data.messages || []);
        }
      } catch (err) {
        console.error("Fetch thread messages error:", err);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchThreadMessages();
  }, [activeThreadId]);

  // 3. Auto-scroll to bottom on messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Send message / reply handler
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputMsg.trim() || sendingReply || !activeThreadId) return;

    const textToSend = inputMsg.trim();
    setInputMsg("");
    setSendingReply(true);

    try {
      const res = await api.post(`/messages/threads/${activeThreadId}`, {
        content: textToSend
      });

      if (res.data.success && res.data.messageRecord) {
        const newMsg = {
          message_id: res.data.messageRecord.message_id,
          thread_id: activeThreadId,
          sender_user_id: user?.user_id,
          sender_name: user?.full_name || "Me",
          text: textToSend,
          sent_at: res.data.messageRecord.sent_at || new Date().toISOString(),
          is_mine: true
        };

        setMessages((prev) => [...prev, newMsg]);

        // Update last message snippet in threads list
        setThreads((prevThreads) =>
          prevThreads.map((t) => {
            if (t.thread_id === activeThreadId) {
              return {
                ...t,
                last_message: {
                  text: textToSend,
                  sent_at: new Date().toISOString(),
                  is_mine: true
                }
              };
            }
            return t;
          })
        );
      }
    } catch (err) {
      console.error("Send reply error:", err);
      // restore text on failure
      setInputMsg(textToSend);
      alert(err.response?.data?.message || "Failed to send message. Please try again.");
    } finally {
      setSendingReply(false);
    }
  }

  // Filter threads by search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(
      (t) =>
        t.other_user?.full_name?.toLowerCase().includes(q) ||
        t.listing?.title?.toLowerCase().includes(q) ||
        t.last_message?.text?.toLowerCase().includes(q)
    );
  }, [threads, searchQuery]);

  function formatTime(isoString) {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  function formatChatTime(isoString) {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  return (
    <div className="inbox-page-container">
      <header className="inbox-header">
        <h1 className="inbox-title">Messages &amp; Inbox</h1>
        <p className="inbox-subtitle">
          Negotiate and communicate securely with buyers and sellers.
        </p>
      </header>

      {error && (
        <div
          id="inbox-error-banner"
          className="auth-alert-banner auth-alert-error"
          style={{ marginBottom: "20px" }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className="inbox-card-wrapper">
        {/* Threads List Sidebar (Mockup 3 & Req 5.3) */}
        <aside className="threads-sidebar" aria-label="Conversation threads">
          <div className="threads-search-box">
            <input
              id="threads-search-input"
              type="text"
              placeholder="Search conversations..."
              className="threads-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loadingInbox ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
              Loading inbox...
            </div>
          ) : filteredThreads.length === 0 ? (
            <div
              id="inbox-empty-message"
              style={{
                padding: "36px 20px",
                textAlign: "center",
                color: "var(--text-muted)"
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "10px" }}>💬</div>
              <strong>No conversations found</strong>
              <p style={{ fontSize: "13px", margin: "6px 0 16px" }}>
                {searchQuery
                  ? "No messages match your search filter."
                  : "When you contact a seller or receive an inquiry, threads will appear here."}
              </p>
              <Link to="/listings" className="btn-secondary-hero" style={{ fontSize: "13px" }}>
                Explore Marketplace
              </Link>
            </div>
          ) : (
            <ul id="inbox-threads-list" className="threads-list">
              {filteredThreads.map((thread) => {
                const isSelected = activeThreadId === thread.thread_id;
                const otherInitial =
                  thread.other_user?.full_name?.charAt(0).toUpperCase() || "U";

                return (
                  <li
                    key={thread.thread_id}
                    id={`thread-item-${thread.thread_id}`}
                    className={`thread-item ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      setActiveThreadId(thread.thread_id);
                      setSearchParams({ threadId: String(thread.thread_id) });
                    }}
                  >
                    <div className="thread-avatar">{otherInitial}</div>
                    <div className="thread-info">
                      <div className="thread-top-row">
                        <h3 className="thread-user-name">
                          {thread.other_user?.full_name}
                        </h3>
                        <span className="thread-time">
                          {formatTime(thread.last_message?.sent_at || thread.created_at)}
                        </span>
                      </div>
                      <p className="thread-listing-tag">
                        📦 {thread.listing?.title} (${Number(thread.listing?.price || 0).toFixed(2)})
                      </p>
                      <p className="thread-preview-snippet">
                        {thread.last_message
                          ? `${thread.last_message.is_mine ? "You: " : ""}${thread.last_message.text}`
                          : "No messages yet"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Chat Conversation Pane (Req 5.4) */}
        <section className="chat-pane" aria-label="Chat conversation">
          {activeThreadData ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-user">
                  <div
                    className="avatar-mini"
                    style={{
                      width: "40px",
                      height: "40px",
                      fontSize: "15px",
                      background: "var(--primary-gradient)",
                      color: "#fff",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700
                    }}
                  >
                    {activeThreadData.other_user?.full_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <strong id="active-thread-title" style={{ fontSize: "16px" }}>
                      {activeThreadData.other_user?.full_name}
                    </strong>
                    <div
                      id="active-thread-listing"
                      style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}
                    >
                      Discussing:{" "}
                      <Link
                        to={`/listings/${activeThreadData.listing?.listing_id}`}
                        style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}
                      >
                        {activeThreadData.listing?.title} (${Number(activeThreadData.listing?.price || 0).toFixed(2)}) →
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="chat-security-badge" title="Stored with AES-256 encryption in PostgreSQL">
                  🔒 Encrypted Chat
                </div>
              </div>

              {/* Chat Messages */}
              <div id="chat-messages-container" className="chat-messages-container">
                {loadingMessages ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No messages in this conversation yet. Send the first message below!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.message_id}
                      className={`chat-bubble ${msg.is_mine ? "bubble-sent" : "bubble-received"}`}
                    >
                      <div className="bubble-text">{msg.text}</div>
                      <div className="bubble-time">{formatChatTime(msg.sent_at)}</div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Reply Input Bar */}
              <form onSubmit={handleSendMessage} className="chat-input-bar">
                <input
                  id="chat-message-input"
                  type="text"
                  placeholder="Write a message to seller or buyer..."
                  className="chat-text-input"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  disabled={sendingReply}
                  autoComplete="off"
                />
                <button
                  id="chat-send-btn"
                  type="submit"
                  className="chat-send-btn"
                  disabled={!inputMsg.trim() || sendingReply}
                >
                  {sendingReply ? "..." : "Send"}
                </button>
              </form>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "40px",
                color: "var(--text-muted)"
              }}
            >
              <div style={{ fontSize: "44px", marginBottom: "12px" }}>📬</div>
              <h3>Select a Conversation</h3>
              <p style={{ fontSize: "14px", marginTop: "4px" }}>
                Choose a thread from the list on the left to view messages.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Messages;

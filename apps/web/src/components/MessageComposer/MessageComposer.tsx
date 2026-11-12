import { useState, type FormEvent } from "react";
import styles from "./MessageComposer.module.css";

interface MessageComposerProps {
  onSendMessage: (message: string) => void;
}

export function MessageComposer({ onSendMessage }: MessageComposerProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    onSendMessage(text);
    setMessage("");
  };

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <label className={styles.inputLabel} htmlFor="chat-message">
        Message
      </label>
      <input
        id="chat-message"
        name="input"
        type="text"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Send a message..."
        className={styles.input}
        autoComplete="off"
      />
      <button type="submit" className={styles.sendButton}>
        Send
      </button>
    </form>
  );
}

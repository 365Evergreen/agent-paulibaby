import { useEffect, useRef } from "react";
import type { ChatMessage } from "../MessageBubble/MessageBubble";
import { MessageBubble } from "../MessageBubble/MessageBubble";
import styles from "./MessageList.module.css";

interface MessageListProps {
  messages: readonly ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const listRef = useRef<HTMLElement>(null);
  const shouldFollowLatest = useRef(true);

  useEffect(() => {
    const list = listRef.current;
    if (list && shouldFollowLatest.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const list = listRef.current;
    if (list) {
      shouldFollowLatest.current =
        list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    }
  };

  return (
    <section
      ref={listRef}
      className={styles.list}
      role="log"
      aria-label="Conversation"
      tabIndex={0}
      onScroll={handleScroll}
    >
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </section>
  );
}

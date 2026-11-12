import styles from "./MessageBubble.module.css";

export interface ChatMessage {
  id: string;
  role: string;
  parts: { type: string; text?: string }[];
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const className = isUser
    ? `${styles.bubble} ${styles.userBubble}`
    : `${styles.bubble} ${styles.assistantBubble}`;

  return (
    <article className={className} aria-label={`${message.role} message`}>
      <span className={styles.role}>{message.role}</span>
      <div className={styles.content}>
        {message.parts.map((part, index) =>
          part.type === "text" ? (
            <span key={`${message.id}:${index}`}>{part.text}</span>
          ) : null,
        )}
      </div>
    </article>
  );
}

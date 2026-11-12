import styles from "./ChatHeader.module.css";

interface ChatHeaderProps {
  status: string;
}

export function ChatHeader({ status }: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Paulibaby</h1>
      <span className={styles.status} role="status" aria-live="polite">
        <span className={styles.statusDot} aria-hidden="true" />
        {status}
      </span>
    </header>
  );
}

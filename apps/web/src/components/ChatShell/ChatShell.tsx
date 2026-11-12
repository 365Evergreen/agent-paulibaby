import type { ReactNode } from "react";
import styles from "./ChatShell.module.css";

interface ChatShellProps {
  children: ReactNode;
}

export function ChatShell({ children }: ChatShellProps) {
  return <main className={styles.shell}>{children}</main>;
}

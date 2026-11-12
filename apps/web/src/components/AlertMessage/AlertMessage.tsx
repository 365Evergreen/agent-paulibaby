import type { ReactNode } from "react";
import styles from "./AlertMessage.module.css";

interface AlertMessageProps {
  children: ReactNode;
}

export function AlertMessage({ children }: AlertMessageProps) {
  return (
    <p className={styles.alert} role="alert">
      {children}
    </p>
  );
}

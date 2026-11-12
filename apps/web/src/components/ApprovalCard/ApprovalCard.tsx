import type { PendingApproval } from "@agent-paulibaby/contracts";
import styles from "./ApprovalCard.module.css";

interface ApprovalCardProps {
  approval: PendingApproval;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.details}>
        <h3 className={styles.operation}>
          {approval.connector}.{approval.method}
        </h3>
        <details className={styles.argumentsDetails}>
          <summary className={styles.summary}>Review arguments</summary>
          <pre className={styles.arguments}>
            {JSON.stringify(approval.args, null, 2)}
          </pre>
        </details>
      </div>
      <div className={styles.actions}>
        <button className={styles.approveButton} onClick={onApprove}>
          Approve
        </button>
        <button className={styles.rejectButton} onClick={onReject}>
          Reject
        </button>
      </div>
    </article>
  );
}

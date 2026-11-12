import type { PendingApproval } from "@agent-paulibaby/contracts";
import { ApprovalCard } from "../ApprovalCard/ApprovalCard";
import styles from "./ApprovalPanel.module.css";

interface ApprovalPanelProps {
  approvals: PendingApproval[];
  onApprove: (approval: PendingApproval) => void;
  onReject: (approval: PendingApproval) => void;
}

export function ApprovalPanel({
  approvals,
  onApprove,
  onReject,
}: ApprovalPanelProps) {
  if (approvals.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby="approval-heading">
      <h2 className={styles.title} id="approval-heading">
        Pending approvals
      </h2>
      <div className={styles.items}>
        {approvals.map((approval) => (
          <ApprovalCard
            key={`${approval.executionId}:${approval.seq}`}
            approval={approval}
            onApprove={() => onApprove(approval)}
            onReject={() => onReject(approval)}
          />
        ))}
      </div>
    </section>
  );
}

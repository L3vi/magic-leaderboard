import React, { ReactNode } from "react";
import PageShell from "../PageShell/PageShell";

interface DetailsPageShellProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onEdit?: () => void;
  loading?: boolean;
  error?: string;
}

/**
 * Detail/view page scaffold. Thin wrapper over the shared PageShell that adds
 * the "✎ Edit" top-right action and uses flush (unpadded) content so detail
 * components control their own spacing.
 */
const DetailsPageShell: React.FC<DetailsPageShellProps> = ({
  title,
  children,
  onClose,
  onEdit,
  loading = false,
  error,
}) => (
  <PageShell
    title={title}
    onClose={onClose}
    contentVariant="flush"
    loading={loading}
    error={error}
    headerAction={
      onEdit && (
        <button className="btn btn-tertiary" onClick={onEdit} aria-label="Edit">
          ✎ Edit
        </button>
      )
    }
  >
    {children}
  </PageShell>
);

export default DetailsPageShell;

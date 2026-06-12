import React, { ReactNode } from "react";
import PageShell from "../PageShell/PageShell";

interface DetailsPageShellProps {
  title: string;
  /** Optional: not rendered while `loading` or `error` is shown. */
  children?: ReactNode;
  onClose: () => void;
  onEdit?: () => void;
  loading?: boolean;
  error?: string;
  /** Optional faded art shown behind the page (see PageShell). */
  backdropImage?: string;
  /** Optional accent color blended into the backdrop overlay. */
  backdropTint?: string;
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
  backdropImage,
  backdropTint,
}) => (
  <PageShell
    title={title}
    onClose={onClose}
    contentVariant="flush"
    loading={loading}
    error={error}
    backdropImage={backdropImage}
    backdropTint={backdropTint}
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

import React from "react";
import "./FormActions.css";

interface FormActionsProps {
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isDisabled?: boolean;
  submitType?: "button" | "submit";
  loadingText?: string;
  variant?: "form" | "fixed"; // "form" for sticky bottom, "fixed" for fixed position
}

const FormActions: React.FC<FormActionsProps> = ({
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  onCancel,
  onSubmit,
  isSubmitting = false,
  isDisabled = false,
  submitType = "submit",
  loadingText,
  variant = "form",
}) => {
  return (
    <div className={`form-actions form-actions-${variant}`}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={isSubmitting || isDisabled}
          aria-label={cancelLabel}
        >
          {cancelLabel}
        </button>
      )}
      <button
        type={submitType}
        onClick={submitType === "button" ? onSubmit : undefined}
        className="btn btn-primary"
        disabled={isSubmitting || isDisabled}
        aria-label={submitLabel}
      >
        {isSubmitting ? (
          <>
            <span className="spinner"></span>
            {loadingText || submitLabel}
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
};

export default FormActions;

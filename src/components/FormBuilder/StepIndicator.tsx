/**
 * StepIndicator — Renders a horizontal step progress bar for multi-step forms.
 *
 * Shows numbered circles with labels connected by lines.
 * Current step: indigo highlight. Completed steps: green with checkmark.
 * Future steps: gray.
 *
 * Requirements: 2.2
 */

export interface StepIndicatorProps {
  /** Step labels displayed below each step circle */
  steps: string[];
  /** Zero-based index of the currently active step */
  currentStep: number;
  /** Array of zero-based step indices that have been completed */
  completedSteps: number[];
}

export function StepIndicator({ steps, currentStep, completedSteps }: StepIndicatorProps) {
  return (
    <nav aria-label="Form steps" className="mb-8">
      <ol className="flex items-center w-full">
        {steps.map((label, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          return (
            <li
              key={index}
              className={`flex items-center ${
                index < steps.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-success-main border-success-main text-success-contrast'
                      : isCurrent
                      ? 'bg-primary-main border-primary-main text-primary-contrast'
                      : 'bg-surface-paper border-grey-500/30 text-ink-secondary'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {/* Step label */}
                <span
                  className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                    isCompleted
                      ? 'text-success-dark'
                      : isCurrent
                      ? 'text-primary-main'
                      : 'text-ink-secondary'
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Connecting line between steps */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    completedSteps.includes(index)
                      ? 'bg-success-main'
                      : isCurrent
                      ? 'bg-primary-main/20'
                      : 'bg-surface-neutral'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

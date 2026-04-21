export const tv = {
  bg: {
    base: "var(--theme-bg-base)",
    surface: "var(--theme-bg-surface)",
    elevated: "var(--theme-bg-elevated)",
    overlay: "var(--theme-bg-overlay)",
  },
  text: {
    primary: "var(--theme-text-primary)",
    secondary: "var(--theme-text-secondary)",
    muted: "var(--theme-text-muted)",
    inverse: "var(--theme-text-inverse)",
  },
  interactive: {
    primary: {
      DEFAULT: "var(--theme-interactive-primary)",
      muted: "var(--theme-interactive-primary-muted)",
      subtle: "var(--theme-interactive-primary-subtle)",
    },
    secondary: {
      DEFAULT: "var(--theme-interactive-secondary)",
      muted: "var(--theme-interactive-secondary-muted)",
      subtle: "var(--theme-interactive-secondary-subtle)",
    },
    accent: {
      DEFAULT: "var(--theme-interactive-accent)",
      muted: "var(--theme-interactive-accent-muted)",
      subtle: "var(--theme-interactive-accent-subtle)",
    },
  },
  status: {
    success: {
      DEFAULT: "var(--theme-status-success)",
      muted: "var(--theme-status-success-muted)",
      subtle: "var(--theme-status-success-subtle)",
    },
    error: {
      DEFAULT: "var(--theme-status-error)",
      muted: "var(--theme-status-error-muted)",
      subtle: "var(--theme-status-error-subtle)",
    },
    warning: {
      DEFAULT: "var(--theme-status-warning)",
      muted: "var(--theme-status-warning-muted)",
      subtle: "var(--theme-status-warning-subtle)",
    },
  },
  border: {
    default: "var(--theme-border-default)",
    subtle: "var(--theme-border-subtle)",
    focus: "var(--theme-border-focus)",
  },
  typing: {
    cursor: "var(--theme-typing-cursor)",
    cursorGhost: "var(--theme-typing-cursor-ghost)",
    correct: "var(--theme-typing-correct)",
    incorrect: "var(--theme-typing-incorrect)",
    upcoming: "var(--theme-typing-upcoming)",
    default: "var(--theme-typing-default)",
  },
} as const;

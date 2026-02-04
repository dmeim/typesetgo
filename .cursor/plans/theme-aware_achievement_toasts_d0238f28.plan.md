---
name: Theme-Aware Achievement Toasts
overview: Modify the achievement toast notifications to use the user's selected theme colors for the background instead of the default green "success" color from sonner's richColors, while preserving the tier-colored left border.
todos:
  - id: update-toast-style
    content: Update showAchievementToasts in TypingPractice.tsx to apply theme.surfaceColor as background and theme.correctText as text color
    status: completed
isProject: false
---

# Theme-Aware Achievement Toasts

## Problem

The achievement toasts currently show a greenish background color because:

1. The `Toaster` in [main.tsx](src/main.tsx) uses the `richColors` prop, which applies colored backgrounds to different toast types
2. Achievement toasts use `toast.success()`, which gets a green background from `richColors`
3. The tier color (copper/silver/gold/diamond/emerald) is correctly applied as a left border, but the background doesn't match the user's theme

## Solution

Override the toast background styling for achievement toasts to use the theme's `surfaceColor` instead of the default green. Since the theme is already available in the `TypingPractice.tsx` component where toasts are triggered, we can pass theme colors directly via the `style` prop.

## Implementation

### File: [src/components/typing/TypingPractice.tsx](src/components/typing/TypingPractice.tsx)

Update the `showAchievementToasts` function (around line 806-840) to include theme-based background styling:

```typescript
toast.success(achievement.title, {
  description: achievement.description,
  icon: <span style={{ fontSize: "1.25rem" }}>{achievement.icon}</span>,
  duration: 5000,
  style: {
    borderLeft: `4px solid ${tierColor}`,
    backgroundColor: theme.surfaceColor,  // NEW: Use theme surface color
    color: theme.correctText,              // NEW: Use theme text color
    borderColor: `${tierColor}40`,         // NEW: Subtle border
  },
  descriptionClassName: "!text-current opacity-70", // NEW: Description styling
  action: {
    label: "Ok",
    onClick: () => {},
  },
});
```

This approach:

- Keeps the tier-colored left border (copper/silver/gold/diamond/emerald)
- Uses the theme's `surfaceColor` for the toast background (matches cards/modals)
- Uses the theme's text color for consistent readability
- Works with any theme the user selects


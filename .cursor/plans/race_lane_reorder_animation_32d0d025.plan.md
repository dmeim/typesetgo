---
name: Race Lane Reorder Animation
overview: Add smooth layout animations to the race lanes so they animate into their new positions when racers change order based on progress.
todos:
  - id: install-framer-motion
    content: Install framer-motion package
    status: completed
  - id: update-racecourse
    content: Add motion.div layout animations to RaceCourse.tsx race lanes
    status: completed
isProject: false
---

# Race Lane Real-Time Sorting Animation

## Current State

The `[RaceCourse.tsx](src/components/race/RaceCourse.tsx)` component already sorts racers by progress (lines 36-47) and renders them in sorted order. However, when positions change, lanes snap instantly rather than animating smoothly.

```35:47:src/components/race/RaceCourse.tsx
  // Sort racers by progress (descending) for position labels
  const sortedRacers = useMemo(() => {
    return [...racers].sort((a, b) => {
      // Finished racers first, by position
      if (a.isFinished && !b.isFinished) return -1;
      if (!a.isFinished && b.isFinished) return 1;
      if (a.isFinished && b.isFinished) {
        return (a.position || 0) - (b.position || 0);
      }
      // Then by progress
      return b.progress - a.progress;
    });
  }, [racers]);
```

## Implementation

### 1. Install framer-motion

```bash
bun add framer-motion
```

### 2. Update RaceCourse.tsx

Wrap each race lane in a `motion.div` with the `layout` prop to enable automatic layout animations when positions change:

```tsx
import { motion, LayoutGroup } from "framer-motion";

// Wrap the lanes container
<LayoutGroup>
  <div className="flex-1 flex flex-col gap-3">
    {racersWithPositions.map((racer) => (
      <motion.div
        key={racer.sessionId}
        layout
        layoutId={racer.sessionId}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        className="relative flex items-center gap-3 min-h-[60px]"
      >
        {/* ... existing lane content ... */}
      </motion.div>
    ))}
  </div>
</LayoutGroup>
```

Key changes:

- Import `motion` and `LayoutGroup` from framer-motion
- Wrap lanes in `<LayoutGroup>` for coordinated animations
- Change the lane wrapper from `<div>` to `<motion.div>`
- Add `layout` prop to enable layout animations
- Add `layoutId` for identity tracking across renders
- Use a spring transition for natural-feeling movement

### Animation Tuning

The spring config (`stiffness: 500, damping: 40`) provides:

- Fast response when positions change
- Smooth deceleration without bounce
- Can be adjusted if feeling too fast/slow


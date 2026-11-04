import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// Slow machines can take over a second to get through an animation, and Workers Builds won't publish unless this
// suite passes, so waits get far longer than Testing Library's one-second default. A passing wait still ends as soon as it can.
configure({ asyncUtilTimeout: 10_000 });

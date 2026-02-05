// src/lib/race-emojis.ts
// Curated list of racing/character emojis for race participants

export const RACE_EMOJIS = [
  // Vehicles & Speed
  "🏎️", // racing car
  "🚀", // rocket
  "✈️", // airplane
  "🛩️", // small airplane
  "🚁", // helicopter
  "🏍️", // motorcycle
  "🚲", // bicycle
  "🛴", // scooter

  // Animals
  "🐆", // leopard (fast)
  "🐎", // horse
  "🦅", // eagle
  "🐇", // rabbit
  "🐕", // dog
  "🦊", // fox
  "🐺", // wolf
  "🦁", // lion

  // Elements & Effects
  "⚡", // lightning
  "🔥", // fire
  "💨", // wind/speed
  "🌪️", // tornado
  "☄️", // comet
  "💫", // dizzy star
  "✨", // sparkles
  "🌟", // star

  // Characters & Actions
  "🏃", // runner
  "🧙", // wizard
  "🦸", // superhero
  "🥷", // ninja
  "👾", // alien
  "🤖", // robot
  "👻", // ghost
  "🎯", // target/bullseye
];

// Get a random emoji from the list
export function getRandomRaceEmoji(): string {
  return RACE_EMOJIS[Math.floor(Math.random() * RACE_EMOJIS.length)];
}

// Validate that an emoji is in the curated list
export function isValidRaceEmoji(emoji: string): boolean {
  return RACE_EMOJIS.includes(emoji);
}

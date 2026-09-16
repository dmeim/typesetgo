// All durable browser suites use installed Chrome unless explicitly overridden.
export function browserOptions(env = process.env) {
  const executablePath = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  return executablePath
    ? { headless: true, executablePath }
    : { headless: true, channel: env.PLAYWRIGHT_CHANNEL ?? "chrome" };
}

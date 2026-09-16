export default function Practice({
  lockedSettings,
  isTestActive,
  onLeave,
}: {
  lockedSettings: Record<string, unknown>;
  isTestActive: boolean;
  onLeave: () => void;
}) {
  return (
    <main>
      <h1>Isolated participant executor fixture</h1>
      <p>{isTestActive ? "Active" : "Waiting"}</p>
      <pre>{JSON.stringify(lockedSettings, null, 2)}</pre>
      <button onClick={onLeave}>Leave room</button>
    </main>
  );
}

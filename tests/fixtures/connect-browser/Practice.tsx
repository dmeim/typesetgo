export default function Practice({
  lockedSettings,
  isTestActive,
}: {
  lockedSettings: Record<string, unknown>;
  isTestActive: boolean;
}) {
  return (
    <main>
      <h1>Isolated participant executor fixture</h1>
      <p>{isTestActive ? "Active" : "Waiting"}</p>
      <pre>{JSON.stringify(lockedSettings, null, 2)}</pre>
    </main>
  );
}

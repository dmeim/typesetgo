import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { HostParticipant, HostRoom } from "@/components/connect/types";
import type { ConnectTest } from "@/lib/connect-types";
import { HostHeader } from "./HostHeader";
import { OverridesPanel } from "./OverridesPanel";
import { ParticipantsSection } from "./ParticipantsSection";
import { RunControls } from "./RunControls";
import { TestEditor } from "./TestEditor";
import { TestList } from "./TestList";
import { useHostRoom } from "./use-host-room";

export function HostPanel({ room, participants }: { room: HostRoom; participants: HostParticipant[] }) {
  const navigate = useNavigate();
  const actions = useHostRoom(room);
  const { tests, saveTests } = actions;
  const [editingId, setEditingId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editing = tests.find((test) => test.id === editingId) ?? null;

  const startEditing = (test: ConnectTest) => {
    setEditingId(test.id);
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      editorRef.current?.querySelector<HTMLElement>("[role=radio][aria-checked=true]")?.focus();
    });
  };

  const submitTest = async (test: ConnectTest) => {
    if (!editing) return saveTests([...tests, test]);
    const ok = await saveTests(tests.map((item) => (item.id === test.id ? test : item)));
    if (ok) setEditingId(null);
    return ok;
  };

  return (
    <div className="space-y-6">
      <HostHeader
        room={room}
        onRename={actions.rename}
        renaming={actions.busy === "rename"}
        ending={actions.busy === "end"}
        onEnd={() => void actions.endRoom().then((ok) => { if (ok) navigate("/connect"); })}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <RunControls room={room} tests={tests} participants={participants} actions={actions} />
          <TestList
            room={room}
            tests={tests}
            participants={participants}
            editingId={editing?.id ?? null}
            onEdit={startEditing}
            onSave={(next) => {
              if (editingId && !next.some((test) => test.id === editingId)) setEditingId(null);
              void saveTests(next);
            }}
          />
          <div ref={editorRef}>
            <TestEditor
              key={editing?.id ?? "new"}
              editing={editing}
              testCount={tests.length}
              onSubmit={submitTest}
              onCancel={() => setEditingId(null)}
            />
          </div>
        </div>
        <OverridesPanel overrides={actions.overrides} onChange={actions.changeOverrides} />
      </div>
      <ParticipantsSection room={room} participants={participants} actions={actions} />
    </div>
  );
}

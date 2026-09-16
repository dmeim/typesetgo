import { useReducedMotion } from "framer-motion";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { PlanKeyboardSensor } from "./PlanKeyboardSensor";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { Plan, PlanItem } from "@/types/plan";
import { tv } from "@/lib/theme-vars";
import PracticeSettings from "@/components/connect/PracticeSettings";
import { RoomButton, RoomDialog } from "@/components/connect/RoomUI";
import { fieldClass, fieldStyle, panelStyle } from "@/components/connect/room-styles";

interface PlanBuilderModalProps {
  initialPlan?: Plan;
  onSave: (plan: Plan) => void;
  onClose: () => void;
  isConnectMode?: boolean;
}

function SortableStep({
  item,
  index,
  selected,
  onSelect,
  onRemove,
  onMove,
  total,
}: {
  item: PlanItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMove: (direction: number) => void;
  total: number;
}) {
  const reducedMotion = useReducedMotion();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      className="min-w-0 rounded-lg border p-2"
      style={{
        ...panelStyle,
        borderColor: selected ? tv.ui.primary : tv.ui.border,
        transform: CSS.Transform.toString(transform),
        transition: reducedMotion ? undefined : transition,
      }}
    >
      <div className="flex min-w-0 items-start gap-1">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder step ${index + 1}`}
          className="min-h-10 min-w-10 touch-none cursor-grab rounded focus-visible:outline-2"
        >
          <GripVertical className="mx-auto size-4" />
        </button>
        <button
          onClick={onSelect}
          aria-pressed={selected}
          className="min-w-0 flex-1 rounded p-2 text-left focus-visible:outline-2"
        >
          <span className="block break-words font-medium">
            {index + 1}. {item.metadata.title || "Untitled step"}
          </span>
          <span
            className="block break-words text-sm"
            style={{ color: tv.ui.mutedForeground }}
          >
            {item.mode} · {item.metadata.subtitle || "No subtitle"}
          </span>
        </button>
      </div>
      <div className="flex flex-wrap justify-end gap-1">
        <RoomButton
          disabled={index === 0}
          aria-label={`Move step ${index + 1} up`}
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="size-4" />
        </RoomButton>
        <RoomButton
          disabled={index === total - 1}
          aria-label={`Move step ${index + 1} down`}
          onClick={() => onMove(1)}
        >
          <ArrowDown className="size-4" />
        </RoomButton>
        <RoomButton aria-label={`Remove step ${index + 1}`} onClick={onRemove}>
          <Trash2 className="size-4" />
        </RoomButton>
      </div>
    </li>
  );
}

export default function PlanBuilderModal({
  initialPlan = [],
  onSave,
  onClose,
  isConnectMode = false,
}: PlanBuilderModalProps) {
  const [items, setItems] = useState<Plan>(() =>
    structuredClone(initialPlan).filter(
      (item) => item?.id && item.mode !== "plan",
    ),
  );
  const [selectedId, setSelectedId] = useState(initialPlan[0]?.id ?? "");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const selectedItem = items.find((item) => item.id === selectedId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(PlanKeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const addStep = () => {
    const item: PlanItem = {
      id: crypto.randomUUID(),
      mode: "time",
      settings: {
        mode: "time",
        duration: 30,
        wordTarget: 25,
        difficulty: "medium",
        quoteLength: "all",
        presetModeType: "finish",
        presetText: "",
        capitalization: false,
        punctuation: false,
        numbers: false,
      },
      metadata: { title: `Step ${items.length + 1}`, subtitle: "" },
      syncSettings: { waitForAll: false, zenWaiting: false },
    };
    setItems((current) => [...current, item]);
    setSelectedId(item.id);
    setError("");
  };
  const updateItem = (updates: Partial<PlanItem>) =>
    setItems((current) =>
      current.map((item) =>
        item.id === selectedId ? { ...item, ...updates } : item,
      ),
    );
  const move = (id: string, direction: number) =>
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      return arrayMove(
        current,
        index,
        Math.max(0, Math.min(current.length - 1, index + direction)),
      );
    });
  const dragEnd = ({ active, over }: DragEndEvent) => {
    setIsDragging(false);
    if (over && active.id !== over.id)
      setItems((current) =>
        arrayMove(
          current,
          current.findIndex((item) => item.id === active.id),
          current.findIndex((item) => item.id === over.id),
        ),
      );
  };
  const save = () => {
    const invalid = items.find(
      (item) => item.mode === "preset" && !item.settings.presetText?.trim(),
    );
    if (invalid) {
      setSelectedId(invalid.id);
      setError("Add custom text to each preset step before saving.");
      return;
    }
    onSave(
      items.map((item) => ({
        ...item,
        syncSettings: { waitForAll: false, zenWaiting: false },
      })),
    );
    onClose();
  };
  return (
    <RoomDialog
      open
      onClose={onClose}
      onEscapeKeyDown={(event) => {
        // The active drag gets the first Escape; a later Escape dismisses the editor.
        if (isDragging) event.preventDefault();
      }}
      title="Plan builder"
      description={
        isConnectMode
          ? "Build a host-led sequence. Save your plan, then start each step from the host panel."
          : "Build a sequence of practice steps."
      }
      wide
      footer={
        <footer className="flex flex-wrap justify-end gap-3">
          <RoomButton onClick={onClose}>Cancel</RoomButton>
          <RoomButton selected disabled={!items.length} onClick={save}>
            {isConnectMode ? "Save plan" : "Start plan"}
          </RoomButton>
        </footer>
      }
    >
      <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="min-w-0 space-y-3" aria-label="Plan steps">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Steps ({items.length})</h2>
            <RoomButton onClick={addStep}>Add step</RoomButton>
          </div>
          {!items.length && (
            <p
              className="py-5 text-sm"
              style={{ color: tv.ui.mutedForeground }}
            >
              Add a step to begin.
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setIsDragging(true)}
            onDragCancel={() => setIsDragging(false)}
            onDragEnd={dragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="space-y-2">
                {items.map((item, index) => (
                  <SortableStep
                    key={item.id}
                    item={item}
                    index={index}
                    selected={item.id === selectedId}
                    total={items.length}
                    onSelect={() => setSelectedId(item.id)}
                    onMove={(direction) => move(item.id, direction)}
                    onRemove={() => {
                      setItems((current) =>
                        current.filter((entry) => entry.id !== item.id),
                      );
                      if (selectedId === item.id)
                        setSelectedId(
                          items[index + 1]?.id ?? items[index - 1]?.id ?? "",
                        );
                    }}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </section>
        <section
          className="min-w-0 space-y-5 rounded-lg border p-3 sm:p-4"
          style={panelStyle}
          aria-label="Step configuration"
        >
          {selectedItem ? (
            <>
              <h2 className="font-medium">Step configuration</h2>
              <label className="block space-y-2 text-sm">
                Title
                <input
                  className={fieldClass}
                  style={fieldStyle}
                  value={selectedItem.metadata.title}
                  maxLength={100}
                  onChange={(event) =>
                    updateItem({
                      metadata: {
                        ...selectedItem.metadata,
                        title: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="block space-y-2 text-sm">
                Subtitle
                <input
                  className={fieldClass}
                  style={fieldStyle}
                  value={selectedItem.metadata.subtitle}
                  maxLength={200}
                  onChange={(event) =>
                    updateItem({
                      metadata: {
                        ...selectedItem.metadata,
                        subtitle: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <PracticeSettings
                settings={{ ...selectedItem.settings, mode: selectedItem.mode }}
                onChange={(updates) =>
                  updateItem({
                    mode: updates.mode ?? selectedItem.mode,
                    settings: { ...selectedItem.settings, ...updates },
                  })
                }
              />
            </>
          ) : (
            <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>
              Select a step to edit its practice settings.
            </p>
          )}
        </section>
      </div>
      {error && (
        <p role="alert" style={{ color: tv.ui.destructive }}>
          {error}
        </p>
      )}
    </RoomDialog>
  );
}

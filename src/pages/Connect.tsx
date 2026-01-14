// src/pages/Connect.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  joinRoomSchema,
  hostRoomSchema,
  type JoinRoomInput,
  type HostRoomInput,
} from "@/lib/schemas";

export default function Connect() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"host" | "join">("host");

  const hostForm = useForm<HostRoomInput>({
    resolver: zodResolver(hostRoomSchema),
    defaultValues: { name: "" },
  });

  const joinForm = useForm<JoinRoomInput>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: { name: "", code: "" },
  });

  const onHostSubmit = (data: HostRoomInput) => {
    navigate(`/connect/host?name=${encodeURIComponent(data.name)}`);
  };

  const onJoinSubmit = (data: JoinRoomInput) => {
    navigate(
      `/connect/join?name=${encodeURIComponent(data.name)}&code=${data.code.toUpperCase()}`
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8 text-[var(--text-primary)]">
        Connect
      </h1>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "host" ? "default" : "outline"}
          onClick={() => setActiveTab("host")}
        >
          Host a Room
        </Button>
        <Button
          variant={activeTab === "join" ? "default" : "outline"}
          onClick={() => setActiveTab("join")}
        >
          Join a Room
        </Button>
      </div>

      {/* Host Form */}
      {activeTab === "host" && (
        <form
          onSubmit={hostForm.handleSubmit(onHostSubmit)}
          className="w-full max-w-sm space-y-4 p-6 rounded-lg bg-[var(--surface)]"
        >
          <div>
            <Label htmlFor="host-name">Your Name</Label>
            <Input
              id="host-name"
              {...hostForm.register("name")}
              placeholder="Enter your name"
              className="mt-1"
            />
            {hostForm.formState.errors.name && (
              <p className="text-red-500 text-sm mt-1">
                {hostForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Create Room
          </Button>
        </form>
      )}

      {/* Join Form */}
      {activeTab === "join" && (
        <form
          onSubmit={joinForm.handleSubmit(onJoinSubmit)}
          className="w-full max-w-sm space-y-4 p-6 rounded-lg bg-[var(--surface)]"
        >
          <div>
            <Label htmlFor="join-name">Your Name</Label>
            <Input
              id="join-name"
              {...joinForm.register("name")}
              placeholder="Enter your name"
              className="mt-1"
            />
            {joinForm.formState.errors.name && (
              <p className="text-red-500 text-sm mt-1">
                {joinForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="join-code">Room Code</Label>
            <Input
              id="join-code"
              {...joinForm.register("code")}
              placeholder="XXXXX"
              className="mt-1 uppercase tracking-widest text-center font-mono"
              maxLength={5}
            />
            {joinForm.formState.errors.code && (
              <p className="text-red-500 text-sm mt-1">
                {joinForm.formState.errors.code.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Join Room
          </Button>
        </form>
      )}

      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mt-8"
      >
        ← Back to Practice
      </Button>
    </div>
  );
}

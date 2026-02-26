"use client";

import { useState } from "react";

interface ProfileFormProps {
  initialDisplayName: string;
  initialBio: string;
}

export function ProfileForm({ initialDisplayName, initialBio }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Profile update failed");
      }

      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4">
      <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">profile settings</h2>
      <label className="block text-sm text-[#4d4a6b]">
        display name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          minLength={2}
          maxLength={50}
          required
          className="mt-2 w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-[#1a1738] outline-none transition focus:border-[#605bff]"
        />
      </label>
      <label className="block text-sm text-[#4d4a6b]">
        bio
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          rows={4}
          maxLength={280}
          className="mt-2 w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-[#1a1738] outline-none transition focus:border-[#605bff]"
        />
      </label>
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#8d8ab0]">{bio.length}/280</p>
        <button
          type="submit"
          disabled={busy || displayName.trim().length < 2}
          className="rounded-xl bg-[#605bff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#504bd8] disabled:opacity-50"
        >
          save profile
        </button>
      </div>
      {message && <p className="text-sm text-[#605bff]">{message}</p>}
    </form>
  );
}

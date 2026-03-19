"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../src/lib/supabase";

export default function EditPage() {
  const { id } = useParams();
  const router = useRouter();
  const spotId = id as string;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSpot = async () => {
      const { data, error } = await supabase
        .from("spots")
        .select("id, name, address")
        .eq("id", spotId)
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setName(data.name);
      setAddress(data.address);
      setLoading(false);
    };

    loadSpot();
  }, [spotId]);

  const handleSave = async () => {
    if (!verified) {
      setError("You must confirm you are a verified reviewer.");
      return;
    }

    if (!name.trim() || !address.trim()) {
      setError("Name and address are required.");
      return;
    }

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("spots")
      .update({
        name: name.trim(),
        address: address.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", spotId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/spot/${spotId}`);
    router.refresh();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-md">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href={`/spot/${spotId}`}
          className="mb-4 block text-sm text-zinc-400 underline"
        >
          Back
        </Link>

        <h1 className="mb-6 text-2xl font-bold">Edit Spot</h1>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spot name"
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        <label className="mb-4 flex gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
          />
          I am a verified reviewer
        </label>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-950 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-white py-3 font-semibold text-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AddSpot() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [hasColdPlunge, setHasColdPlunge] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      setError("Name and address are required.");
      return;
    }

    setSaving(true);
    setError("");

    const now = new Date().toISOString();
    const slug = generateSlug(name);
    const id = crypto.randomUUID();

    const { error } = await supabase.from("spots").insert({
      id,
      slug,
      name: name.trim(),
      address: address.trim(),
      website: website.trim() || null,
      has_cold_plunge: hasColdPlunge,
      created_at: now,
      updated_at: now,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/spot/${slug}`);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-4 block text-sm text-zinc-400 underline">
          Back
        </Link>

        <h1 className="mb-6 text-3xl font-bold">Add New Spot</h1>

        <input
          type="text"
          placeholder="Spot name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        <input
          type="text"
          placeholder="Full address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        <input
          type="text"
          placeholder="Website (optional)"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        <label className="mb-4 flex gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={hasColdPlunge}
            onChange={(e) => setHasColdPlunge(e.target.checked)}
          />
          Has cold plunge
        </label>

        {error && (
          <div className="mb-4 rounded-2xl bg-red-950 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-white py-4 text-xl font-semibold text-black"
        >
          {saving ? "Saving..." : "Save Spot"}
        </button>
      </div>
    </main>
  );
}
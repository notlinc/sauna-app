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
  const [website, setWebsite] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSpot = async () => {
      const { data } = await supabase
        .from("spots")
        .select("name, address, website")
        .eq("id", spotId)
        .single();

      if (data) {
        setName(data.name);
        setAddress(data.address);
        setWebsite(data.website || "");
      }

      setLoading(false);
    };

    loadSpot();
  }, [spotId]);

  const handleSave = async () => {
    if (!verified) {
      setError("Confirm you are a verified reviewer");
      return;
    }

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("spots")
      .update({
        name,
        address,
        website,
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

  if (loading) return null;

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md">
        <Link href={`/spot/${spotId}`} className="mb-4 block text-sm text-zinc-400 underline">
          Back
        </Link>

        <h1 className="mb-6 text-2xl font-bold">Edit Spot</h1>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Website"
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        <label className="mb-4 flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
          />
          Verified reviewer
        </label>

        {error && (
          <div className="mb-4 text-red-400">{error}</div>
        )}

        <button
          onClick={handleSave}
          className="w-full rounded-2xl bg-white py-3 text-black"
        >
          Save
        </button>
      </div>
    </main>
  );
}
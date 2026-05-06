"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../../src/lib/supabase";

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function EditPage() {
  const { slug } = useParams();
  const router = useRouter();
  const spotPath = slug as string;

  const [spotId, setSpotId] = useState<string | null>(null);
  const [currentSlug, setCurrentSlug] = useState("");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSpot = async () => {
      const { data, error } = await supabase
        .from("spots")
        .select("id, slug, name, address, website")
        .or(`slug.eq.${spotPath},id.eq.${spotPath}`)
        .single();

      if (error) {
        setError("Spot not found");
        setLoading(false);
        return;
      }

      if (data) {
        setSpotId(data.id);
        setCurrentSlug(data.slug || "");
        setName(data.name);
        setAddress(data.address);
        setWebsite(data.website || "");
      }

      setLoading(false);
    };

    loadSpot();
  }, [spotPath]);

  const handleSave = async () => {
    if (!verified) {
      setError("Confirm you are a verified reviewer");
      return;
    }

    if (!spotId) {
      setError("Spot not found");
      return;
    }

    setSaving(true);
    setError("");

    const nextSlug = currentSlug || generateSlug(name);

    const { error } = await supabase
      .from("spots")
      .update({
        name,
        address,
        website: website.trim() || null,
        slug: nextSlug,
        updated_at: new Date().toISOString(),
      })
      .eq("id", spotId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/spot/${nextSlug}`);
    router.refresh();
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href={`/spot/${currentSlug || spotPath}`}
          className="mb-4 block text-sm text-zinc-400 underline"
        >
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

        {error && <div className="mb-4 text-red-400">{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-white py-3 text-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </main>
  );
}
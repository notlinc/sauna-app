"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../src/lib/supabase";

type Review = {
  id: number;
  reviewer_name: string;
  verified_reviewer: boolean;
  created_at: string;
  overall: number;
  sauna: number | null;
  cold_plunge: number | null;
  facilities: number | null;
  vibe: number | null;
  value: number | null;
  comment: string;
};

type Spot = {
  id: string;
  name: string;
  address: string;
  website?: string;
  updated_at: string;
  reviews: Review[];
};

export default function SpotPage() {
  const params = useParams();
  const id = params.id as string;

  const [spot, setSpot] = useState<Spot | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("spots")
        .select(`
          id,
          name,
          address,
          website,
          updated_at,
          reviews (*)
        `)
        .eq("id", id)
        .single();

      setSpot(data as Spot);
    };

    load();
  }, [id]);

  if (!spot) return null;

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-4 block text-sm text-zinc-400 underline">
          Back
        </Link>

        <h1 className="text-3xl font-bold">{spot.name}</h1>

        <p className="text-zinc-400">{spot.address}</p>

        {spot.website && (
          <a
            href={spot.website}
            target="_blank"
            className="mt-2 block text-blue-400 underline"
          >
            Visit Website
          </a>
        )}

        {/* rest unchanged */}
      </div>
    </main>
  );
}
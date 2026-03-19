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
  created_at: string;
  updated_at: string;
  reviews: Review[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SpotPage() {
  const params = useParams();
  const id = params.id as string;

  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSpot = async () => {
      const { data, error } = await supabase
        .from("spots")
        .select(`
          id,
          name,
          address,
          created_at,
          updated_at,
          reviews (
            id,
            reviewer_name,
            verified_reviewer,
            created_at,
            overall,
            sauna,
            cold_plunge,
            facilities,
            vibe,
            value,
            comment
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const sorted = {
        ...(data as Spot),
        reviews: [...((data as Spot).reviews || [])].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      };

      setSpot(sorted);
      setLoading(false);
    };

    loadSpot();
  }, [id]);

  const averages = useMemo(() => {
    if (!spot || spot.reviews.length === 0) return null;

    const avg = (
      key: keyof Pick<
        Review,
        "overall" | "sauna" | "cold_plunge" | "facilities" | "vibe" | "value"
      >,
    ) => {
      const values = spot.reviews
        .map((r) => r[key])
        .filter((v): v is number => typeof v === "number");

      if (!values.length) return "—";

      const result =
        values.reduce((sum, value) => sum + value, 0) / values.length;

      return result.toFixed(1);
    };

    return {
      overall: avg("overall"),
      sauna: avg("sauna"),
      coldPlunge: avg("cold_plunge"),
      facilities: avg("facilities"),
      vibe: avg("vibe"),
      value: avg("value"),
    };
  }, [spot]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-md">Loading...</div>
      </main>
    );
  }

  if (!spot) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-md">
          <Link href="/" className="mb-4 block text-sm text-zinc-400 underline">
            Back
          </Link>
          Not found
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-4 block text-sm text-zinc-400 underline">
          Back
        </Link>

        <div className="mt-4 rounded-2xl bg-zinc-900 p-5">
          <h1 className="text-3xl font-bold">{spot.name}</h1>
          <p className="mt-2 text-zinc-400">{spot.address}</p>
          <p className="mt-3 text-sm text-zinc-500">
            Updated {formatDate(spot.updated_at)}
          </p>
        </div>

        <div className="mt-4 flex gap-3">
          <Link
            href={`/spot/${spot.id}/review`}
            className="flex-1 rounded-xl bg-white py-3 text-center font-semibold text-black"
          >
            Add Review
          </Link>

          <Link
            href={`/spot/${spot.id}/edit`}
            className="flex-1 rounded-xl bg-zinc-800 py-3 text-center text-sm text-white"
          >
            Edit
          </Link>
        </div>

        <div className="mt-4 rounded-2xl bg-zinc-900 p-5">
          <h2 className="mb-3 text-lg font-semibold">Scores</h2>

          {averages ? (
            <div className="grid grid-cols-2 gap-2 text-sm text-zinc-300">
              <div>Overall: {averages.overall}</div>
              <div>Sauna: {averages.sauna}</div>
              <div>Cold: {averages.coldPlunge}</div>
              <div>Facilities: {averages.facilities}</div>
              <div>Vibe: {averages.vibe}</div>
              <div>Value: {averages.value}</div>
            </div>
          ) : (
            <p className="text-zinc-400">No reviews yet</p>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {spot.reviews.length === 0 ? (
            <div className="rounded-xl bg-zinc-900 p-4 text-zinc-400">
              No reviews yet.
            </div>
          ) : (
            spot.reviews.map((r) => (
              <div key={r.id} className="rounded-xl bg-zinc-900 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{r.reviewer_name}</p>
                    <p className="text-sm text-zinc-500">
                      {formatDate(r.created_at)}
                      {r.verified_reviewer ? " • Verified reviewer" : ""}
                    </p>
                  </div>

                  <div className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-semibold">
                    {Number(r.overall).toFixed(1)}
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-zinc-300">
                  {r.comment || "No comment"}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-zinc-400">
                  <div>Sauna: {r.sauna ?? "—"}</div>
                  <div>Cold plunge: {r.cold_plunge ?? "—"}</div>
                  <div>Facilities: {r.facilities ?? "—"}</div>
                  <div>Vibe: {r.vibe ?? "—"}</div>
                  <div>Value: {r.value ?? "—"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
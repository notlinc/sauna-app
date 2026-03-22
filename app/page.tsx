"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../src/lib/supabase";

type Review = {
  id: number;
  overall: number;
  verified_reviewer: boolean;
};

type Spot = {
  id: string;
  name: string;
  address: string;
  updated_at: string;
  reviews: Review[];
};

type SortOption = "highest-rated" | "most-reviewed" | "newest";

export default function Home() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("highest-rated");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("spots")
        .select(`
          id,
          name,
          address,
          updated_at,
          reviews (
            id,
            overall,
            verified_reviewer
          )
        `);

      setSpots(data || []);
    };

    load();
  }, []);

  // 🔥 GLOBAL AVERAGE
  const globalAverage = useMemo(() => {
    const all = spots.flatMap((s) => s.reviews);
    if (!all.length) return 0;

    const weighted = all.reduce((sum, r) => {
      const weight = r.verified_reviewer ? 2 : 1;
      return sum + r.overall * weight;
    }, 0);

    const totalWeight = all.reduce(
      (sum, r) => sum + (r.verified_reviewer ? 2 : 1),
      0,
    );

    return weighted / totalWeight;
  }, [spots]);

  // 🔥 PER SPOT SCORE
  const getScore = (reviews: Review[]) => {
    if (!reviews.length) return 0;

    const weightedSum = reviews.reduce((sum, r) => {
      const weight = r.verified_reviewer ? 2 : 1;
      return sum + r.overall * weight;
    }, 0);

    const totalWeight = reviews.reduce(
      (sum, r) => sum + (r.verified_reviewer ? 2 : 1),
      0,
    );

    const R = weightedSum / totalWeight;
    const v = totalWeight;
    const m = 2;
    const C = globalAverage;

    return (v / (v + m)) * R + (m / (v + m)) * C;
  };

  const filtered = useMemo(() => {
    let list = [...spots];

    if (search) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.address.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (sortBy === "highest-rated") {
      list.sort((a, b) => getScore(b.reviews) - getScore(a.reviews));
    }

    if (sortBy === "most-reviewed") {
      list.sort((a, b) => b.reviews.length - a.reviews.length);
    }

    if (sortBy === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() -
          new Date(a.updated_at).getTime(),
      );
    }

    return list;
  }, [spots, search, sortBy, globalAverage]);

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-3xl font-bold">Sauna Ratings</h1>

        <input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-xl bg-zinc-900 p-3"
        />

        <div className="mb-4 flex gap-2">
          <button onClick={() => setSortBy("highest-rated")}>
            Top
          </button>
          <button onClick={() => setSortBy("most-reviewed")}>
            Reviews
          </button>
          <button onClick={() => setSortBy("newest")}>
            New
          </button>
        </div>

        <div className="space-y-4">
          {filtered.map((spot) => {
            const score = getScore(spot.reviews);

            return (
              <Link key={spot.id} href={`/spot/${spot.id}`}>
                <div className="rounded-xl bg-zinc-900 p-4">
                  <div className="flex justify-between">
                    <h2>{spot.name}</h2>
                    <div>{score.toFixed(1)}</div>
                  </div>

                  <p className="text-sm text-zinc-400">
                    {spot.reviews.length} reviews
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
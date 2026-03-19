"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../src/lib/supabase";

type Review = {
  id: number;
  overall: number;
  created_at: string;
};

type Spot = {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
  reviews: Review[];
};

type SortOption = "highest-rated" | "most-reviewed" | "newest";

export default function Home() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("highest-rated");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSpots = async () => {
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
            overall,
            created_at
          )
        `);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setSpots((data as Spot[]) || []);
      setLoading(false);
    };

    loadSpots();
  }, []);

  const getAverage = (reviews: Review[] = []) => {
    if (!reviews.length) return null;
    const avg =
      reviews.reduce((sum, r) => sum + Number(r.overall), 0) /
      reviews.length;
    return Number(avg.toFixed(1));
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...spots];
    const query = search.toLowerCase();

    if (query) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.address.toLowerCase().includes(query),
      );
    }

    result.sort((a, b) => {
      if (sortBy === "highest-rated") {
        const aAvg = getAverage(a.reviews) ?? -1;
        const bAvg = getAverage(b.reviews) ?? -1;
        return bAvg - aAvg;
      }

      if (sortBy === "most-reviewed") {
        return b.reviews.length - a.reviews.length;
      }

      return (
        new Date(b.updated_at).getTime() -
        new Date(a.updated_at).getTime()
      );
    });

    return result;
  }, [spots, search, sortBy]);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-4xl font-bold">Sauna Ratings</h1>

        <div className="mb-4 flex gap-3">
          <input
            type="text"
            placeholder="Search name or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-2xl bg-zinc-900 p-3 text-white placeholder:text-zinc-500"
          />

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as SortOption)
            }
            className="w-40 rounded-2xl bg-zinc-900 p-3 text-sm text-zinc-300"
          >
            <option value="highest-rated">Top rated</option>
            <option value="most-reviewed">Most reviews</option>
            <option value="newest">Recent</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-zinc-900 p-4 text-zinc-400">
            Loading...
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-zinc-500">
              {filteredAndSorted.length} spot
              {filteredAndSorted.length === 1 ? "" : "s"}
            </div>

            <div className="space-y-4">
              {filteredAndSorted.map((spot) => {
                const avg = getAverage(spot.reviews);

                return (
                  <Link
                    key={spot.id}
                    href={`/spot/${spot.id}`}
                  >
                    <div className="rounded-2xl bg-zinc-900 p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">
                          {spot.name}
                        </h2>
                        <div className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-semibold">
                          {avg === null ? "—" : avg}
                        </div>
                      </div>

                      <p className="text-zinc-400">
                        {spot.address}
                      </p>

                      <div className="mt-3 text-sm text-zinc-500">
                        {spot.reviews.length} review
                        {spot.reviews.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <Link href="/add" className="mt-8 block">
          <div className="w-full rounded-2xl bg-white py-4 text-center text-2xl font-semibold text-black">
            + Add New Spot
          </div>
        </Link>
      </div>
    </main>
  );
}
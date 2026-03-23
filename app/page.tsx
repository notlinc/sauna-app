"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../src/lib/supabase";

type Rating = {
  reviewer_name: string;
  verified_reviewer: boolean;
  created_at: string;
  overall: number;
  sauna: number;
  cold_plunge: number;
  facilities: number;
  vibe: number;
  value: number;
  comment: string;
};

type Spot = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
  reviews: Rating[];
};

type SortOption =
  | "highest-rated"
  | "most-reviewed"
  | "newest"
  | "near"
  | "sauna"
  | "cold"
  | "vibe";

type UserLocation = {
  lat: number;
  lng: number;
};

function getDistanceInKm(
  userLat: number,
  userLng: number,
  spotLat: number,
  spotLng: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371;
  const dLat = toRad(spotLat - userLat);
  const dLng = toRad(spotLng - userLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(userLat)) *
      Math.cos(toRad(spotLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("highest-rated");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    const loadSpots = async () => {
      const { data } = await supabase
        .from("spots")
        .select(`
          id,
          name,
          address,
          lat,
          lng,
          created_at,
          updated_at,
          reviews (
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
        `);

      setSpots((data as Spot[]) || []);
    };

    loadSpots();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setLocationDenied(true),
    );
  }, []);

  const getWeightedAvg = (reviews: Rating[], key: keyof Rating) => {
    if (!reviews.length) return 0;

    let sum = 0;
    let weightTotal = 0;

    for (const r of reviews) {
      const weight = r.verified_reviewer ? 2 : 1;
      const value = Number(r[key]);

      if (!isNaN(value)) {
        sum += value * weight;
        weightTotal += weight;
      }
    }

    if (weightTotal === 0) return 0;

    return sum / weightTotal;
  };

  const globalAverage = useMemo(() => {
    const all = spots.flatMap((s) => s.reviews);

    if (!all.length) return 0;

    return getWeightedAvg(all, "overall");
  }, [spots]);

  const getRankingScore = (reviews: Rating[]) => {
    if (!reviews.length) return 0;

    const R = getWeightedAvg(reviews, "overall");
    const v = reviews.reduce(
      (sum, r) => sum + (r.verified_reviewer ? 2 : 1),
      0,
    );
    const m = 2;
    const C = globalAverage;

    return (v / (v + m)) * R + (m / (v + m)) * C;
  };

  const getDistance = (spot: Spot) => {
    if (!userLocation || spot.lat === null || spot.lng === null) return null;

    return getDistanceInKm(
      userLocation.lat,
      userLocation.lng,
      spot.lat,
      spot.lng,
    );
  };

  const sorted = useMemo(() => {
    let list = [...spots];

    if (search) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.address.toLowerCase().includes(search.toLowerCase()),
      );
    }

    list.sort((a, b) => {
      if (sortBy === "highest-rated") {
        return getRankingScore(b.reviews) - getRankingScore(a.reviews);
      }

      if (sortBy === "most-reviewed") {
        return b.reviews.length - a.reviews.length;
      }

      if (sortBy === "newest") {
        return (
          new Date(b.updated_at).getTime() -
          new Date(a.updated_at).getTime()
        );
      }

      if (sortBy === "near") {
        const da = getDistance(a) ?? 999;
        const db = getDistance(b) ?? 999;
        return da - db;
      }

      if (sortBy === "sauna") {
        return getWeightedAvg(b.reviews, "sauna") - getWeightedAvg(a.reviews, "sauna");
      }

      if (sortBy === "cold") {
        return getWeightedAvg(b.reviews, "cold_plunge") - getWeightedAvg(a.reviews, "cold_plunge");
      }

      if (sortBy === "vibe") {
        return getWeightedAvg(b.reviews, "vibe") - getWeightedAvg(a.reviews, "vibe");
      }

      return 0;
    });

    return list;
  }, [spots, search, sortBy, userLocation]);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-4xl font-bold">Sauna Ratings</h1>

        <div className="mb-4 flex gap-3">
          <input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-2xl bg-zinc-900 p-3"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-2xl bg-zinc-900 p-3 text-sm"
          >
            <option value="highest-rated">Top rated</option>
            <option value="most-reviewed">Most reviews</option>
            <option value="newest">Recent</option>
            <option value="near">Near me</option>
            <option value="sauna">Best sauna</option>
            <option value="cold">Best cold plunge</option>
            <option value="vibe">Best vibe</option>
          </select>
        </div>

        <div className="space-y-4">
          {sorted.map((spot) => {
            const score = getRankingScore(spot.reviews);
            const distance = getDistance(spot);

            return (
              <Link key={spot.id} href={`/spot/${spot.id}`}>
                <div className="rounded-2xl bg-zinc-900 p-5">
                  <div className="flex justify-between">
                    <h2>{spot.name}</h2>
                    <div>{score.toFixed(1)}</div>
                  </div>

                  <p className="text-sm text-zinc-400">{spot.address}</p>

                  <div className="text-sm text-zinc-500">
                    {distance && `${distance.toFixed(1)} km away`}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
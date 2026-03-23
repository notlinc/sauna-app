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
      const { data, error } = await supabase
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

      if (error) {
        console.error(error);
        return;
      }

      setSpots((data as Spot[]) || []);
    };

    loadSpots();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocationDenied(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }, []);

  const getRawAverage = (reviews: Rating[] = []) => {
    if (!reviews.length) return null;

    const avg =
      reviews.reduce((sum, review) => sum + Number(review.overall), 0) /
      reviews.length;

    return Number(avg.toFixed(1));
  };

  const getWeightedReviewCount = (reviews: Rating[] = []) => {
    return reviews.reduce(
      (sum, review) => sum + (review.verified_reviewer ? 2 : 1),
      0,
    );
  };

  const getWeightedMetricAverage = (
    reviews: Rating[] = [],
    key: "sauna" | "cold_plunge" | "vibe",
  ) => {
    if (!reviews.length) return 0;

    const weightedSum = reviews.reduce((sum, review) => {
      const weight = review.verified_reviewer ? 2 : 1;
      return sum + Number(review[key]) * weight;
    }, 0);

    const totalWeight = reviews.reduce(
      (sum, review) => sum + (review.verified_reviewer ? 2 : 1),
      0,
    );

    if (totalWeight === 0) return 0;

    return weightedSum / totalWeight;
  };

  const globalAverage = useMemo(() => {
    const allReviews = spots.flatMap((spot) => spot.reviews || []);

    if (!allReviews.length) return 0;

    const weightedSum = allReviews.reduce((sum, review) => {
      const weight = review.verified_reviewer ? 2 : 1;
      return sum + Number(review.overall) * weight;
    }, 0);

    const totalWeight = allReviews.reduce(
      (sum, review) => sum + (review.verified_reviewer ? 2 : 1),
      0,
    );

    if (totalWeight === 0) return 0;

    return weightedSum / totalWeight;
  }, [spots]);

  const getRankingScore = (reviews: Rating[] = []) => {
    if (!reviews.length) return 0;

    const weightedSum = reviews.reduce((sum, review) => {
      const weight = review.verified_reviewer ? 2 : 1;
      return sum + Number(review.overall) * weight;
    }, 0);

    const weightedCount = reviews.reduce(
      (sum, review) => sum + (review.verified_reviewer ? 2 : 1),
      0,
    );

    if (weightedCount === 0) return 0;

    const R = weightedSum / weightedCount;
    const v = weightedCount;
    const m = 2;
    const C = globalAverage;

    return Number((((v / (v + m)) * R + (m / (v + m)) * C)).toFixed(1));
  };

  const getDistance = (spot: Spot) => {
    if (
      !userLocation ||
      spot.lat === null ||
      spot.lng === null
    ) {
      return null;
    }

    return getDistanceInKm(
      userLocation.lat,
      userLocation.lng,
      spot.lat,
      spot.lng,
    );
  };

  const filteredAndSortedSpots = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = [...spots];

    if (query) {
      result = result.filter((spot) => {
        const nameMatch = spot.name.toLowerCase().includes(query);
        const addressMatch = spot.address.toLowerCase().includes(query);
        return nameMatch || addressMatch;
      });
    }

    result.sort((a, b) => {
      if (sortBy === "highest-rated") {
        const aScore = getRankingScore(a.reviews);
        const bScore = getRankingScore(b.reviews);

        if (bScore !== aScore) return bScore - aScore;

        const aCount = getWeightedReviewCount(a.reviews);
        const bCount = getWeightedReviewCount(b.reviews);

        if (bCount !== aCount) return bCount - aCount;

        const aAvg = getRawAverage(a.reviews) ?? -1;
        const bAvg = getRawAverage(b.reviews) ?? -1;
        return bAvg - aAvg;
      }

      if (sortBy === "most-reviewed") {
        const aCount = getWeightedReviewCount(a.reviews);
        const bCount = getWeightedReviewCount(b.reviews);

        if (bCount !== aCount) return bCount - aCount;

        const aScore = getRankingScore(a.reviews);
        const bScore = getRankingScore(b.reviews);
        return bScore - aScore;
      }

      if (sortBy === "near") {
        const aDistance = getDistance(a);
        const bDistance = getDistance(b);

        if (aDistance === null && bDistance === null) return 0;
        if (aDistance === null) return 1;
        if (bDistance === null) return -1;

        return aDistance - bDistance;
      }

      if (sortBy === "sauna") {
        const aScore = getWeightedMetricAverage(a.reviews, "sauna");
        const bScore = getWeightedMetricAverage(b.reviews, "sauna");
        return bScore - aScore;
      }

      if (sortBy === "cold") {
        const aScore = getWeightedMetricAverage(a.reviews, "cold_plunge");
        const bScore = getWeightedMetricAverage(b.reviews, "cold_plunge");
        return bScore - aScore;
      }

      if (sortBy === "vibe") {
        const aScore = getWeightedMetricAverage(a.reviews, "vibe");
        const bScore = getWeightedMetricAverage(b.reviews, "vibe");
        return bScore - aScore;
      }

      return (
        new Date(b.updated_at).getTime() -
        new Date(a.updated_at).getTime()
      );
    });

    return result;
  }, [spots, search, sortBy, globalAverage, userLocation]);

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
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-40 rounded-2xl bg-zinc-900 p-3 text-sm text-zinc-300"
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

        {sortBy === "near" && !userLocation && !locationDenied && (
          <div className="mb-4 rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-400">
            Getting your location...
          </div>
        )}

        {sortBy === "near" && locationDenied && (
          <div className="mb-4 rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-400">
            Location access was denied, so Near me can’t be used yet.
          </div>
        )}

        <div className="mb-4 text-sm text-zinc-500">
          {filteredAndSortedSpots.length} spot
          {filteredAndSortedSpots.length === 1 ? "" : "s"}
        </div>

        <div className="space-y-4">
          {filteredAndSortedSpots.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900 p-4 text-zinc-400">
              No matching spots found.
            </div>
          ) : (
            filteredAndSortedSpots.map((spot) => {
              const displayScore =
                sortBy === "sauna"
                  ? getWeightedMetricAverage(spot.reviews, "sauna")
                  : sortBy === "cold"
                    ? getWeightedMetricAverage(spot.reviews, "cold_plunge")
                    : sortBy === "vibe"
                      ? getWeightedMetricAverage(spot.reviews, "vibe")
                      : getRankingScore(spot.reviews);

              const distance = getDistance(spot);

              return (
                <Link key={spot.id} href={`/spot/${spot.id}`} className="block">
                  <div className="rounded-2xl bg-zinc-900 p-5">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <h2 className="text-2xl font-semibold leading-tight">
                        {spot.name}
                      </h2>
                      <div className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-sm font-semibold">
                        {spot.reviews.length === 0 ? "—" : displayScore.toFixed(1)}
                      </div>
                    </div>

                    <p className="text-base text-zinc-400">{spot.address}</p>

                    <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                      <span>
                        {spot.reviews.length} review
                        {spot.reviews.length === 1 ? "" : "s"}
                      </span>

                      <span className="flex gap-2">
                        {distance !== null && (
                          <span>{distance.toFixed(1)} km</span>
                        )}
                        <span>
                          Updated{" "}
                          {new Date(spot.updated_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <Link href="/add" className="mt-8 block">
          <div className="w-full rounded-2xl bg-white py-4 text-center text-2xl font-semibold text-black">
            + Add New Spot
          </div>
        </Link>
      </div>
    </main>
  );
}
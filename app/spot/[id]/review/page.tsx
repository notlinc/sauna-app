"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../src/lib/supabase";

function needsComment(value: number | null) {
  if (value === null) return false;
  return value < 4 || value > 8;
}

function calculateOverall(scores: {
  sauna: number | null;
  coldPlunge: number | null;
  facilities: number | null;
  vibe: number | null;
  value: number | null;
}) {
  if (
    scores.sauna === null ||
    scores.coldPlunge === null ||
    scores.facilities === null ||
    scores.vibe === null ||
    scores.value === null
  ) {
    return null;
  }

  return Number(
    (
      scores.sauna * 0.3 +
      scores.coldPlunge * 0.3 +
      scores.vibe * 0.3 +
      scores.facilities * 0.07 +
      scores.value * 0.03
    ).toFixed(1),
  );
}

function ScoreSelector({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number | null;
  setValue: (v: number) => void;
}) {
  return (
    <div className="mb-6">
      <p className="mb-3 text-base text-zinc-300">{label}</p>

      <div className="grid grid-cols-5 gap-3">
        {[1,2,3,4,5,6,7,8,9,10].map((n) => {
          const isSelected = value === n;
          const isExtreme = n < 4 || n > 8;

          return (
            <button
              key={n}
              type="button"
              onClick={() => setValue(n)}
              className={`h-12 rounded-2xl text-base font-semibold ${
                isSelected
                  ? "bg-white text-black"
                  : isExtreme
                    ? "bg-zinc-800 text-zinc-200"
                    : "bg-zinc-900 text-zinc-300"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const spotId = id as string;

  const [reviewerName, setReviewerName] = useState("");
  const [verifiedReviewer, setVerifiedReviewer] = useState(false);

  const [sauna, setSauna] = useState<number | null>(null);
  const [coldPlunge, setColdPlunge] = useState<number | null>(null);
  const [facilities, setFacilities] = useState<number | null>(null);
  const [vibe, setVibe] = useState<number | null>(null);
  const [value, setValue] = useState<number | null>(null);

  const [saunaComment, setSaunaComment] = useState("");
  const [coldPlungeComment, setColdPlungeComment] = useState("");
  const [facilitiesComment, setFacilitiesComment] = useState("");
  const [vibeComment, setVibeComment] = useState("");
  const [valueComment, setValueComment] = useState("");

  const [generalComment, setGeneralComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const overall = useMemo(
    () =>
      calculateOverall({
        sauna,
        coldPlunge,
        facilities,
        vibe,
        value,
      }),
    [sauna, coldPlunge, facilities, vibe, value],
  );

  const compiledComment = useMemo(() => {
    const lines: string[] = [];

    if (generalComment.trim()) lines.push(generalComment.trim());
    if (needsComment(sauna) && saunaComment.trim()) {
      lines.push(`Sauna: ${saunaComment.trim()}`);
    }
    if (needsComment(coldPlunge) && coldPlungeComment.trim()) {
      lines.push(`Cold plunge: ${coldPlungeComment.trim()}`);
    }
    if (needsComment(facilities) && facilitiesComment.trim()) {
      lines.push(`Facilities: ${facilitiesComment.trim()}`);
    }
    if (needsComment(vibe) && vibeComment.trim()) {
      lines.push(`Vibe: ${vibeComment.trim()}`);
    }
    if (needsComment(value) && valueComment.trim()) {
      lines.push(`Value: ${valueComment.trim()}`);
    }

    return lines.join("\n\n");
  }, [
    sauna,
    coldPlunge,
    facilities,
    vibe,
    value,
    saunaComment,
    coldPlungeComment,
    facilitiesComment,
    vibeComment,
    valueComment,
    generalComment,
  ]);

  const validate = () => {
    if (!reviewerName.trim()) {
      setError("Reviewer name is required");
      return false;
    }

    if (
      sauna === null ||
      coldPlunge === null ||
      facilities === null ||
      vibe === null ||
      value === null
    ) {
      setError("All scores must be selected");
      return false;
    }

    if (needsComment(sauna) && !saunaComment.trim()) {
      setError("Sauna needs a comment");
      return false;
    }
    if (needsComment(coldPlunge) && !coldPlungeComment.trim()) {
      setError("Cold plunge needs a comment");
      return false;
    }
    if (needsComment(facilities) && !facilitiesComment.trim()) {
      setError("Facilities needs a comment");
      return false;
    }
    if (needsComment(vibe) && !vibeComment.trim()) {
      setError("Vibe needs a comment");
      return false;
    }
    if (needsComment(value) && !valueComment.trim()) {
      setError("Value needs a comment");
      return false;
    }

    if (overall === null) {
      setError("Overall could not be calculated");
      return false;
    }

    setError("");
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setError("");

    const { error } = await supabase.from("reviews").insert({
      spot_id: spotId,
      reviewer_name: reviewerName.trim(),
      verified_reviewer: verifiedReviewer,
      created_at: new Date().toISOString(),
      overall,
      sauna,
      cold_plunge: coldPlunge,
      facilities,
      vibe,
      value,
      comment: compiledComment.trim(),
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    await supabase
      .from("spots")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", spotId);

    router.push(`/spot/${spotId}`);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md">
        <Link href={`/spot/${spotId}`} className="mb-4 block text-sm text-zinc-400 underline">
          Back
        </Link>

        <h1 className="mb-6 text-2xl font-bold">Add Review</h1>

        <input
          placeholder="Your name"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        <label className="mb-6 flex gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={verifiedReviewer}
            onChange={(e) => setVerifiedReviewer(e.target.checked)}
          />
          Verified reviewer
        </label>

        <div className="mb-6 rounded-2xl bg-zinc-900 p-4">
          <p className="mb-1 text-sm text-zinc-400">Calculated overall</p>
          <p className="text-3xl font-bold">
            {overall === null ? "—" : overall.toFixed(1)}
          </p>
        </div>

        <ScoreSelector label="Sauna" value={sauna} setValue={setSauna} />
        {needsComment(sauna) && (
          <textarea
            placeholder="Why did you score Sauna this low/high?"
            value={saunaComment}
            onChange={(e) => setSaunaComment(e.target.value)}
            className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
          />
        )}

        <ScoreSelector label="Cold plunge" value={coldPlunge} setValue={setColdPlunge} />
        {needsComment(coldPlunge) && (
          <textarea
            placeholder="Why did you score Cold plunge this low/high?"
            value={coldPlungeComment}
            onChange={(e) => setColdPlungeComment(e.target.value)}
            className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
          />
        )}

        <ScoreSelector label="Vibe" value={vibe} setValue={setVibe} />
        {needsComment(vibe) && (
          <textarea
            placeholder="Why did you score Vibe this low/high?"
            value={vibeComment}
            onChange={(e) => setVibeComment(e.target.value)}
            className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
          />
        )}

        <ScoreSelector label="Facilities" value={facilities} setValue={setFacilities} />
        {needsComment(facilities) && (
          <textarea
            placeholder="Why did you score Facilities this low/high?"
            value={facilitiesComment}
            onChange={(e) => setFacilitiesComment(e.target.value)}
            className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
          />
        )}

        <ScoreSelector label="Value" value={value} setValue={setValue} />
        {needsComment(value) && (
          <textarea
            placeholder="Why did you score Value this low/high?"
            value={valueComment}
            onChange={(e) => setValueComment(e.target.value)}
            className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
          />
        )}

        <textarea
          placeholder="General comment"
          value={generalComment}
          onChange={(e) => setGeneralComment(e.target.value)}
          className="mb-4 w-full rounded-2xl bg-zinc-900 p-3"
        />

        {error && (
          <div className="mb-4 rounded-2xl bg-red-950 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-white py-3 font-semibold text-black"
        >
          {saving ? "Saving..." : "Submit Review"}
        </button>
      </div>
    </main>
  );
}
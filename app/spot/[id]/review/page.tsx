"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../src/lib/supabase";

function parseScore(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0 || parsed > 10) return null;

  return parsed;
}

function isWholeNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  if (!/^\d+(\.0+)?$/.test(trimmed)) return false;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed);
}

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

export default function ReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const spotId = id as string;

  const [reviewerName, setReviewerName] = useState("");
  const [verifiedReviewer, setVerifiedReviewer] = useState(false);

  const [sauna, setSauna] = useState("");
  const [coldPlunge, setColdPlunge] = useState("");
  const [facilities, setFacilities] = useState("");
  const [vibe, setVibe] = useState("");
  const [value, setValue] = useState("");

  const [saunaComment, setSaunaComment] = useState("");
  const [coldPlungeComment, setColdPlungeComment] = useState("");
  const [facilitiesComment, setFacilitiesComment] = useState("");
  const [vibeComment, setVibeComment] = useState("");
  const [valueComment, setValueComment] = useState("");

  const [generalComment, setGeneralComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const saunaScore = parseScore(sauna);
  const coldPlungeScore = parseScore(coldPlunge);
  const facilitiesScore = parseScore(facilities);
  const vibeScore = parseScore(vibe);
  const valueScore = parseScore(value);

  const overall = useMemo(
    () =>
      calculateOverall({
        sauna: saunaScore,
        coldPlunge: coldPlungeScore,
        facilities: facilitiesScore,
        vibe: vibeScore,
        value: valueScore,
      }),
    [saunaScore, coldPlungeScore, facilitiesScore, vibeScore, valueScore],
  );

  const compiledComment = useMemo(() => {
    const lines: string[] = [];

    if (generalComment.trim()) lines.push(generalComment.trim());
    if (needsComment(saunaScore) && saunaComment.trim()) {
      lines.push(`Sauna: ${saunaComment.trim()}`);
    }
    if (needsComment(coldPlungeScore) && coldPlungeComment.trim()) {
      lines.push(`Cold plunge: ${coldPlungeComment.trim()}`);
    }
    if (needsComment(facilitiesScore) && facilitiesComment.trim()) {
      lines.push(`Facilities: ${facilitiesComment.trim()}`);
    }
    if (needsComment(vibeScore) && vibeComment.trim()) {
      lines.push(`Vibe: ${vibeComment.trim()}`);
    }
    if (needsComment(valueScore) && valueComment.trim()) {
      lines.push(`Value: ${valueComment.trim()}`);
    }

    return lines.join("\n\n");
  }, [
    saunaScore,
    coldPlungeScore,
    facilitiesScore,
    vibeScore,
    valueScore,
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
      saunaScore === null ||
      coldPlungeScore === null ||
      facilitiesScore === null ||
      vibeScore === null ||
      valueScore === null
    ) {
      setError("All scores must be valid numbers between 0.0 and 10.0");
      return false;
    }

    if (needsComment(saunaScore) && !saunaComment.trim()) {
      setError("Sauna needs a comment");
      return false;
    }
    if (needsComment(coldPlungeScore) && !coldPlungeComment.trim()) {
      setError("Cold plunge needs a comment");
      return false;
    }
    if (needsComment(facilitiesScore) && !facilitiesComment.trim()) {
      setError("Facilities needs a comment");
      return false;
    }
    if (needsComment(vibeScore) && !vibeComment.trim()) {
      setError("Vibe needs a comment");
      return false;
    }
    if (needsComment(valueScore) && !valueComment.trim()) {
      setError("Value needs a comment");
      return false;
    }

    if (overall === null) {
      setError("Overall could not be calculated");
      return false;
    }

    const perfectOrZeroSections: string[] = [];

    if (saunaScore === 0 || saunaScore === 10) perfectOrZeroSections.push("Sauna");
    if (coldPlungeScore === 0 || coldPlungeScore === 10) perfectOrZeroSections.push("Cold plunge");
    if (facilitiesScore === 0 || facilitiesScore === 10) perfectOrZeroSections.push("Facilities");
    if (vibeScore === 0 || vibeScore === 10) perfectOrZeroSections.push("Vibe");
    if (valueScore === 0 || valueScore === 10) perfectOrZeroSections.push("Value");

    if (perfectOrZeroSections.length > 0) {
      const confirmed = window.confirm(
        `You’ve given ${perfectOrZeroSections.join(", ")} a 0 or 10.\n\nAre you sure the experience was truly so bad that nothing could be worse, or so good that nothing could possibly be better?`,
      );

      if (!confirmed) {
        return false;
      }
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
      sauna: saunaScore,
      cold_plunge: coldPlungeScore,
      facilities: facilitiesScore,
      vibe: vibeScore,
      value: valueScore,
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

  const inputClass =
    "mb-2 w-full rounded-2xl bg-zinc-900 p-3 text-white placeholder:text-zinc-500";
  const textareaClass =
    "mb-4 w-full rounded-2xl bg-zinc-900 p-3 text-white placeholder:text-zinc-500";

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href={`/spot/${spotId}`}
          className="mb-4 block text-sm text-zinc-400 underline"
        >
          Back
        </Link>

        <h1 className="mb-6 text-2xl font-bold">Add Review</h1>

        <input
          placeholder="Your name"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          className={inputClass}
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

        <p className="mb-3 text-base text-zinc-300">Sauna</p>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Enter score"
          value={sauna}
          onChange={(e) => setSauna(e.target.value)}
          className={inputClass}
        />
        {isWholeNumber(sauna) && sauna.trim() !== "" && (
          <p className="mb-3 text-sm text-zinc-500">rookie score</p>
        )}
        {needsComment(saunaScore) && (
          <textarea
            placeholder="Why did you score Sauna this low/high?"
            value={saunaComment}
            onChange={(e) => setSaunaComment(e.target.value)}
            className={textareaClass}
          />
        )}

        <p className="mb-3 text-base text-zinc-300">Cold plunge</p>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Enter score"
          value={coldPlunge}
          onChange={(e) => setColdPlunge(e.target.value)}
          className={inputClass}
        />
        {isWholeNumber(coldPlunge) && coldPlunge.trim() !== "" && (
          <p className="mb-3 text-sm text-zinc-500">rookie score</p>
        )}
        {needsComment(coldPlungeScore) && (
          <textarea
            placeholder="Why did you score Cold plunge this low/high?"
            value={coldPlungeComment}
            onChange={(e) => setColdPlungeComment(e.target.value)}
            className={textareaClass}
          />
        )}

        <p className="mb-3 text-base text-zinc-300">Vibe</p>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Enter score"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          className={inputClass}
        />
        {isWholeNumber(vibe) && vibe.trim() !== "" && (
          <p className="mb-3 text-sm text-zinc-500">rookie score</p>
        )}
        {needsComment(vibeScore) && (
          <textarea
            placeholder="Why did you score Vibe this low/high?"
            value={vibeComment}
            onChange={(e) => setVibeComment(e.target.value)}
            className={textareaClass}
          />
        )}

        <p className="mb-3 text-base text-zinc-300">Facilities</p>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Enter score"
          value={facilities}
          onChange={(e) => setFacilities(e.target.value)}
          className={inputClass}
        />
        {isWholeNumber(facilities) && facilities.trim() !== "" && (
          <p className="mb-3 text-sm text-zinc-500">rookie score</p>
        )}
        {needsComment(facilitiesScore) && (
          <textarea
            placeholder="Why did you score Facilities this low/high?"
            value={facilitiesComment}
            onChange={(e) => setFacilitiesComment(e.target.value)}
            className={textareaClass}
          />
        )}

        <p className="mb-3 text-base text-zinc-300">Value</p>
        <input
          type="text"
          inputMode="decimal"
          placeholder="Enter score"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
        />
        {isWholeNumber(value) && value.trim() !== "" && (
          <p className="mb-3 text-sm text-zinc-500">rookie score</p>
        )}
        {needsComment(valueScore) && (
          <textarea
            placeholder="Why did you score Value this low/high?"
            value={valueComment}
            onChange={(e) => setValueComment(e.target.value)}
            className={textareaClass}
          />
        )}

        <textarea
          placeholder="General comment"
          value={generalComment}
          onChange={(e) => setGeneralComment(e.target.value)}
          className={textareaClass}
        />

        {error && (
          <div className="mb-4 rounded-2xl bg-red-950 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-white py-3 font-semibold text-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Submit Review"}
        </button>
      </div>
    </main>
  );
}
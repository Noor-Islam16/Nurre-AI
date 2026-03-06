// ============================================================
// Nuree Scoring Engine – Unit Tests
// Run with: npx tsx lib/scoringEngine.test.ts
// ============================================================

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  scorePair,
  buildRegulationVector,
  computeFSS,
  computeGL,
  computeCFI,
  assignLoop,
  runCalibration,
} from "./scoringEngine";
import type { PairBehaviourData } from "../types/calibration";

const SAMPLE_PAIRS: PairBehaviourData[] = [
  {
    pair_index: 1,
    track_a_id: "track_01",
    track_b_id: "track_02",
    final_choice: "A",
    decision_time_ms: 1500,
    replay_count_total: 1,
    switch_count: 0,
  },
  {
    pair_index: 2,
    track_a_id: "track_03",
    track_b_id: "track_04",
    final_choice: "A",
    decision_time_ms: 3000,
    replay_count_total: 2,
    switch_count: 1,
  },
  {
    pair_index: 3,
    track_a_id: "track_05",
    track_b_id: "track_06",
    final_choice: "B",
    decision_time_ms: 2000,
    replay_count_total: 1,
    switch_count: 0,
  },
  {
    pair_index: 4,
    track_a_id: "track_07",
    track_b_id: "track_08",
    final_choice: "B",
    decision_time_ms: 1800,
    replay_count_total: 0,
    switch_count: 0,
  },
  {
    pair_index: 5,
    track_a_id: "track_09",
    track_b_id: "track_10",
    final_choice: "A",
    decision_time_ms: 1300,
    replay_count_total: 0,
    switch_count: 0,
  },
];

describe("scorePair", () => {
  it("returns friction in [0,1]", () => {
    SAMPLE_PAIRS.forEach((pair) => {
      const r = scorePair(pair);
      assert.ok(r.friction >= 0 && r.friction <= 1);
    });
  });

  it("returns strength in [0.15, 1.0]", () => {
    SAMPLE_PAIRS.forEach((pair) => {
      const r = scorePair(pair);
      assert.ok(r.strength >= 0.15 && r.strength <= 1.0);
    });
  });

  it("axis_value is positive when Pair 1 choice is A", () => {
    assert.ok(scorePair(SAMPLE_PAIRS[0]).axis_value > 0);
  });

  it("axis_value is negative when Pair 2 choice is A (direction -1)", () => {
    assert.ok(scorePair(SAMPLE_PAIRS[1]).axis_value < 0);
  });

  it("zero signals → friction 0, strength 1.0", () => {
    const r = scorePair({
      pair_index: 1,
      track_a_id: "track_01",
      track_b_id: "track_02",
      final_choice: "A",
      decision_time_ms: 0,
      replay_count_total: 0,
      switch_count: 0,
    });
    assert.equal(r.friction, 0);
    assert.equal(r.strength, 1.0);
  });

  it("maxed signals → friction 1, strength 0.15", () => {
    const r = scorePair({
      pair_index: 1,
      track_a_id: "track_01",
      track_b_id: "track_02",
      final_choice: "A",
      decision_time_ms: 99999,
      replay_count_total: 99,
      switch_count: 99,
    });
    assert.equal(r.friction, 1);
    assert.equal(r.strength, 0.15);
  });
});

describe("computeGL", () => {
  it("returns GL 5 for high positive vector", () => {
    assert.equal(computeGL({ x1: 0.8, x2: 0.5, x3: 0.5, x4: 0.5, x5: 0.9 }), 5);
  });
  it("returns GL 1 for strongly negative vector", () => {
    assert.equal(
      computeGL({ x1: -0.9, x2: -0.9, x3: -0.9, x4: -0.9, x5: -0.9 }),
      1,
    );
  });
  it("returns GL 3 for zero vector", () => {
    assert.equal(computeGL({ x1: 0, x2: 0, x3: 0, x4: 0, x5: 0 }), 3);
  });
});

describe("computeFSS", () => {
  it("produces format: 5 direction bits - 5 confidence bins", () => {
    const scores = SAMPLE_PAIRS.map(scorePair);
    const fss = computeFSS(buildRegulationVector(scores), scores);
    assert.match(fss, /^[01]{5}-[0-3]{5}$/);
  });
});

describe("computeCFI", () => {
  it("returns value between 0 and 100", () => {
    const scores = SAMPLE_PAIRS.map(scorePair);
    const cfi = computeCFI(scores, SAMPLE_PAIRS);
    assert.ok(cfi >= 0 && cfi <= 100);
  });

  it("perfect calibration → CFI = 100", () => {
    const perfect = SAMPLE_PAIRS.map((p) => ({
      ...p,
      decision_time_ms: 0,
      replay_count_total: 0,
      switch_count: 0,
    }));
    const cfi = computeCFI(perfect.map(scorePair), perfect);
    assert.ok(Math.abs(cfi - 100) < 1);
  });
});

describe("assignLoop", () => {
  it("assigns Deep Focus for GL 5 with strong x1, x4, x5", () => {
    assert.equal(
      assignLoop(5, { x1: 0.8, x2: 0.1, x3: 0.1, x4: 0.5, x5: 0.7 }),
      "Deep Focus",
    );
  });
  it("assigns Ground for GL 4 with x5 > 0.20", () => {
    assert.equal(
      assignLoop(4, { x1: 0.1, x2: 0.1, x3: 0.1, x4: 0.1, x5: 0.5 }),
      "Ground",
    );
  });
  it("assigns Reset for low GL, negative x3 and x1", () => {
    assert.equal(
      assignLoop(2, { x1: -0.5, x2: 0.1, x3: -0.6, x4: 0.1, x5: 0.1 }),
      "Reset",
    );
  });
  it("assigns Start for GL ≤ 2 with positive x1", () => {
    assert.equal(
      assignLoop(2, { x1: 0.5, x2: -0.1, x3: -0.1, x4: -0.1, x5: -0.1 }),
      "Start",
    );
  });
  it("assigns Flow as default fallback", () => {
    assert.equal(assignLoop(3, { x1: 0, x2: 0, x3: 0, x4: 0, x5: 0 }), "Flow");
  });
});

describe("runCalibration", () => {
  it("returns all required output fields", () => {
    const result = runCalibration(SAMPLE_PAIRS);
    [
      "fss",
      "gl",
      "cfi",
      "assigned_loop",
      "regulation_vector",
      "model_version",
      "key_version",
    ].forEach((key) => {
      assert.ok(key in result);
    });
  });
  it("throws if fewer than 5 pairs", () => {
    assert.throws(() => runCalibration(SAMPLE_PAIRS.slice(0, 3)));
  });
  it("throws if a pair_index is missing", () => {
    const bad = SAMPLE_PAIRS.map((p, i) =>
      i === 0 ? { ...p, pair_index: 3 as 1 | 2 | 3 | 4 | 5 } : p,
    );
    assert.throws(() => runCalibration(bad));
  });
  it("model_version and key_version are correct", () => {
    const result = runCalibration(SAMPLE_PAIRS);
    assert.equal(result.model_version, "nuree_cal_v1");
    assert.equal(result.key_version, "key_v1");
  });
});

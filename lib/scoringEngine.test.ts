// ============================================================
// Nuree Scoring Engine – Unit Tests (Tree-Based)
// Run with: npx tsx lib/scoringEngine.test.ts
// ============================================================

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  walkTree,
  getNextNode,
  resolveResult,
  runCalibration,
  TRACK_IDS,
} from "./scoringEngine";
import type { PairBehaviourData } from "../types/calibration";

const SAMPLE_PAIRS_FLOW: PairBehaviourData[] = [
  {
    pair_index: 1,
    track_a_id: "clip_01",
    track_b_id: "clip_10",
    final_choice: "B", // HIGH branch
    decision_time_ms: 1500,
    replay_count_total: 1,
    switch_count: 0,
  },
  {
    pair_index: 2,
    track_a_id: "clip_07",
    track_b_id: "clip_09",
    final_choice: "B", // Flow range
    decision_time_ms: 3000,
    replay_count_total: 2,
    switch_count: 1,
  },
  {
    pair_index: 3,
    track_a_id: "clip_09",
    track_b_id: "clip_10",
    final_choice: "A", // Flow + No-Pulse
    decision_time_ms: 2000,
    replay_count_total: 1,
    switch_count: 0,
  },
];

describe("walkTree", () => {
  it("traverses correct depth based on choices length", () => {
    const { depth } = walkTree(["B", "B"]);
    assert.equal(depth, 2);
  });
});

describe("getNextNode", () => {
  it("returns next node when decision tree is not at leaf", () => {
    const node = getNextNode(["B"]);
    assert.ok(node !== null);
    assert.equal(node.track_a_id, TRACK_IDS.clip_7);
  });

  it("returns null when decision tree is at leaf", () => {
    const node = getNextNode(["B", "B", "A"]);
    assert.equal(node, null);
  });
});

describe("resolveResult", () => {
  it("resolves to Flow Mode with No-Pulse flag for B-B-A path", () => {
    const result = resolveResult(["B", "B", "A"]);
    assert.equal(result.brain_mode, "Flow");
    assert.equal(result.flag, "No-Pulse");
  });

  it("resolves to Deep Focus with Deep Reset Mode flag for B-A-A path", () => {
    const result = resolveResult(["B", "A", "A"]);
    assert.equal(result.brain_mode, "Deep Focus");
    assert.equal(result.flag, "Deep Reset Mode");
  });

  it("throws if choices array does not reach leaf node", () => {
    assert.throws(() => resolveResult(["B"]));
  });
});

describe("runCalibration", () => {
  it("returns all required output fields on completion", () => {
    const result = runCalibration(SAMPLE_PAIRS_FLOW);
    assert.equal(result.brain_mode, "Flow");
    assert.equal(result.flag, "No-Pulse");
    assert.equal(result.assigned_loop, "Flow");
    assert.equal(result.path_length, 3);
    assert.equal(result.model_version, "nuree_tree_v1");
  });
});

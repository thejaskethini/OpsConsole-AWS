import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatBytes,
  formatCurrency,
  formatPercent,
  formatDate,
  formatDateTime,
} from "../src/lib/formatters";

describe("Formatters Unit Tests", () => {
  describe("formatBytes", () => {
    it("handles zero and negative values", () => {
      assert.equal(formatBytes(0), "0 B");
      assert.equal(formatBytes(-100), "0 B");
      assert.equal(formatBytes(NaN), "0 B");
    });

    it("formats bytes, KB, MB, GB properly", () => {
      assert.equal(formatBytes(500), "500 B");
      assert.equal(formatBytes(1024), "1 KB");
      assert.equal(formatBytes(1024 * 1024), "1 MB");
      assert.equal(formatBytes(1024 * 1024 * 1024 * 2.5), "2.5 GB");
    });
  });

  describe("formatCurrency", () => {
    it("formats USD currency values correctly", () => {
      assert.equal(formatCurrency(0), "$0.00");
      assert.equal(formatCurrency(1234.56), "$1,234.56");
      assert.equal(formatCurrency(NaN), "$0.00");
    });
  });

  describe("formatPercent", () => {
    it("formats percentages with specified precision", () => {
      assert.equal(formatPercent(45.678, 1), "45.7%");
      assert.equal(formatPercent(100, 0), "100%");
      assert.equal(formatPercent(NaN), "0.0%");
    });
  });

  describe("formatDate and formatDateTime", () => {
    it("handles null, undefined, and invalid inputs gracefully", () => {
      assert.equal(formatDate(null), "—");
      assert.equal(formatDate(undefined), "—");
      assert.equal(formatDate("invalid-date"), "—");
      assert.equal(formatDateTime(null), "—");
      assert.equal(formatDateTime("invalid-date"), "—");
    });

    it("formats valid date strings correctly", () => {
      const formatted = formatDate("2026-09-11T12:00:00Z");
      assert.ok(formatted.includes("2026"));
      assert.ok(formatted.includes("Sep"));
    });
  });
});

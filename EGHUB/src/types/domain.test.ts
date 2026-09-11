import { describe, expect, it } from "vitest";
import { canPublish, isStaff, publishStatuses, staffRoles } from "./domain";

describe("role permissions", () => {
  it("keeps customer accounts outside the staff boundary", () => {
    expect(staffRoles).toEqual(["owner", "admin", "editor", "support"]);
    expect(isStaff("customer")).toBe(false);
    expect(isStaff("support")).toBe(true);
  });

  it("limits publishing to owners and admins", () => {
    expect(canPublish("owner")).toBe(true);
    expect(canPublish("admin")).toBe(true);
    expect(canPublish("editor")).toBe(false);
    expect(canPublish("support")).toBe(false);
  });

  it("exposes the complete publication lifecycle", () => {
    expect(publishStatuses).toEqual([
      "draft",
      "review",
      "scheduled",
      "published",
      "archived",
    ]);
  });
});

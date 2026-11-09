import { describe, expect, it } from "vitest";
import { mediaBelongsToOrganization, organizationMediaPath } from "./organization-media";
const foxes = "e86537c9-7b90-4d0c-9407-864fa638c544";
const other = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const file = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
describe("organization media boundary", () => {
  it("prefixes new files with the authorized organization", () => {
    expect(organizationMediaPath(foxes, "photos", "photo.JPG", file)).toBe(`organizations/${foxes}/photos/${file}.jpg`);
  });
  it("preserves legacy photos only for Foxes", () => {
    expect(mediaBelongsToOrganization("tournaments/old.jpg", foxes, foxes)).toBe(true);
    expect(mediaBelongsToOrganization("tournaments/old.jpg", other, foxes)).toBe(false);
  });
  it("refuses signing another organization's file", () => {
    expect(mediaBelongsToOrganization(`organizations/${other}/photos/image.jpg`, foxes, foxes)).toBe(false);
  });
  it("rejects traversal and malformed paths", () => {
    expect(mediaBelongsToOrganization(`organizations/${foxes}/photos/../secret.jpg`, foxes, foxes)).toBe(false);
    expect(mediaBelongsToOrganization("/tournaments/old.jpg", foxes, foxes)).toBe(false);
  });
});
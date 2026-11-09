import { describe,expect,it } from "vitest";
import { organizationSlug,invitationIsUsable,safeColor } from "./platform-validation";
describe('organization requirements',()=>{
 it('creates normalized organization slugs',()=>expect(organizationSlug('Club de Fléchettes — Lille')).toBe('club-de-flechettes-lille'));
 it('rejects expired invitations',()=>expect(invitationIsUsable('pending','2026-11-09T00:00:00Z',Date.parse('2026-11-10T00:00:00Z'))).toBe(false));
 it('rejects accepted invitations on reuse',()=>expect(invitationIsUsable('accepted','2026-11-20T00:00:00Z',Date.parse('2026-11-10T00:00:00Z'))).toBe(false));
 it('accepts pending unexpired invitations',()=>expect(invitationIsUsable('pending','2026-11-20T00:00:00Z',Date.parse('2026-11-10T00:00:00Z'))).toBe(true));
 it('rejects unsafe branding values',()=>expect(()=>safeColor('url(javascript:alert(1))')).toThrow());
});
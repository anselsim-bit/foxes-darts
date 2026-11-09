import { describe, expect, it } from 'vitest';
import { oauthReturnPath } from './oauth-return-path';
describe('OAuth return paths', () => {
  it('preserves consent authorization, query and fragment', () => expect(oauthReturnPath('/.lovable/oauth/consent?authorization_id=abc#decision')).toBe('/.lovable/oauth/consent?authorization_id=abc#decision'));
  it.each(['//outside.invalid', '/\\outside.invalid/', '/ok\n', 'https://outside.invalid', null])('rejects unsafe return %s', (value) => expect(oauthReturnPath(value)).toBe('/'));
  it('does not decode an already validated path again', () => expect(oauthReturnPath('/%2f/invalid')).toBe('/%2f/invalid'));
});

import { describe, expect, it } from 'vitest';
import { oauthReturnPath } from './oauth-return-path';
describe('OAuth return paths', () => {
  it('preserves consent authorization, query and fragment', () => expect(oauthReturnPath('/.lovable/oauth/consent?authorization_id=abc#decision')).toBe('/.lovable/oauth/consent?authorization_id=abc#decision'));
  it.each(['//outside.invalid', '/\\outside.invalid/', '/ok\n', 'https://outside.invalid', null, '/%2f/invalid'])('rejects unsafe return %s', (value) => {
    if (value === '/%2f/invalid') expect(oauthReturnPath(value)).toBe('/%2f/invalid');
    else expect(oauthReturnPath(value)).toBe('/');
  });
});

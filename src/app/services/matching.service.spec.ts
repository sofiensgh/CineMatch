import { MatchingService } from './matching.service';
import { User } from '../models/user';

function user(uid: string, favorites: string[], isDisabled = false): User {
  return {
    uid,
    email: `${uid}@test.com`,
    nom: 'Nom',
    prenom: 'Prenom',
    age: 20,
    photoUrl: '',
    role: 'user',
    isDisabled,
    favorites
  };
}

describe('MatchingService', () => {
  const service = new MatchingService();

  it('returns 100 for identical playlists', () => {
    expect(MatchingService.computeRate(['1', '2', '3'], ['3', '2', '1'])).toBe(100);
  });

  it('returns 0 for disjoint or empty playlists', () => {
    expect(MatchingService.computeRate(['1', '2'], ['3', '4'])).toBe(0);
    expect(MatchingService.computeRate([], ['1'])).toBe(0);
  });

  it('computes the Sørensen–Dice coefficient', () => {
    expect(MatchingService.computeRate(['1', '2', '3', '4'], ['1', '2', '3', '5'])).toBe(75);
  });

  it('keeps only matches strictly above 75%', () => {
    const current = user('me', ['1', '2', '3', '4']);
    const matches = service.getMatches(current, [
      user('identical', ['1', '2', '3', '4']),
      user('close', ['1', '2', '3']),
      user('exact', ['1', '2', '3', '5']),
      user('low', ['1', '2', '8', '9'])
    ]);
    expect(matches.map(m => m.user.uid)).toEqual(['identical', 'close']);
    expect(matches[1].commonIds).toEqual(['1', '2', '3']);
  });

  it('ignores disabled users and the current user', () => {
    const current = user('me', ['1', '2']);
    expect(service.getMatches(current, [current, user('off', ['1', '2'], true)])).toEqual([]);
  });
});

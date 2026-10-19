import { Injectable } from '@angular/core';

import { User } from '../models/user';

export const MATCH_THRESHOLD = 75;

export interface UserMatch {
  user: User;
  rate: number;
  commonIds: string[];
}

@Injectable({ providedIn: 'root' })
export class MatchingService {
  static computeRate(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    if (setA.size === 0 || setB.size === 0) return 0;
    const common = [...setA].filter(id => setB.has(id)).length;
    return Math.round(((2 * common) / (setA.size + setB.size)) * 100);
  }

  getMatches(current: User, users: User[], threshold = MATCH_THRESHOLD): UserMatch[] {
    const mine = new Set(current.favorites);
    return users
      .filter(u => u.uid !== current.uid && !u.isDisabled)
      .map(u => ({
        user: u,
        rate: MatchingService.computeRate(current.favorites, u.favorites),
        commonIds: [...new Set(u.favorites)].filter(id => mine.has(id))
      }))
      .filter(m => m.rate > threshold)
      .sort((a, b) => b.rate - a.rate);
  }
}

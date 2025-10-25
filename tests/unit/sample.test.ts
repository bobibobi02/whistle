import { sum } from '@/utils/math';

describe('sum utility function', () => {
  it('correctly sums two numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });
});

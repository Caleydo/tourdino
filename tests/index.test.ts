/// <reference types="jasmine" />

export const PRECISION = 6; // difference of values must be <= 0,0000005 (10e-6/2)

describe('Jasmine Test', () => {
  it('close to', () => {
    expect(0.5).toBeCloseTo(0.5+ 0.0000005, 6);
    expect(0.5).not.toBeCloseTo(0.5+ 0.0000006, 6);
    expect(6.5).toBeCloseTo(6.5 + 0.0000005, 6);
    expect(6.5).not.toBeCloseTo(6.5 + 0.0000006, 6);
 });
});

import {describe,it,expect} from 'vitest';
import {fftCoefficients} from '../src/features/fourier/fft';
import {directDft,discreteRmse,chooseCoefficients} from '../src/features/fourier/dft';
const signal=(n:number)=>Array.from({length:n},(_,i)=>{
  const t=i/n;
  return {x:.12+Math.cos(2*Math.PI*t)+.2*Math.cos(6*Math.PI*t),y:-.3+Math.sin(2*Math.PI*t)-.15*Math.sin(4*Math.PI*t)};
});
describe('radix-2 signed FFT',()=>{
  for(const n of [4,8,32,256,512])it('agrees with direct DFT, n='+n,()=>{
    const samples=signal(n),slow=directDft(samples),fast=fftCoefficients(samples);
    fast.forEach((c,i)=>{
      expect(c.frequency).toBe(slow[i].frequency);
      expect(c.re).toBeCloseTo(slow[i].re,9);
      expect(c.im).toBeCloseTo(slow[i].im,9);
    });
    expect(discreteRmse(samples,chooseCoefficients(fast,n-1))).toBeLessThan(1e-8);
  });
  it('rejects invalid sample sizes and nonfinite coordinates',()=>{
    expect(()=>fftCoefficients(signal(30))).toThrow(/power-of-two/);
    expect(()=>fftCoefficients([...signal(8).slice(0,7),{x:Infinity,y:0}])).toThrow(/Non-finite/);
  });
});
import type { Point } from '../paths/path';
import type { Coefficient } from './dft';

/** Radix-2 signed complex FFT, normalized identically to directDft. */
export function fftCoefficients(samples: readonly Point[]): Coefficient[] {
  const n = samples.length;
  if (n < 4 || n > 4096 || (n & (n-1)) !== 0) throw new Error('Expected power-of-two samples (4..4096).');
  if (samples.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error('Non-finite coordinate.');
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i=0; i<n; i++) {
    let rev=0;
    for (let bit=1,j=i; bit<n; bit<<=1,j>>>=1) rev=(rev<<1)|(j&1);
    re[rev]=samples[i].x; im[rev]=samples[i].y;
  }
  for (let length=2; length<=n; length<<=1) {
    const angle=-2*Math.PI/length, wr0=Math.cos(angle), wi0=Math.sin(angle);
    for (let start=0; start<n; start+=length) {
      let wr=1, wi=0;
      for (let j=0; j<length/2; j++) {
        const a=start+j, b=a+length/2;
        const vr=re[b]*wr-im[b]*wi, vi=re[b]*wi+im[b]*wr;
        const ur=re[a], ui=im[a];
        re[a]=ur+vr; im[a]=ui+vi; re[b]=ur-vr; im[b]=ui-vi;
        const next=wr*wr0-wi*wi0;
        wi=wr*wi0+wi*wr0; wr=next;
      }
    }
  }
  return Array.from({length:n},(_,i)=>({
    frequency: i > n/2 ? i-n : i, re:re[i]/n, im:im[i]/n
  }));
}

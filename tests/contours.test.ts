import {describe,it,expect} from 'vitest';
import {traceContours,DEFAULT_TRACE_OPTIONS} from '../src/features/import/contours';
const image=(w:number,h:number,boxes:{x:number;y:number;w:number;h:number}[])=>{
  const data=new Uint8ClampedArray(w*h*4).fill(255);
  for(const b of boxes)for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
    const i=4*(y*w+x);data[i]=data[i+1]=data[i+2]=0;
  }
  return data;
};
const opt={...DEFAULT_TRACE_OPTIONS,minPerimeter:4,simplify:0};
describe('binary contour extraction',()=>{
  it('keeps separate shapes as separate closed paths',()=>{
    const paths=traceContours(image(28,18,[{x:2,y:3,w:5,h:6},{x:17,y:3,w:7,h:8}]),28,18,opt);
    expect(paths).toHaveLength(2);
    paths.forEach(p=>{expect(p.closed).toBe(true);expect(p.points.length).toBeGreaterThan(3);});
  });
  it('rejects blank images',()=>expect(traceContours(image(10,10,[]),10,10,opt)).toEqual([]));
  it('composites alpha and supports inversion',()=>{
    const data=image(12,12,[{x:2,y:2,w:6,h:6}]);
    // Inverting a dark island leaves a light frame with an inner hole: two boundary loops.
    expect(traceContours(data,12,12,{...opt,invert:true})).toHaveLength(2);
    data.fill(0);
    expect(traceContours(data,12,12,opt)).toHaveLength(0);
  });
  it('validates raster payload size',()=>expect(()=>traceContours(new Uint8ClampedArray(5),10,10,opt)).toThrow(/RGBA/));
});
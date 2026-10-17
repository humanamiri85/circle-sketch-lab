import type { Point, Stroke } from '../paths/path';
export type TraceOptions = Readonly<{
  threshold: number; invert: boolean; minPerimeter: number; maxPaths: number; simplify: number;
}>;
export const DEFAULT_TRACE_OPTIONS: TraceOptions = {
  threshold: 128, invert: false, minPerimeter: 12, maxPaths: 8, simplify: 0.75,
};
type P = {x:number;y:number};
type Edge = {a:P;b:P;used:boolean};
const key=(p:P)=>p.x+','+p.y;
function distanceToLine(p:P,a:P,b:P):number{
  const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
  return d===0?Math.hypot(p.x-a.x,p.y-a.y):Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)/d;
}
function simplifyLoop(points:readonly P[],eps:number):P[]{
  if(eps<=0||points.length<5)return [...points];
  const mid=Math.floor(points.length/2);
  const rec=(a:P,b:P,inner:readonly P[]):P[]=>{
    let far=0,index=-1;
    inner.forEach((p,i)=>{const d=distanceToLine(p,a,b);if(d>far){far=d;index=i;}});
    if(index<0||far<=eps)return [a,b];
    return [...rec(a,inner[index],inner.slice(0,index)),...rec(inner[index],b,inner.slice(index+1)).slice(1)];
  };
  return [...rec(points[0],points[mid],points.slice(1,mid)),...rec(points[mid],points[0],points.slice(mid+1)).slice(1,-1)];
}
/** Extract separate ordered polygon boundaries of a thresholded image.
 * This extracts dark/light silhouettes, not all internal photorealistic edges.
 */
export function traceContours(rgba:Uint8ClampedArray,width:number,height:number,options:TraceOptions=DEFAULT_TRACE_OPTIONS):Stroke[]{
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>512*512)
    throw new Error('Invalid raster dimensions');
  if(rgba.length!==4*width*height)throw new Error('Invalid RGBA buffer length');
  const {threshold,invert,minPerimeter,maxPaths,simplify}=options;
  if(!Number.isFinite(threshold)||threshold<0||threshold>255||!Number.isFinite(minPerimeter)||minPerimeter<0||
    !Number.isFinite(simplify)||simplify<0||!Number.isInteger(maxPaths)||maxPaths<1||maxPaths>24)
    throw new Error('Invalid tracing options');
  const mask=new Uint8Array(width*height);
  for(let i=0;i<mask.length;i++){
    const j=i*4,a=rgba[j+3]/255;
    const light=(.2126*rgba[j]+.7152*rgba[j+1]+.0722*rgba[j+2])*a+255*(1-a);
    mask[i]=(invert?light>=threshold:light<threshold)?1:0;
  }
  const on=(x:number,y:number)=>x>=0&&y>=0&&x<width&&y<height&&mask[y*width+x]===1;
  const edges:Edge[]=[];
  const starts=new Map<string,number[]>();
  const add=(a:P,b:P)=>{
    const n=edges.push({a,b,used:false})-1,k=key(a);
    const arr=starts.get(k)||[];arr.push(n);starts.set(k,arr);
  };
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(on(x,y)){
    if(!on(x,y-1))add({x,y},{x:x+1,y});
    if(!on(x+1,y))add({x:x+1,y},{x:x+1,y:y+1});
    if(!on(x,y+1))add({x:x+1,y:y+1},{x,y:y+1});
    if(!on(x-1,y))add({x,y:y+1},{x,y});
  }
  const loops:{pts:P[];perimeter:number}[]=[];
  for(const edge of edges){
    if(edge.used)continue;
    const start=edge.a,pts:P[]=[];
    let current:Edge|undefined=edge,perimeter=0,ending=start;
    while(current&&!current.used){
      current.used=true;pts.push(current.a);ending=current.b;
      perimeter+=Math.hypot(current.b.x-current.a.x,current.b.y-current.a.y);
      if(key(ending)===key(start))break;
      const d={x:current.b.x-current.a.x,y:current.b.y-current.a.y};
      const candidates:number[]=(starts.get(key(ending))||[]).filter((idx:number)=>!edges[idx].used);
      if(!candidates.length){current=undefined;break;}
      const rank=(e:Edge)=>{
        const v={x:e.b.x-e.a.x,y:e.b.y-e.a.y},cross=d.x*v.y-d.y*v.x,dot=d.x*v.x+d.y*v.y;
        return cross>0?0:dot>0?1:cross<0?2:3;
      };
      candidates.sort((a,b)=>rank(edges[a])-rank(edges[b]));
      current=edges[candidates[0]];
      if(pts.length>edges.length)throw new Error('Contour traversal exceeded edge budget');
    }
    if(current&&key(ending)===key(start)&&pts.length>=4&&perimeter>=minPerimeter)loops.push({pts,perimeter});
  }
  loops.sort((a,b)=>b.perimeter-a.perimeter);
  const scale=2/Math.max(width,height);
  return loops.slice(0,maxPaths).map((loop,i)=>{
    let simplified=simplifyLoop(loop.pts,simplify);if(simplified.length<3)simplified=loop.pts;
    const points:Point[]=simplified.map(p=>({x:(p.x-width/2)*scale,y:(height/2-p.y)*scale}));
    return {name:'Contour '+(i+1),points,closed:true};
  });
}

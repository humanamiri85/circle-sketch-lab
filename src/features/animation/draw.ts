import type {Point,Stroke} from '../paths/path';
import {pointAt} from '../paths/path';
import type {Coefficient} from '../fourier/dft';
import {reconstruct,epicycles} from '../fourier/dft';
export type DisplayOptions=Readonly<{showCircles:boolean;showOriginal:boolean;showTrace:boolean}>;
type MapPoint=(p:Point)=>[number,number];
export function screenToWorld(canvas:HTMLCanvasElement,clientX:number,clientY:number):Point{
  const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width,rect.height)*.37;
  return {x:(clientX-rect.left-rect.width/2)/scale,y:-(clientY-rect.top-rect.height/2)/scale};
}
function paint(ctx:CanvasRenderingContext2D,points:readonly Point[],map:MapPoint,color:string,lineWidth:number,closed=false){
  if(points.length<2)return;
  ctx.beginPath();ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=lineWidth;ctx.strokeStyle=color;
  let [x,y]=map(points[0]);ctx.moveTo(x,y);
  for(let i=1;i<points.length;i++){[x,y]=map(points[i]);ctx.lineTo(x,y);}
  if(closed)ctx.closePath();
  ctx.stroke();
}
/** An ordered playlist of independent Fourier contours; never draw connecting ink. */
export function renderScene(canvas:HTMLCanvasElement,strokes:readonly Stroke[],sets:readonly (readonly Coefficient[])[],phase:number,opts:DisplayOptions,draft:readonly Point[]=[]){
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
  if(!w||!h)return;
  const dpr=Math.min(2,window.devicePixelRatio||1),cw=Math.round(w*dpr),ch=Math.round(h*dpr);
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  ctx.fillStyle='#091326';ctx.fillRect(0,0,w,h);
  const scale=Math.min(w,h)*.37,map:MapPoint=p=>[w/2+p.x*scale,h/2-p.y*scale];
  ctx.strokeStyle='rgba(166,190,229,.07)';ctx.lineWidth=1;
  for(let i=-6;i<=6;i++){
    const d=i*scale/4;
    ctx.beginPath();ctx.moveTo(w/2+d,0);ctx.lineTo(w/2+d,h);
    ctx.moveTo(0,h/2+d);ctx.lineTo(w,h/2+d);ctx.stroke();
  }
  ctx.strokeStyle='rgba(124,164,225,.18)';ctx.beginPath();
  ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
  if(opts.showOriginal)for(const stroke of strokes){
    const pts=Array.from({length:300},(_,i)=>pointAt(stroke,stroke.closed?i/300:i/299));
    ctx.setLineDash([5,7]);paint(ctx,pts,map,'rgba(146,164,199,.45)',1.3,stroke.closed);ctx.setLineDash([]);
  }
  if(strokes.length>0){
    const p=Math.max(0,Math.min(1,phase)),active=Math.min(strokes.length-1,Math.floor(p*strokes.length));
    const local=p>=1?1:p*strokes.length-active;
    if(opts.showTrace)for(let k=0;k<=active;k++){
      const coeff=sets[k]||[],fraction=k<active?1:local;
      if(!coeff.length)continue;
      const limit=strokes[k].closed?fraction:Math.min(.5,fraction);
      if(limit<=0)continue;
      const count=Math.min(450,Math.max(2,Math.ceil(limit*450)));
      const points=Array.from({length:count},(_,i)=>reconstruct(coeff,limit*i/(count-1)));
      paint(ctx,points,map,'#65f0cc',2.5);
    }
    const current=sets[active]||[];
    if(opts.showCircles)for(const circle of epicycles(current,local)){
      const [cx,cy]=map({x:circle.x,y:circle.y}),[ex,ey]=map({x:circle.endX,y:circle.endY});
      if(circle.frequency!==0&&circle.radius>1e-6){
        ctx.beginPath();ctx.arc(cx,cy,circle.radius*scale,0,Math.PI*2);
        ctx.lineWidth=1;ctx.strokeStyle='rgba(114,168,242,.28)';ctx.stroke();
      }
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(ex,ey);
      ctx.lineWidth=1.25;ctx.strokeStyle='rgba(168,202,254,.75)';ctx.stroke();
    }
    if(current.length){
      const tip=reconstruct(current,local),[x,y]=map(tip);
      ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fillStyle='#a5fff1';ctx.fill();
      ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.strokeStyle='rgba(101,240,204,.28)';ctx.stroke();
    }
  }
  if(draft.length)paint(ctx,draft,map,'#fbbf82',3);
}

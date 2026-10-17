/** Local-only image decoding and bounded downsampling before worker tracing. */
export async function resizeImage(file:File,maxSide=224):Promise<ImageData>{
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise<HTMLImageElement>((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error('Cannot decode image.'));
      image.src=url;
    });
    const width=img.naturalWidth,height=img.naturalHeight;
    if(!width||!height||width*height>100_000_000)throw new Error('Unsupported image dimensions.');
    const scale=Math.min(1,maxSide/Math.max(width,height));
    const w=Math.max(2,Math.round(width*scale)),h=Math.max(2,Math.round(height*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw new Error('Canvas unavailable.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
    ctx.drawImage(img,0,0,w,h);
    return ctx.getImageData(0,0,w,h);
  }finally{URL.revokeObjectURL(url);}
}
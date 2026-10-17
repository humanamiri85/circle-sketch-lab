/// <reference lib="webworker" />
import {traceContours} from '../features/import/contours';
import type {TraceOptions} from '../features/import/contours';
type Request={id:number;rgba:ArrayBuffer;width:number;height:number;options:TraceOptions};
self.onmessage=(e:MessageEvent<Request>)=>{
  const {id,rgba,width,height,options}=e.data;
  try{
    const strokes=traceContours(new Uint8ClampedArray(rgba),width,height,options);
    self.postMessage({id,strokes});
  }catch(error){
    self.postMessage({id,error:error instanceof Error?error.message:'Contour extraction failed.'});
  }
};
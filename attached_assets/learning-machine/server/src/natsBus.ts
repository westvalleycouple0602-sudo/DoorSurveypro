import 'dotenv/config';
import { connect, StringCodec } from 'nats';

const sc = StringCodec();
let ncPromise: Promise<any> | null = null;

async function getConn(){
  if(!ncPromise){
    ncPromise = connect({ servers: process.env.NATS_URL });
  }
  return ncPromise;
}

export async function publish(subject: string, payload: any){
  const nc = await getConn();
  nc.publish(subject, sc.encode(JSON.stringify(payload)));
}

import { createDatabase } from '../src/infrastructure/database.ts';
import { prepareSuccessor } from '../src/infrastructure/stripe-test/recovery-store.ts';
process.once('message',async (value: {url:string; subjectId:string; instance:string; evidence:unknown; head:string}) => {
  const target = new URL(value.url);
  if (target.hostname !== '127.0.0.1' || target.port !== '56322' || target.username !== 'delivery_api') process.exit(1);
  const db = createDatabase(value.url);
  try {
    const next = await prepareSuccessor(db,{subjectId:value.subjectId},value.instance,value.evidence,value.head);
    process.send?.({ok:true,id:next.successorId});
  } catch { process.send?.({ok:false}); }
  finally { await db.$disconnect(); process.disconnect(); }
});

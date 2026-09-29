import { listWells } from './src/services/wellService';

async function test() {
  try {
    const res = await listWells();
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

test();

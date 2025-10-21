import { v7 as uuidv7 } from 'uuid';

for (let i = 0; i < 20; i++) {
  await new Promise((resolve) => setTimeout(resolve, 10));
  console.log(uuidv7());
}

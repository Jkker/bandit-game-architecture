import fs from 'fs';
import path from 'path';
import { INIT_SWITCH_BUDGET, SLOT_COUNT } from './config';
import { EndGameRequest } from './types';

const data: EndGameRequest[] = [];

const addData = (d: EndGameRequest) => {
  data.push(d);
};

const filePath = path.join(
  process.cwd(),
  'logs',
  `${SLOT_COUNT}_${INIT_SWITCH_BUDGET}_${new Date().toISOString()}.json`
);

const onExit = () => {
  fs.writeFileSync(filePath, JSON.stringify(data));
  console.log(`⚡ SERVER | 📝 Tournament log saved to ${filePath}`);
  process.exit(0);
};

process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);
process.on('exit', onExit);

export { addData as saveRecord };

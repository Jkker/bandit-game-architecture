import fs from 'fs';
import teams from '../driver/teams';
import { INIT_SWITCH_BUDGET, SLOT_COUNT } from './config';
import { EndGameRequest } from './types';
import path from 'path';

const data: EndGameRequest[] = [];
const nTeams = teams.length;

const games = Object.fromEntries(teams.map((t) => [t.name, 0]));

const addData = (d: EndGameRequest) => {
  // console.log('📝 Saved Game Record', d);
  data.push(d);
  // games[d.player] += 1;
  // console.log(
  //   '📝 Saved Game Record',
  //   Object.fromEntries(
  //     Object.entries(games).map(([k, v]) => [k, `${v}/${nTeams - 1}`])
  //   )
  // );
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

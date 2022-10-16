const fs = require('fs');
const path = require('path');

const logDir = 'logs';

const logDirPath = path.join(process.cwd(), logDir);

const files = fs.readdirSync(logDirPath);

const teams = [
  {
    name: 'A.C.E.',
    target: 'a.out',
    exe: '',
  },
  {
    name: 'Adult_Onset_Diabetes',
    target: {
      casino: 'casino.py',
      player: 'your_client.py',
    },
    exe: 'python3',
  },
  {
    name: 'Brute_Force',
    target: 'a.out',
    exe: '',
  },
  {
    name: 'Checkmate',
    target: 'checkmate.py',
    exe: 'python3',
  },
  {
    name: 'Coffee_Monsters',
    target: 'coffeemonster.py',
    exe: 'python3',
  },
  {
    name: 'dexters_LabRats',
    target: 'Client2.java',
    exe: 'java',
  },
  {
    name: 'Infancywolf',
    target: 'a.out',
    exe: '',
  },
  {
    name: 'Kitkat_Addicts',
    target: 'cpp_client.out',
    exe: '',
  },
  {
    name: 'Mad_Tacos',
    target: 'client.py',
    exe: 'python3',
  },
  {
    name: 'NULL',
    target: 'null.py',
    exe: 'python3',
  },
  {
    name: 'Pratham',
    target: 'pratham_client.py',
    exe: 'python3',
  },
  {
    name: 'PTO',
    target: 'pto.py',
    exe: 'python3',
  },
  {
    name: 'Shuttlers',
    target: 'shuttlers_client.py',
    exe: 'python3',
  },
  {
    name: 'Timeout',
    target: {
      casino: 'timeout_casino.py',
      player: 'timeout_player.py',
    },
    exe: 'python3',
  },
  {
    name: 'Truman_Logan_Sparrow',
    target: 'tls.py',
    exe: 'python3',
  },
];

const header = [
  'Rank',
  'Team',
  'Avg. Wealth',
  'Casino Error %',
  'Player Error %',
];

const rowToTable = (row) => `| ${row.join(' | ')} |\n`;

const tableHeader = rowToTable(header) + rowToTable(header.map(() => '---'));

const roundTo = (num, places = 2) => {
  const multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
};

const rankStr = (rank) => {
  if (rank === 0) return '🥇';
  if (rank === 1) return '🥈';
  if (rank === 2) return '🥉';
  return rank + 1;
};

const analyze = (data) => {
  const results = Object.fromEntries(
    teams.map((team) => [
      team.name,
      {
        player_total_wealth: 0,
        casino_round: 0,
        player_round: 0,
        casino_error: 0,
        player_error: 0,
      },
    ])
  );

  let maxRound = 0;

  data.forEach((item) => {
    if (item.end_reason.match(/Casino Timed Out/g)) {
      results[item.casino].casino_error += 1;
    }
    if (item.end_reason.match(/Player Timed Out/g)) {
      results[item.player].player_error += 1;
    }
    results[item.casino].casino_round += 1;
    results[item.player].player_round += 1;
    maxRound = Math.max(
      maxRound,
      results[item.casino].casino_round,
      results[item.player].player_round
    );

    results[item.player].player_total_wealth += item.player_wealth;
  });

  const sortedResults = Object.entries(results)
    .map(([key, val]) => [
      key,
      {
        ...val,
        casino_error: roundTo(100 - (val.casino_round / maxRound) * 100),
        player_error: roundTo(100 - (val.player_round / maxRound) * 100),
        // casino_error: roundTo((val.casino_error / val.casino_round) * 100),
        // player_error: roundTo((val.player_error / val.player_round) * 100),
        avg_wealth: Math.round(val.player_total_wealth / val.player_round),
      },
    ])
    .sort((a, b) => b[1].avg_wealth - a[1].avg_wealth);

  const leaderBoard = sortedResults.reduce(
    (acc, [name, { avg_wealth, casino_error, player_error }], rank) =>
      acc +
      rowToTable([
        rankStr(rank),
        name,
        avg_wealth,
        casino_error === 0 ? '' : casino_error + '%',
        player_error === 0 ? '' : player_error + '%',
      ]),
    tableHeader
  );

  console.log(leaderBoard);
};

let tournamentCount = 0;

const loadData = (filename) =>
  JSON.parse(fs.readFileSync(path.join(logDirPath, filename)));

const t = ['14_2', '140_20'];

const data = Object.fromEntries(t.map((item) => [item, []]));

files.forEach((filename) => {
  if (!filename.endsWith('.json')) return;

  let [slots, switches, dt] = filename.split('_');
  const d = loadData(filename);
  if (!d) console.log(filename);
  data[`${slots}_${switches}`] = data[`${slots}_${switches}`].concat(d);
});

console.log(
  `# Tournament: slots=14, switches=2 (${data['14_2'].length} Games Played)\n`
);
analyze(data['14_2']);
console.log(
  `# Tournament: slots=140, switches=20 (${data['140_20'].length} Games Played)\n`
);
analyze(data['140_20']);

// for (const filename of files) {
//   if (!filename.endsWith('.json')) continue;

//   let [slots, switches, dt] = filename.split('_');

//   const time = new Date(dt.replace('.json', ''));

//   const hhmm = time.toLocaleTimeString();

//   console.log(
//     `## Tournament ${++tournamentCount}: ${slots} slots, ${switches.replace(
//       '.json',
//       ''
//     )} switches @${hhmm}\n`
//   );
//   const data = loadData(filename);

//   analyze(data);
// }

import path from 'path';

export interface Team {
  name: string;
  target: string | { casino: string; player: string };
  exe: string;
}

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

const exeMap = {
  '': './',
  python3: '/home/jkker/code/bandit-game-architecture/.venv/bin/python ',
  java: '/usr/bin/java ',
};

export const getCmd = (team: Team) => {
  const name = team.name;

  if (typeof team.target === 'string') {
    const cmd =
      exeMap[team.exe] + path.join('bandit-game-agents', name, team.target);
    return {
      casino: cmd,
      player: cmd,
    };
  }
  return {
    casino:
      exeMap[team.exe] +
      path.join('bandit-game-agents', name, team.target.casino),
    player:
      exeMap[team.exe] +
      path.join('bandit-game-agents', name, team.target.player),
  };
};

export default teams;

if (require.main === module) {
  // const cmds = teams.map((team) => ({ name: team.name, ...getCmd(team) }));
  // // console.log(`🚀 ~ file: teams.ts ~ line 124 ~ cmds`, cmds);
  // const spawn = require('child_process').spawn;
  // for (let t of cmds) {
  //   let c, p;
  //   try {
  //     const cmdList = t.casino.split(' ');
  //     const executable = cmdList[0];
  //     const cmdArgs = cmdList.slice(1);
  //     c = spawn(executable, cmdArgs);
  //     // p = spawn(t.player);
  //   } catch (e) {
  //     console.log("Error: Couldn't spawn", t.name, e);
  //     // console.log(`🚀 ~ file: teams.ts ~ line 131 ~ e`, e);
  //   } finally {
  //     if (c) c.kill();
  //     if (p) p.kill();
  //   }
  // }
  const name = process.argv[2].toLowerCase();
  const team = teams.find((t) => t.name.toLowerCase() === name);

  if (!team) {
    console.log('Team not found');
    process.exit(1);
  }
  console.log(getCmd(team));
}

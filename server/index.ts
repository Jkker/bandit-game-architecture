/**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to use Colyseus Arena
 *
 * If you're self-hosting (without Arena), you can manually instantiate a
 * Colyseus Server as documented here: 👉 https://docs.colyseus.io/server/api/#constructor-options
 */
import { listen } from '@colyseus/arena';
import { connect } from 'mongoose';

// Import arena config
import arenaConfig from './arena.config';
import { MONGODB_URI, PORT, PRODUCTION } from './config';

// Create and listen on 22222 (or PORT environment variable.)
if (PRODUCTION)
  connect(
    MONGODB_URI,
    {
      useNewUrlParser: true,
    } as any,
    () => {
      console.log(`🔵 SERVER | connected to db`);
      listen(arenaConfig, PORT);
    }
  );
else listen(arenaConfig, PORT);

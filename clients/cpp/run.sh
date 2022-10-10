# node ../proxy.js  PATH_TO_SOCKET_FILE  GAME_SERVER_URI  CLIENT_NAME
node ../proxy.js /tmp/bandit.sock ws://localhost:22222 cpp &
sleep 0.5; ./client.out

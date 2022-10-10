# node ../proxy.js  PATH_TO_SOCKET_FILE  GAME_SERVER_URI  CLIENT_NAME
node ../proxy.js /tmp/bandit.sock ws://localhost:22222 java &
java -cp fastjson-1.2.78.jar Client.java

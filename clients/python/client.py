#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import atexit
import socket
import json
import subprocess
import os
import time


class Client:

    def __init__(self) -> None:
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.client_process = None

    def start(self,
              unix_socket_path='/tmp/bandit.sock',
              server_uri="ws://localhost:22222") -> None:
        self.unix_socket_path = unix_socket_path
        if os.path.exists(unix_socket_path):
            os.remove(unix_socket_path)

        self.client_process = subprocess.Popen(
            ['node', 'clients/proxy.js', unix_socket_path, server_uri])

        time.sleep(0.5)
        self.sock.connect(unix_socket_path)
        print('Connected to game client')

        # Register exit handler
        atexit.register(self.exit)

        while True:
            message = self.sock.recv(1024)
            if not message:
                break
            self.on_message(message)

    def on_message(self, message) -> None:
        msg = json.loads(message)
        print(msg)

    def send(self, type, data) -> None:
        self.sock.send(json.dumps({'type': type, 'data': data}).encode())

    def exit(self) -> None:
        print('Exiting')
        self.sock.close()
        self.client_process.kill()
        if os.path.exists(self.unix_socket_path):
            os.remove(self.unix_socket_path)


if __name__ == '__main__':
    client = Client()
    client.start()
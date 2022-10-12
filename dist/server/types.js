"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomInt = exports.MESSAGE_INT = exports.MESSAGE = void 0;
var MESSAGE;
(function (MESSAGE) {
    MESSAGE["AWAIT_CASINO_INIT"] = "AWAIT_CASINO_INIT";
    MESSAGE["AWAIT_CASINO"] = "AWAIT_CASINO";
    MESSAGE["AWAIT_PLAYER"] = "AWAIT_PLAYER";
    MESSAGE["GAME_OVER"] = "GAME_OVER";
    MESSAGE["PULL"] = "PULL";
    MESSAGE["SWITCH"] = "SWITCH";
})(MESSAGE = exports.MESSAGE || (exports.MESSAGE = {}));
var MESSAGE_INT;
(function (MESSAGE_INT) {
    MESSAGE_INT[MESSAGE_INT["AWAIT_CASINO_INIT"] = 0] = "AWAIT_CASINO_INIT";
    MESSAGE_INT[MESSAGE_INT["AWAIT_CASINO"] = 1] = "AWAIT_CASINO";
    MESSAGE_INT[MESSAGE_INT["AWAIT_PLAYER"] = 2] = "AWAIT_PLAYER";
    MESSAGE_INT[MESSAGE_INT["GAME_OVER"] = 3] = "GAME_OVER";
    MESSAGE_INT[MESSAGE_INT["PULL"] = 4] = "PULL";
    MESSAGE_INT[MESSAGE_INT["SWITCH"] = 5] = "SWITCH";
})(MESSAGE_INT = exports.MESSAGE_INT || (exports.MESSAGE_INT = {}));
// Both min and max are inclusive
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max + 1 - min) + min);
}
exports.getRandomInt = getRandomInt;

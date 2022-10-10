"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomInt = exports.MESSAGE = void 0;
var MESSAGE;
(function (MESSAGE) {
    MESSAGE["AWAIT_CASINO_INIT"] = "AWAIT_CASINO_INIT";
    MESSAGE["AWAIT_CASINO"] = "AWAIT_CASINO";
    MESSAGE["AWAIT_PLAYER"] = "AWAIT_PLAYER";
    MESSAGE["GAME_OVER"] = "GAME_OVER";
    MESSAGE["PULL"] = "PULL";
    MESSAGE["SWITCH"] = "SWITCH";
})(MESSAGE = exports.MESSAGE || (exports.MESSAGE = {}));
// Both min and max are inclusive
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max + 1 - min) + min);
}
exports.getRandomInt = getRandomInt;

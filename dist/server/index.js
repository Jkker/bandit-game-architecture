"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to use Colyseus Arena
 *
 * If you're self-hosting (without Arena), you can manually instantiate a
 * Colyseus Server as documented here: 👉 https://docs.colyseus.io/server/api/#constructor-options
 */
const arena_1 = require("@colyseus/arena");
const mongoose_1 = require("mongoose");
// Import arena config
const arena_config_1 = __importDefault(require("./arena.config"));
const config_1 = require("./config");
// Create and listen on 22222 (or PORT environment variable.)
if (config_1.PRODUCTION)
    (0, mongoose_1.connect)(config_1.MONGODB_URI).then((db) => {
        console.log(`🔵 SERVER | connected to ${db.connection.name}`);
        (0, arena_1.listen)(arena_config_1.default, config_1.PORT);
    });
else
    (0, arena_1.listen)(arena_config_1.default, config_1.PORT);

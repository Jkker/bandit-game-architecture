"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../server/types");
class RandomClient {
    casinoActionInit(data) {
        // Set winning slot to a random slot
        return (0, types_1.getRandomInt)(1, data.slot_count);
    }
    casinoAction(data) {
        // Ran out of switch budget
        if (data.switch_budget === 0)
            return 0;
        // Switch winning slot to a random slots with 10% chance
        if ((0, types_1.getRandomInt)(0, 9) === 0)
            return (0, types_1.getRandomInt)(1, data.slot_count);
        // Send 0 if not switching
        else
            return 0;
    }
    playerAction(data) {
        return {
            // 1 / SLOT_COUNT chance to stop playing if slot=0 is sent
            slot: (0, types_1.getRandomInt)(0, Math.min(data.slot_count, data.player_wealth)),
            stake: (0, types_1.getRandomInt)(1, 3),
        };
    }
    end(data) {
        return;
    }
}
exports.default = RandomClient;

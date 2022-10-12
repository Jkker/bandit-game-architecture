import { model, Schema } from 'mongoose';

export const GameRecordSchema = new Schema(
  {
    casino: { type: String, required: true },
    player: { type: String, required: true },
    player_wealth: { type: Number, required: true },
    end_reason: { type: String, required: true },
  },
  { timestamps: true }
);
export const GameRecord = model('GameRecord', GameRecordSchema);

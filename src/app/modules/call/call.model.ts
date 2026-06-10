import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICall extends Document {
  caller: Types.ObjectId;
  receiver: Types.ObjectId;
  roomName: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  startedAt?: Date;
  endedAt?: Date;
}

const callSchema = new Schema<ICall>(
  {
    caller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roomName: { type: String, required: true },
    type: { type: String, enum: ['audio', 'video'], required: true },
    status: {
      type: String,
      enum: ['ringing', 'accepted', 'rejected', 'ended', 'missed'],
      default: 'ringing',
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

// Ensure a unique call session per caller/receiver/roomName
callSchema.index({ caller: 1, receiver: 1, roomName: 1 }, { unique: true });

const Call = mongoose.model<ICall>('Call', callSchema);
export default Call;

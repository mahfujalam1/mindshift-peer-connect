import { model, Schema } from 'mongoose';
import { IChatSetting } from './chat-setting.interface';

const chatSettingSchema = new Schema<IChatSetting>(
  {
    feature: {
      type: String,
      enum: ['reply', 'reaction'],
      required: true,
      unique: true,
    },
    status: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true }
);

const ChatSetting = model<IChatSetting>('ChatSetting', chatSettingSchema);

export default ChatSetting;

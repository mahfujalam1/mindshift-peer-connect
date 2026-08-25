import { model, Schema } from 'mongoose';
import { ICallSetting } from './call-setting.interface';

const callSettingSchema = new Schema<ICallSetting>(
  {
    callType: {
      type: String,
      enum: ['audio', 'video'],
      required: true,
      unique: true,
    },
    status: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true },
);

const CallSetting = model<ICallSetting>('CallSetting', callSettingSchema);

export default CallSetting;

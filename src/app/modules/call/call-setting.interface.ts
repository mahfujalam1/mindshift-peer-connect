export type TCallType = 'audio' | 'video';

export interface ICallSetting {
  callType: TCallType;
  status: boolean;
}

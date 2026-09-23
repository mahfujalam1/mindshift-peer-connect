export type TChatFeature = 'reply' | 'reaction';

export interface IChatSetting {
  feature: TChatFeature;
  status: boolean;
}

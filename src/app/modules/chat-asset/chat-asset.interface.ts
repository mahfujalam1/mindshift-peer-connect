export type TChatAssetType = 'gif' | 'image';

export type TChatAsset = {
  label: string;
  url: string;
  type: TChatAssetType;
  tags: string[];
  isActive: boolean;
};

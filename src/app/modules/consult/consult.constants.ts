export const CONSULT_LOCATION_SCOPES = ['all', 'canada', 'province', 'city'] as const;

export type TConsultLocationScope = (typeof CONSULT_LOCATION_SCOPES)[number];

export const DEFAULT_CONSULT_LOCATION_SCOPE: TConsultLocationScope = 'province';

export const CONSULT_RADIUS_OPTIONS_KM = [1, 5, 10, 25, 50, 100, 250, 500] as const;


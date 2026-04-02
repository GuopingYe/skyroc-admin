/**
 * CDISC standard type options shared across all CDISC Library UI components.
 * Values use lowercase to match the backend StandardType class.
 */
export const CDISC_STANDARD_TYPES = [
  { label: 'SDTM', value: 'sdtm' },
  { label: 'SDTMIG', value: 'sdtmig' },
  { label: 'ADaM', value: 'adam' },
  { label: 'ADaMIG', value: 'adamig' },
  { label: 'CDASHIG', value: 'cdashig' },
  { label: 'SENDIG', value: 'sendig' },
  { label: 'TIG', value: 'tig' },
  { label: 'QRS', value: 'qrs' },
  { label: 'CT', value: 'ct' },
  { label: 'BC', value: 'bc' },
  { label: 'Integrated', value: 'integrated' },
] as const;

import { ISP } from './types';

export const ISP_DNS_SERVERS: Record<ISP, string> = {
  [ISP.GLOBAL]: '8.8.8.8',
  [ISP.AIS]: '49.0.64.179',        // AIS Fibre Primary DNS
  [ISP.TRUE]: '203.144.207.29',    // True Primary DNS
  [ISP.DTAC]: '203.146.237.237',   // DTAC Primary DNS
  [ISP.NT]: '61.91.79.20',         // NT Primary DNS
};

export const DEFAULT_DOMAINS = [
  'https://ufathai.win/',
  'https://ufathai.com/',
  'https://www.zec777.com/',
];
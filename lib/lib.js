import pako from 'pako';

(typeof globalThis !== 'undefined' && globalThis ||
  typeof window !== 'undefined' && window ||
  typeof self !== 'undefined' && self ||
  this).pako = pako;
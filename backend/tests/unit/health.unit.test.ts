import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('Health & Config Unit Tests', () => {
  it('should return default config when no environment variables are set', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.clientOrigin).toBe('*');
  });

  it('should parse custom PORT and CLIENT_ORIGIN correctly', () => {
    const config = loadConfig({
      PORT: '8080',
      CLIENT_ORIGIN: 'http://localhost:5173',
    });
    expect(config.port).toBe(8080);
    expect(config.clientOrigin).toBe('http://localhost:5173');
  });

  it('should throw an error for invalid PORT values', () => {
    expect(() => loadConfig({ PORT: 'not-a-number' })).toThrow('Variable PORT invalide');
    expect(() => loadConfig({ PORT: '-1' })).toThrow('Variable PORT invalide');
  });
});

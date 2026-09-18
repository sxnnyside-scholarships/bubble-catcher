import { afterEach, describe, expect, test } from 'bun:test';
import { createDockerClient } from '../sandbox/docker-executor';
import { EPHEMERAL_MAX_AGE_MS, sweepOrphans } from '../sandbox/orphan-reaper';

describe('createDockerClient', () => {
  const originalDockerHost = process.env.DOCKER_HOST;

  afterEach(() => {
    if (originalDockerHost !== undefined) {
      process.env.DOCKER_HOST = originalDockerHost;
    } else {
      delete process.env.DOCKER_HOST;
    }
  });

  test('parses tcp:// URL from DOCKER_HOST for socket proxy', () => {
    process.env.DOCKER_HOST = 'tcp://docker-proxy:2375';
    const client = createDockerClient();
    expect((client.modem as { host?: string }).host).toBe('docker-proxy');
    expect((client.modem as { port?: number }).port).toBe(2375);
  });

  test('parses http:// URL from DOCKER_HOST', () => {
    process.env.DOCKER_HOST = 'http://custom-proxy:9000';
    const client = createDockerClient();
    expect((client.modem as { host?: string }).host).toBe('custom-proxy');
    expect((client.modem as { port?: number }).port).toBe(9000);
  });

  test('parses unix:/// socket path from DOCKER_HOST', () => {
    process.env.DOCKER_HOST = 'unix:///var/run/custom.sock';
    const client = createDockerClient();
    expect((client.modem as { socketPath?: string }).socketPath).toBe('/var/run/custom.sock');
  });
});

describe('Orphan Container Reaper', () => {
  test('EPHEMERAL_MAX_AGE_MS is defined with safe 2-minute threshold', () => {
    expect(EPHEMERAL_MAX_AGE_MS).toBe(120_000);
  });

  test('sweepOrphans returns safe default result structure', async () => {
    const result = await sweepOrphans();
    expect(typeof result.ephemeralReaped).toBe('number');
    expect(typeof result.enginesReaped).toBe('number');
    expect(typeof result.errors).toBe('number');
  });
});

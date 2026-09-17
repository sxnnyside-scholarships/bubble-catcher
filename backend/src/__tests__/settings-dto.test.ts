import { describe, expect, test } from 'bun:test';
import type { PlatformFeatures, RegistrationMode, SmtpSettings } from '@shared/types';

describe('Settings Dto and defaults contract', () => {
  test('default platform features enable all modules safely', () => {
    const defaultFeatures: PlatformFeatures = {
      sandbox: true,
      playground: true,
      classroom: true,
      competition: true,
    };
    expect(defaultFeatures.sandbox).toBe(true);
    expect(defaultFeatures.playground).toBe(true);
    expect(defaultFeatures.classroom).toBe(true);
    expect(defaultFeatures.competition).toBe(true);
  });

  test('registration modes match supported union values', () => {
    const modes: RegistrationMode[] = ['open', 'invite_only', 'approval_required'];
    expect(modes).toContain('open');
    expect(modes).toContain('invite_only');
    expect(modes).toContain('approval_required');
  });

  test('validates SMTP config contract', () => {
    const smtp: SmtpSettings = {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      user: 'admin@example.com',
      password: 'secretpassword',
      from: 'noreply@example.com',
    };
    expect(smtp.host).toBe('smtp.example.com');
    expect(smtp.port).toBe(587);
    expect(smtp.secure).toBe(false);
  });
});

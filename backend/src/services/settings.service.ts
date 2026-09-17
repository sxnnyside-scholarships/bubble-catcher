import type {
  PlatformFeatures,
  PublicSettingsDto,
  RegistrationMode,
  SmtpSettings,
  SystemSettingsDto,
} from '@shared/types';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { DEFAULT_PLATFORM_FEATURES, systemSettingsTable } from '../db/schema';

export type { RegistrationMode };

const SETTINGS_ID = 'singleton';

/** Reads the singleton settings row, creating it with defaults on first access. */
export async function getSystemSettings(): Promise<SystemSettingsDto> {
  const [row] = await db
    .insert(systemSettingsTable)
    .values({ id: SETTINGS_ID, enabledFeatures: DEFAULT_PLATFORM_FEATURES })
    .onConflictDoNothing()
    .returning();

  if (row) {
    return {
      registrationMode: row.registrationMode,
      enabledFeatures: row.enabledFeatures ?? DEFAULT_PLATFORM_FEATURES,
      smtpConfig: row.smtpConfig ?? null,
    };
  }

  const [existing] = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, SETTINGS_ID));
  return {
    registrationMode: existing?.registrationMode ?? 'open',
    enabledFeatures: existing?.enabledFeatures ?? DEFAULT_PLATFORM_FEATURES,
    smtpConfig: existing?.smtpConfig ?? null,
  };
}

/** Updates system settings (registration mode, feature flags, SMTP config). */
export async function updateSystemSettings(payload: {
  registrationMode?: RegistrationMode;
  enabledFeatures?: Partial<PlatformFeatures>;
  smtpConfig?: SmtpSettings | null;
}): Promise<SystemSettingsDto> {
  const current = await getSystemSettings();

  const newFeatures: PlatformFeatures = payload.enabledFeatures
    ? { ...current.enabledFeatures, ...payload.enabledFeatures }
    : current.enabledFeatures;

  const updateData: Partial<typeof systemSettingsTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (payload.registrationMode !== undefined) updateData.registrationMode = payload.registrationMode;
  if (payload.enabledFeatures !== undefined) updateData.enabledFeatures = newFeatures;
  if (payload.smtpConfig !== undefined) updateData.smtpConfig = payload.smtpConfig;

  const [row] = await db
    .insert(systemSettingsTable)
    .values({
      id: SETTINGS_ID,
      registrationMode: payload.registrationMode ?? current.registrationMode,
      enabledFeatures: newFeatures,
      smtpConfig: payload.smtpConfig !== undefined ? payload.smtpConfig : current.smtpConfig,
    })
    .onConflictDoUpdate({
      target: systemSettingsTable.id,
      set: updateData,
    })
    .returning();

  return {
    registrationMode: row!.registrationMode,
    enabledFeatures: row!.enabledFeatures ?? DEFAULT_PLATFORM_FEATURES,
    smtpConfig: row!.smtpConfig ?? null,
  };
}

/** Returns public instance settings (registration mode and enabled features) for anonymous/authenticated UI */
export async function getPublicSettings(): Promise<PublicSettingsDto> {
  const settings = await getSystemSettings();
  return {
    registrationMode: settings.registrationMode,
    enabledFeatures: settings.enabledFeatures,
  };
}

export async function getRegistrationMode(): Promise<RegistrationMode> {
  const settings = await getSystemSettings();
  return settings.registrationMode;
}

export async function setRegistrationMode(mode: RegistrationMode): Promise<RegistrationMode> {
  const settings = await updateSystemSettings({ registrationMode: mode });
  return settings.registrationMode;
}

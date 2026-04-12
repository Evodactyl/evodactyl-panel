import { store } from '@/state';
import type { SiteSettings } from '@/state/settings';

interface BootstrappedWindow extends Window {
    SiteConfiguration?: SiteSettings;
    EvodactylUser?: {
        uuid: string;
        username: string;
        email: string;
        /* eslint-disable camelcase */
        root_admin: boolean;
        use_totp: boolean;
        language: string;
        updated_at: string;
        created_at: string;
        /* eslint-enable camelcase */
    };
}

/**
 * Seeds the easy-peasy store from the bootstrap globals that the api injects
 * into the served HTML shell (`window.EvodactylUser`, `window.SiteConfiguration`).
 *
 * Runs exactly once, before React mounts. This used to live inside the
 * <App /> render function but that was a side-effect-in-render — harmless on
 * React 16, but React 18's StrictMode double-invokes renders and would
 * dispatch the setUserData action twice. Lifting it out of render keeps the
 * store-init idempotent and makes `SiteConfiguration` guaranteed-present by
 * the time any component reads from `state.settings.data`.
 */
export function bootstrapStore(): void {
    const { EvodactylUser, SiteConfiguration } = window as BootstrappedWindow;

    if (EvodactylUser) {
        store.getActions().user.setUserData({
            uuid: EvodactylUser.uuid,
            username: EvodactylUser.username,
            email: EvodactylUser.email,
            language: EvodactylUser.language,
            rootAdmin: EvodactylUser.root_admin,
            useTotp: EvodactylUser.use_totp,
            createdAt: new Date(EvodactylUser.created_at),
            updatedAt: new Date(EvodactylUser.updated_at),
        });
    }

    if (SiteConfiguration) {
        store.getActions().settings.setSettings(SiteConfiguration);
    }
}

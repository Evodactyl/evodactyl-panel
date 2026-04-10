import type { AxiosError } from 'axios';
import type { History } from 'history';
import http from '@/api/http';

export const setupInterceptors = (history: History) => {
    http.interceptors.response.use(
        (resp) => resp,
        (error: AxiosError) => {
            if (error.response?.status === 400) {
                if (
                    (error.response?.data as Record<string, any>).errors?.[0].code === 'TwoFactorAuthRequiredException'
                ) {
                    if (!window.location.pathname.startsWith('/account')) {
                        history.replace('/account', { twoFactorRedirect: true });
                    }
                }
            }
            throw error;
        },
    );
};

import { Redirect, Route, type RouteProps } from 'react-router';
import { useStoreState } from '@/state/hooks';

export default ({ children, ...props }: Omit<RouteProps, 'render'>) => {
    const isAuthenticated = useStoreState((state) => !!state.user.data?.uuid);

    return (
        <Route
            {...props}
            render={({ location }) =>
                isAuthenticated ? (children as React.ReactNode) : <Redirect to={{ pathname: '/auth/login', state: { from: location } }} />
            }
        />
    );
};

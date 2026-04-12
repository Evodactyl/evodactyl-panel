import type React from 'react';
import { Route } from 'react-router';
import { SwitchTransition } from 'react-transition-group';
import styled from 'styled-components';
import tw from 'twin.macro';
import Fade from '@/components/elements/Fade';

const StyledSwitchTransition = styled(SwitchTransition)`
    ${tw`relative`};

    & section {
        ${tw`absolute w-full top-0 left-0`};
    }
`;

const TransitionRouter: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    return (
        <Route
            render={({ location }) => (
                <StyledSwitchTransition>
                    <Fade timeout={150} key={location.pathname + location.search} in appear unmountOnExit>
                        <section>{children}</section>
                    </Fade>
                </StyledSwitchTransition>
            )}
        />
    );
};

export default TransitionRouter;

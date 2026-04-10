import styled from 'styled-components';
import tw from 'twin.macro';
import { breakpoint } from '@/theme';

const ContentContainer = styled.div`
    max-width: 1200px;
    ${tw`mx-4`};

    ${breakpoint('xl')`
        ${tw`mx-auto`};
    `};
`;
ContentContainer.displayName = 'ContentContainer';

export default ContentContainer;

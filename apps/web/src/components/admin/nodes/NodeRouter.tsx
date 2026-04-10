import { useEffect } from 'react';
import { NavLink, Route, Switch, useParams, useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';
import useSWR from 'swr';
import tw from 'twin.macro';
import { getNode, type Node } from '@/api/admin/nodes';
import AdminLayout from '@/components/admin/AdminLayout';
import NodeAbout from '@/components/admin/nodes/NodeAbout';
import NodeAllocations from '@/components/admin/nodes/NodeAllocations';
import NodeConfiguration from '@/components/admin/nodes/NodeConfiguration';
import NodeServers from '@/components/admin/nodes/NodeServers';
import NodeSettings from '@/components/admin/nodes/NodeSettings';
import Spinner from '@/components/elements/Spinner';
import useFlash from '@/plugins/useFlash';

const TabNav = styled.div`
    ${tw`flex border-b border-neutral-600 mb-4`};

    & a {
        ${tw`px-4 py-2.5 text-sm font-medium no-underline transition-colors duration-100 border-b-2`};
        ${tw`text-neutral-400 border-transparent hover:text-neutral-200`};
    }

    & a.active {
        ${tw`text-neutral-100 border-cyan-500`};
    }
`;

const NodeRouter = () => {
    const { id } = useParams<{ id: string }>();
    const match = useRouteMatch();
    const { clearFlashes, clearAndAddHttpError } = useFlash();

    const { data: node, error, mutate } = useSWR<Node>(`/api/application/nodes/${id}`, () => getNode(Number(id)));

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'admin:node', error });
        if (!error) clearFlashes('admin:node');
    }, [error, clearFlashes, clearAndAddHttpError]);

    return (
        <AdminLayout
            title={node?.name || 'Node'}
            subtitle={node ? `Manage node ${node.name}.` : 'Loading node...'}
            showFlashKey={'admin:node'}
            breadcrumbs={[
                { label: 'Admin', to: '/admin' },
                { label: 'Nodes', to: '/admin/nodes' },
                { label: node?.name || '...' },
            ]}
        >
            {!node ? (
                <Spinner centered size={'large'} />
            ) : (
                <>
                    <TabNav>
                        <NavLink to={`${match.url}`} exact>
                            About
                        </NavLink>
                        <NavLink to={`${match.url}/settings`}>Settings</NavLink>
                        <NavLink to={`${match.url}/configuration`}>Configuration</NavLink>
                        <NavLink to={`${match.url}/allocations`}>Allocations</NavLink>
                        <NavLink to={`${match.url}/servers`}>Servers</NavLink>
                    </TabNav>
                    <Switch>
                        <Route path={`${match.path}`} exact>
                            <NodeAbout node={node} />
                        </Route>
                        <Route path={`${match.path}/settings`}>
                            <NodeSettings node={node} mutate={mutate} />
                        </Route>
                        <Route path={`${match.path}/configuration`}>
                            <NodeConfiguration node={node} />
                        </Route>
                        <Route path={`${match.path}/allocations`}>
                            <NodeAllocations node={node} />
                        </Route>
                        <Route path={`${match.path}/servers`}>
                            <NodeServers node={node} />
                        </Route>
                    </Switch>
                </>
            )}
        </AdminLayout>
    );
};

export default NodeRouter;

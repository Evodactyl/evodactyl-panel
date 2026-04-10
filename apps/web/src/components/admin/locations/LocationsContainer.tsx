import { Form, Formik } from 'formik';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import tw from 'twin.macro';
import { object, string } from 'yup';
import { type AdminLocation, createLocation, getLocations } from '@/api/admin/locations';
import type { PaginatedResult } from '@/api/http';
import AdminBox from '@/components/admin/AdminBox';
import AdminLayout from '@/components/admin/AdminLayout';
import {
    AdminTable,
    AdminTableBody,
    AdminTableCell,
    AdminTableHead,
    AdminTableHeader,
    AdminTableRow,
} from '@/components/admin/AdminTable';
import Button from '@/components/elements/Button';
import Field from '@/components/elements/Field';
import Modal from '@/components/elements/Modal';
import Pagination from '@/components/elements/Pagination';
import Spinner from '@/components/elements/Spinner';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import useFlash from '@/plugins/useFlash';

export default () => {
    const [page, setPage] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();

    const {
        data: locations,
        error,
        mutate,
    } = useSWR<PaginatedResult<AdminLocation>>(['/api/application/locations', page], () => getLocations({ page }));

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'admin:locations', error });
        if (!error) clearFlashes('admin:locations');
    }, [error, clearFlashes, clearAndAddHttpError]);

    const createSchema = object().shape({
        short: string().min(1).max(60).required('Short code is required.'),
        long: string().max(255).optional(),
    });

    const handleCreate = (
        values: { short: string; long: string },
        { setSubmitting }: { setSubmitting: (v: boolean) => void },
    ) => {
        clearFlashes('admin:locations');
        createLocation({ short: values.short, long: values.long || undefined })
            .then(() => {
                setShowCreateModal(false);
                mutate();
                addFlash({ key: 'admin:locations', type: 'success', message: 'Location created successfully.' });
            })
            .catch((error) => clearAndAddHttpError({ key: 'admin:locations', error }))
            .finally(() => setSubmitting(false));
    };

    const tools = (
        <Button color={'primary'} size={'xsmall'} onClick={() => setShowCreateModal(true)}>
            Create New
        </Button>
    );

    return (
        <AdminLayout
            title={'Locations'}
            subtitle={'All locations that nodes can be assigned to.'}
            showFlashKey={'admin:locations'}
            breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Locations' }]}
        >
            <Modal visible={showCreateModal} onDismissed={() => setShowCreateModal(false)}>
                <h2 css={tw`text-2xl mb-6`}>Create Location</h2>
                <Formik initialValues={{ short: '', long: '' }} validationSchema={createSchema} onSubmit={handleCreate}>
                    {({ isSubmitting }) => (
                        <Form>
                            <SpinnerOverlay visible={isSubmitting} />
                            <div css={tw`mb-4`}>
                                <Field
                                    id={'short'}
                                    name={'short'}
                                    label={'Short Code'}
                                    description={'A short identifier for this location (e.g. "us.east").'}
                                />
                            </div>
                            <div css={tw`mb-6`}>
                                <Field
                                    id={'long'}
                                    name={'long'}
                                    label={'Description'}
                                    description={'An optional longer description of this location.'}
                                />
                            </div>
                            <div css={tw`flex justify-end gap-2`}>
                                <Button
                                    isSecondary
                                    type={'button'}
                                    onClick={() => setShowCreateModal(false)}
                                    css={tw`border-transparent`}
                                >
                                    Cancel
                                </Button>
                                <Button type={'submit'} color={'primary'}>
                                    Create
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Modal>

            {!locations ? (
                <Spinner centered size={'large'} />
            ) : (
                <Pagination data={locations} onPageSelect={setPage}>
                    {({ items }) => (
                        <AdminBox title={'All Locations'} tools={tools} noPadding>
                            {items.length > 0 ? (
                                <AdminTable>
                                    <AdminTableHead>
                                        <tr>
                                            <AdminTableHeader>ID</AdminTableHeader>
                                            <AdminTableHeader>Short Code</AdminTableHeader>
                                            <AdminTableHeader>Description</AdminTableHeader>
                                            <AdminTableHeader className={'text-center'}>Nodes</AdminTableHeader>
                                            <AdminTableHeader className={'text-center'}>Servers</AdminTableHeader>
                                        </tr>
                                    </AdminTableHead>
                                    <AdminTableBody>
                                        {items.map((location) => (
                                            <AdminTableRow key={location.id}>
                                                <AdminTableCell>
                                                    <code>{location.id}</code>
                                                </AdminTableCell>
                                                <AdminTableCell>
                                                    <Link to={`/admin/locations/${location.id}`}>{location.short}</Link>
                                                </AdminTableCell>
                                                <AdminTableCell css={tw`text-neutral-400`}>
                                                    {location.long || 'No description.'}
                                                </AdminTableCell>
                                                <AdminTableCell className={'text-center'}>
                                                    {location.nodeCount ?? 0}
                                                </AdminTableCell>
                                                <AdminTableCell className={'text-center'}>
                                                    {location.serverCount ?? 0}
                                                </AdminTableCell>
                                            </AdminTableRow>
                                        ))}
                                    </AdminTableBody>
                                </AdminTable>
                            ) : (
                                <p css={tw`text-center text-sm text-neutral-400 py-6`}>
                                    No locations have been created yet.
                                </p>
                            )}
                        </AdminBox>
                    )}
                </Pagination>
            )}
        </AdminLayout>
    );
};

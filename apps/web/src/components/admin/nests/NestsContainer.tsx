import { Form, Formik } from 'formik';
import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import useSWR from 'swr';
import tw from 'twin.macro';
import { object, string } from 'yup';
import { createNest, getNests, importEgg, type Nest } from '@/api/admin/nests';
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
import Spinner from '@/components/elements/Spinner';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import useFlash from '@/plugins/useFlash';

const NestsContainer = () => {
    const history = useHistory();
    const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importNestId, setImportNestId] = useState<number | null>(null);
    const [importing, setImporting] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: nests, error, mutate } = useSWR<Nest[]>('/api/application/nests', getNests);

    useEffect(() => {
        if (error) clearAndAddHttpError({ key: 'admin:nests', error });
        if (!error) clearFlashes('admin:nests');
    }, [error, clearFlashes, clearAndAddHttpError]);

    const createSchema = object().shape({
        name: string().min(1).max(191).required('A name is required.'),
        description: string().max(255).optional(),
    });

    const handleCreate = (
        values: { name: string; description: string },
        { setSubmitting }: { setSubmitting: (v: boolean) => void },
    ) => {
        clearFlashes('admin:nests');
        createNest({ name: values.name, description: values.description || undefined })
            .then(() => {
                setShowCreateModal(false);
                mutate();
                addFlash({ key: 'admin:nests', type: 'success', message: 'Nest created.' });
            })
            .catch((error) => clearAndAddHttpError({ key: 'admin:nests', error }))
            .finally(() => setSubmitting(false));
    };

    const handleImport = () => {
        if (!importFile || !importNestId) return;
        setImporting(true);
        clearFlashes('admin:nests');
        const reader = new FileReader();
        reader.onload = () => {
            importEgg(importNestId, reader.result as string)
                .then((egg) => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportNestId(null);
                    history.push(`/admin/nests/${importNestId}/eggs/${egg.id}`);
                })
                .catch((error) => clearAndAddHttpError({ key: 'admin:nests', error }))
                .finally(() => setImporting(false));
        };
        reader.readAsText(importFile);
    };

    const tools = (
        <div css={tw`flex items-center gap-2`}>
            <Button color={'green'} size={'xsmall'} onClick={() => setShowImportModal(true)}>
                Import Egg
            </Button>
            <Link to={'/admin/nests/egg/new'}>
                <Button color={'green'} size={'xsmall'}>
                    New Egg
                </Button>
            </Link>
            <Button color={'primary'} size={'xsmall'} onClick={() => setShowCreateModal(true)}>
                Create Nest
            </Button>
        </div>
    );

    return (
        <AdminLayout
            title={'Nests'}
            subtitle={'All nests currently available on this system.'}
            showFlashKey={'admin:nests'}
            breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Nests' }]}
        >
            <Modal visible={showCreateModal} onDismissed={() => setShowCreateModal(false)}>
                <h2 css={tw`text-2xl mb-6`}>Create Nest</h2>
                <Formik
                    initialValues={{ name: '', description: '' }}
                    validationSchema={createSchema}
                    onSubmit={handleCreate}
                >
                    {({ isSubmitting }) => (
                        <Form>
                            <SpinnerOverlay visible={isSubmitting} />
                            <div css={tw`mb-4`}>
                                <Field
                                    id={'name'}
                                    name={'name'}
                                    label={'Name'}
                                    description={'A short identifier for this nest.'}
                                />
                            </div>
                            <div css={tw`mb-6`}>
                                <Field
                                    id={'description'}
                                    name={'description'}
                                    label={'Description'}
                                    description={'An optional description of this nest.'}
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

            <Modal
                visible={showImportModal}
                onDismissed={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportNestId(null);
                }}
            >
                <SpinnerOverlay visible={importing} />
                <h2 css={tw`text-2xl mb-6`}>Import an Egg</h2>
                <div css={tw`mb-4`}>
                    <label css={tw`text-xs uppercase text-neutral-400 block mb-1`}>Egg File</label>
                    <input
                        type='file'
                        accept='.json,application/json'
                        css={tw`text-sm text-neutral-300`}
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file && file.size > 1000 * 1024) {
                                clearAndAddHttpError({
                                    key: 'admin:nests',
                                    error: new Error('File must be under 1000KB.'),
                                });
                                return;
                            }
                            setImportFile(file);
                        }}
                    />
                    <p css={tw`text-xs text-neutral-500 mt-1`}>
                        Select the <code>.json</code> file for the new egg that you wish to import.
                    </p>
                </div>
                <div css={tw`mb-6`}>
                    <label css={tw`text-xs uppercase text-neutral-400 block mb-1`}>Associated Nest</label>
                    <select
                        css={tw`w-full bg-neutral-600 border border-neutral-500 rounded p-2 text-sm text-neutral-200`}
                        value={importNestId ?? ''}
                        onChange={(e) => setImportNestId(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value=''>Select a nest...</option>
                        {nests?.map((n) => (
                            <option key={n.id} value={n.id}>
                                {n.name}
                            </option>
                        ))}
                    </select>
                    <p css={tw`text-xs text-neutral-500 mt-1`}>
                        Select the nest that this egg will be associated with from the dropdown.
                    </p>
                </div>
                <div css={tw`flex justify-end gap-2`}>
                    <Button
                        isSecondary
                        type={'button'}
                        onClick={() => {
                            setShowImportModal(false);
                            setImportFile(null);
                            setImportNestId(null);
                        }}
                        css={tw`border-transparent`}
                    >
                        Cancel
                    </Button>
                    <Button
                        color={'primary'}
                        disabled={!importFile || !importNestId || importing}
                        onClick={handleImport}
                    >
                        Import
                    </Button>
                </div>
            </Modal>

            <div css={tw`bg-red-900 border border-red-700 rounded p-3 mb-4 text-sm text-red-200`}>
                Eggs are a powerful feature of Pterodactyl Panel that allow for extreme flexibility and configuration.
                Please note that while powerful, modifying an egg wrongly can very easily brick your servers and cause
                more problems. Please avoid editing default eggs unless you are absolutely sure of what you are doing.
            </div>

            {!nests ? (
                <Spinner centered size={'large'} />
            ) : (
                <AdminBox title={'Configured Nests'} tools={tools} noPadding>
                    {nests.length > 0 ? (
                        <AdminTable>
                            <AdminTableHead>
                                <tr>
                                    <AdminTableHeader>ID</AdminTableHeader>
                                    <AdminTableHeader>Name</AdminTableHeader>
                                    <AdminTableHeader>Description</AdminTableHeader>
                                    <AdminTableHeader className={'text-center'}>Eggs</AdminTableHeader>
                                    <AdminTableHeader className={'text-center'}>Servers</AdminTableHeader>
                                </tr>
                            </AdminTableHead>
                            <AdminTableBody>
                                {nests.map((nest) => (
                                    <AdminTableRow key={nest.id}>
                                        <AdminTableCell>
                                            <code>{nest.id}</code>
                                        </AdminTableCell>
                                        <AdminTableCell>
                                            <Link to={`/admin/nests/${nest.id}`}>{nest.name}</Link>
                                        </AdminTableCell>
                                        <AdminTableCell css={tw`text-neutral-400`}>
                                            {nest.description || 'No description.'}
                                        </AdminTableCell>
                                        <AdminTableCell className={'text-center'}>
                                            {nest.eggs?.length ?? 0}
                                        </AdminTableCell>
                                        <AdminTableCell className={'text-center'}>
                                            {nest.serversCount ?? 0}
                                        </AdminTableCell>
                                    </AdminTableRow>
                                ))}
                            </AdminTableBody>
                        </AdminTable>
                    ) : (
                        <p css={tw`text-center text-sm text-neutral-400 py-6`}>No nests have been configured.</p>
                    )}
                </AdminBox>
            )}
        </AdminLayout>
    );
};

export default NestsContainer;

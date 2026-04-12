import { Form, Formik, type FormikHelpers } from 'formik';
import { join } from 'pathe';
import { useContext, useEffect, useState } from 'react';
import tw from 'twin.macro';
import { object, string } from 'yup';
import createDirectory from '@/api/server/files/createDirectory';
import type { FileObject } from '@/api/server/files/loadDirectory';
import { Button } from '@/components/elements/button/index';
import Code from '@/components/elements/Code';
import { Dialog, DialogWrapperContext } from '@/components/elements/dialog';
import Field from '@/components/elements/Field';
import FlashMessageRender from '@/components/FlashMessageRender';
import type { WithClassname } from '@/components/types';
import asDialog from '@/hoc/asDialog';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import { useFlashKey } from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';

interface Values {
    directoryName: string;
}

const schema = object().shape({
    directoryName: string().required('A valid directory name must be provided.'),
});

const generateDirectoryData = (name: string): FileObject => ({
    key: `dir_${name.split('/', 1)[0] ?? name}`,
    name: name.replace(/^(\/*)/, '').split('/', 1)[0] ?? name,
    mode: 'drwxr-xr-x',
    modeBits: '0755',
    size: 0,
    isFile: false,
    isSymlink: false,
    mimetype: '',
    createdAt: new Date(),
    modifiedAt: new Date(),
    isArchiveType: () => false,
    isEditable: () => false,
});

const NewDirectoryDialog = asDialog({
    title: 'Create Directory',
})(() => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const directory = ServerContext.useStoreState((state) => state.files.directory);

    const { mutate } = useFileManagerSwr();
    const { close } = useContext(DialogWrapperContext);
    const { clearAndAddHttpError } = useFlashKey('files:directory-modal');

    useEffect(() => {
        return () => {
            clearAndAddHttpError();
        };
    }, [clearAndAddHttpError]);

    const submit = ({ directoryName }: Values, { setSubmitting }: FormikHelpers<Values>) => {
        createDirectory(uuid, directory, directoryName)
            .then(() => mutate((data) => [...(data || []), generateDirectoryData(directoryName)], false))
            .then(() => close())
            .catch((error) => {
                setSubmitting(false);
                clearAndAddHttpError(error);
            });
    };

    return (
        <Formik onSubmit={submit} validationSchema={schema} initialValues={{ directoryName: '' }}>
            {({ submitForm, values }) => (
                <>
                    <FlashMessageRender key={'files:directory-modal'} />
                    <Form css={tw`m-0`}>
                        <Field autoFocus id={'directoryName'} name={'directoryName'} label={'Name'} />
                        <p css={tw`mt-2 text-sm md:text-base break-all`}>
                            <span css={tw`text-neutral-200`}>This directory will be created as&nbsp;</span>
                            <Code>
                                /home/container/
                                <span css={tw`text-cyan-200`}>
                                    {join(directory, values.directoryName).replace(/^(\.\.\/|\/)+/, '')}
                                </span>
                            </Code>
                        </p>
                    </Form>
                    <Dialog.Footer>
                        <Button.Text className={'w-full sm:w-auto'} onClick={close}>
                            Cancel
                        </Button.Text>
                        <Button className={'w-full sm:w-auto'} onClick={submitForm}>
                            Create
                        </Button>
                    </Dialog.Footer>
                </>
            )}
        </Formik>
    );
});

export default ({ className }: WithClassname) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <NewDirectoryDialog open={open} onClose={setOpen.bind(this, false)} />
            <Button.Text onClick={setOpen.bind(this, true)} className={className}>
                Create Directory
            </Button.Text>
        </>
    );
};

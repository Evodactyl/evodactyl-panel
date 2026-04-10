import { type Actions, type State, useStoreActions, useStoreState } from 'easy-peasy';
import { Form, Formik, type FormikHelpers } from 'formik';
import React from 'react';
import tw from 'twin.macro';
import * as Yup from 'yup';
import updateAccountPassword from '@/api/account/updateAccountPassword';
import { httpErrorToHuman } from '@/api/http';
import { Button } from '@/components/elements/button/index';
import Field from '@/components/elements/Field';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import type { ApplicationStore } from '@/state';

interface Values {
    current: string;
    password: string;
    confirmPassword: string;
}

const schema = Yup.object().shape({
    current: Yup.string().min(1).required('You must provide your current password.'),
    password: Yup.string().min(8).required(),
    confirmPassword: Yup.string().test(
        'password',
        'Password confirmation does not match the password you entered.',
        function (value) {
            return value === this.parent.password;
        },
    ),
});

export default () => {
    const user = useStoreState((state: State<ApplicationStore>) => state.user.data);
    const { clearFlashes, addFlash } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    if (!user) {
        return null;
    }

    const submit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('account:password');
        updateAccountPassword({ ...values })
            .then(() => {
                // @ts-expect-error this is valid
                window.location = '/auth/login';
            })
            .catch((error) =>
                addFlash({
                    key: 'account:password',
                    type: 'error',
                    title: 'Error',
                    message: httpErrorToHuman(error),
                }),
            )
            .then(() => setSubmitting(false));
    };

    return (
        <Formik
            onSubmit={submit}
            validationSchema={schema}
            initialValues={{ current: '', password: '', confirmPassword: '' }}
        >
            {({ isSubmitting, isValid }) => (
                <React.Fragment>
                    <SpinnerOverlay size={'large'} visible={isSubmitting} />
                    <Form css={tw`m-0`}>
                        <Field id={'current_password'} type={'password'} name={'current'} label={'Current Password'} />
                        <div css={tw`mt-6`}>
                            <Field
                                id={'new_password'}
                                type={'password'}
                                name={'password'}
                                label={'New Password'}
                                description={
                                    'Your new password should be at least 8 characters in length and unique to this website.'
                                }
                            />
                        </div>
                        <div css={tw`mt-6`}>
                            <Field
                                id={'confirm_new_password'}
                                type={'password'}
                                name={'confirmPassword'}
                                label={'Confirm New Password'}
                            />
                        </div>
                        <div css={tw`mt-6`}>
                            <Button disabled={isSubmitting || !isValid}>Update Password</Button>
                        </div>
                    </Form>
                </React.Fragment>
            )}
        </Formik>
    );
};

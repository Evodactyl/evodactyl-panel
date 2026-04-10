import classNames from 'classnames';
import type React from 'react';
import { forwardRef } from 'react';
import styles from './styles.module.css';

type Props = Omit<React.ComponentProps<'input'>, 'type'>;

export default forwardRef<HTMLInputElement, Props>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        type={'checkbox'}
        className={classNames('form-input', styles.checkbox_input, className)}
        {...props}
    />
));

import * as React from 'react';
import { cloneElement, Children, ReactElement, useEffect } from 'react';
import clsx from 'clsx';
import {
    isRequired,
    FieldTitle,
    composeSyncValidators,
    RaRecord,
    useApplyInputDefaultValues,
    useGetValidationErrorMessage,
} from 'ra-core';
import { useFieldArray, useFormContext } from 'react-hook-form';
import {
    InputLabel,
    FormControl,
    FormHelperText,
    FormControlProps,
} from '@mui/material';

import { LinearProgress } from '../../layout';
import { CommonInputProps } from '../CommonInputProps';
import { InputHelperText } from '../InputHelperText';
import { sanitizeInputRestProps } from '../sanitizeInputRestProps';
import { Labeled } from '../../Labeled';
import { ArrayInputContext } from './ArrayInputContext';

/**
 * To edit arrays of data embedded inside a record, <ArrayInput> creates a list of sub-forms.
 *
 *  @example
 *
 *      import { ArrayInput, SimpleFormIterator, DateInput, TextInput } from 'react-admin';
 *
 *      <ArrayInput source="backlinks">
 *          <SimpleFormIterator>
 *              <DateInput source="date" />
 *              <TextInput source="url" />
 *          </SimpleFormIterator>
 *      </ArrayInput>
 *
 * <ArrayInput> allows the edition of embedded arrays, like the backlinks field
 * in the following post record:
 *
 * {
 *   id: 123
 *   backlinks: [
 *         {
 *             date: '2012-08-10T00:00:00.000Z',
 *             url: 'http://example.com/foo/bar.html',
 *         },
 *         {
 *             date: '2012-08-14T00:00:00.000Z',
 *             url: 'https://blog.johndoe.com/2012/08/12/foobar.html',
 *         }
 *    ]
 * }
 *
 * <ArrayInput> expects a single child, which must be a *form iterator* component.
 * A form iterator is a component accepting a fields object as passed by
 * react-hook-form-arrays's useFieldArray() hook, and defining a layout for
 * an array of fields. For instance, the <SimpleFormIterator> component
 * displays an array of fields in an unordered list (<ul>), one sub-form by
 * list item (<li>). It also provides controls for adding and removing
 * a sub-record (a backlink in this example).
 *
 * @see {@link https://react-hook-form.com/api/usefieldarray}
 */
export const ArrayInput = (props: ArrayInputProps) => {
    const {
        className,
        defaultValue,
        label,
        isFetching,
        isLoading,
        children,
        helperText,
        record,
        resource: resourceFromProps,
        source,
        validate,
        variant,
        disabled,
        margin = 'dense',
        ...rest
    } = props;

    const sanitizedValidate = Array.isArray(validate)
        ? composeSyncValidators(validate)
        : validate;
    const getValidationErrorMessage = useGetValidationErrorMessage();

    const {
        getFieldState,
        formState,
        getValues,
        register,
        unregister,
    } = useFormContext();

    const fieldProps = useFieldArray({
        name: source,
        rules: {
            validate: async value => {
                if (!sanitizedValidate) return true;
                const error = await sanitizedValidate(
                    value,
                    getValues(),
                    props
                );

                if (!error) return true;
                return getValidationErrorMessage(error);
            },
        },
    });

    const { isSubmitted } = formState;

    // We need to register the array itself as a field to enable validation at its level
    useEffect(() => {
        register(source);

        return () => {
            unregister(source, { keepValue: true });
        };
    }, [register, unregister, source]);

    useApplyInputDefaultValues(props);

    const { isDirty, error } = getFieldState(source, formState);

    if (isLoading) {
        return (
            <Labeled label={label} className={className}>
                <LinearProgress />
            </Labeled>
        );
    }

    return (
        <FormControl
            fullWidth
            margin={margin}
            className={clsx('ra-input', `ra-input-${source}`, className)}
            error={(isDirty || isSubmitted) && !!error}
            {...sanitizeInputRestProps(rest)}
        >
            <InputLabel
                htmlFor={source}
                shrink
                error={(isDirty || isSubmitted) && !!error}
            >
                <FieldTitle
                    label={label}
                    source={source}
                    resource={resourceFromProps}
                    isRequired={isRequired(validate)}
                />
            </InputLabel>
            <ArrayInputContext.Provider value={fieldProps}>
                {cloneElement(Children.only(children), {
                    ...fieldProps,
                    record,
                    resource: resourceFromProps,
                    source,
                    variant,
                    margin,
                    disabled,
                })}
            </ArrayInputContext.Provider>
            {!!((isDirty || isSubmitted) && !!error) || helperText ? (
                <FormHelperText error={(isDirty || isSubmitted) && !!error}>
                    <InputHelperText
                        touched={isDirty || isSubmitted}
                        error={error?.root?.message}
                        helperText={helperText}
                    />
                </FormHelperText>
            ) : null}
        </FormControl>
    );
};

ArrayInput.defaultProps = {
    options: {},
    fullWidth: true,
};

export const getArrayInputError = error => {
    if (Array.isArray(error)) {
        return undefined;
    }
    return error;
};

export interface ArrayInputProps
    extends CommonInputProps,
        Omit<FormControlProps, 'defaultValue' | 'onBlur' | 'onChange'> {
    className?: string;
    children: ReactElement;
    disabled?: boolean;
    isFetching?: boolean;
    isLoading?: boolean;
    record?: Partial<RaRecord>;
}

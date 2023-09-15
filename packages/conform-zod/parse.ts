import {
	type FormState,
	type Submission,
	type SubmissionResult,
	flatten,
	formatPaths,
	resolve,
	getIntentHandler,
} from '@conform-to/dom';
import {
	type IssueData,
	type SafeParseReturnType,
	type output,
	type RefinementCtx,
	type ZodTypeAny,
	type ZodError,
	type ZodErrorMap,
	ZodIssueCode,
} from 'zod';
import { enableTypeCoercion } from './coercion.js';

function getError({ errors }: ZodError): Record<string, string[]> {
	return errors.reduce<Record<string, string[]>>((result, error) => {
		const name = formatPaths(error.path);
		const messages = result[name] ?? [];

		messages.push(error.message);

		result[name] = messages;

		return result;
	}, {});
}

interface SubmissionContext<Value> {
	initialValue: Record<string, string | string[]>;
	value: Value | null;
	error: Record<string, string[]>;
	state: FormState;
	pending: boolean;
}

function createSubmission<Value>(
	context: SubmissionContext<Value>,
	update: (result: Omit<Required<SubmissionResult>, 'status'>) => void,
): Submission<Value> {
	let { initialValue, error, state } = context;
	update({
		initialValue,
		error,
		state,
	});

	if (context.pending) {
		error = Object.entries(context.error).reduce<Record<string, string[]>>(
			(result, [name, messages]) => {
				if (context.state.validated[name]) {
					result[name] = messages;
				}

				return result;
			},
			{},
		);

		return {
			status: 'pending',
			error,
			revise: () => ({
				status: 'pending',
				initialValue,
				error,
				state,
			}),
		};
	}

	if (!context.value) {
		return {
			status: 'rejected',
			error: result.error ?? {},
			revise: () => result,
		};
	}

	return {
		status: 'accepted',
		value: context.value,
		reject: (options) => ({
			...result,
			error: {
				'': options.formErrors ?? [],
				...options.fieldErrors,
			},
		}),
		reset: () => ({ initialValue: null }),
	};
}

export function parse<Schema extends ZodTypeAny>(
	payload: FormData | URLSearchParams,
	options: {
		schema: Schema | ((intent: string) => Schema);
		async?: false;
		errorMap?: ZodErrorMap;
	},
): Submission<output<Schema>>;
export function parse<Schema extends ZodTypeAny>(
	payload: FormData | URLSearchParams,
	options: {
		schema: Schema | ((intent: string) => Schema);
		async: true;
		errorMap?: ZodErrorMap;
	},
): Promise<Submission<output<Schema>>>;
export function parse<Schema extends ZodTypeAny>(
	payload: FormData | URLSearchParams,
	options: {
		schema: Schema | ((intent: string | null) => Schema);
		async?: boolean;
		errorMap?: ZodErrorMap;
	},
): Submission<output<Schema>> | Promise<Submission<output<Schema>>> {
	const form = resolve(payload);
	const update = getIntentHandler(form);
	const errorMap = options.errorMap;
	const schema = enableTypeCoercion(
		typeof options.schema === 'function'
			? options.schema(form.intent)
			: options.schema,
	);
	const resolveSubmission = <Input, Output>(
		result: SafeParseReturnType<Input, Output>,
		context: {
			intent: string | null;
			state: any | null;
			data: Record<string, unknown>;
			fields: string[];
		},
		updateState: (result: SubmissionResult) => void,
	): Submission<Output> => {
		const error = !result.success ? getError(result.error) : {};

		return createSubmission(
			{
				initialValue: flatten(context.data),
				state: context.state,
				pending: context.intent !== null,
				value: result.success ? result.data : null,
				error,
			},
			updateState,
		);
	};

	return options.async
		? schema
				.safeParseAsync(form.data, { errorMap })
				.then((result) => resolveSubmission(result, form, update))
		: resolveSubmission(
				schema.safeParse(form.data, { errorMap }),
				form,
				update,
		  );
}

/**
 * A helper function to define a custom constraint on a superRefine check.
 * Mainly used for async validation.
 *
 * @see https://conform.guide/api/zod#refine
 */
export function refine(
	ctx: RefinementCtx,
	options: {
		/**
		 * A validate function. If the function returns `undefined`,
		 * it will fallback to server validation.
		 */
		validate: () => boolean | Promise<boolean> | undefined;
		/**
		 * Define when the validation should be run. If the value is `false`,
		 * the validation will be skipped.
		 */
		when?: boolean;
		/**
		 * The message displayed when the validation fails.
		 */
		message: string;
		/**
		 * The path set to the zod issue.
		 */
		path?: IssueData['path'];
	},
): void | Promise<void> {
	if (typeof options.when !== 'undefined' && !options.when) {
		ctx.addIssue({
			code: ZodIssueCode.custom,
			message: '__VALIDATION_SKIPPED__',
			path: options.path,
		});
		return;
	}

	// Run the validation
	const result = options.validate();

	if (typeof result === 'undefined') {
		// Validate only if the constraint is defined
		ctx.addIssue({
			code: ZodIssueCode.custom,
			message: `__VALIDATION_UNDEFINED__`,
			path: options.path,
		});
		return;
	}

	const reportInvalid = (valid: boolean) => {
		if (valid) {
			return;
		}

		ctx.addIssue({
			code: ZodIssueCode.custom,
			message: options.message,
			path: options.path,
		});
	};

	return typeof result === 'boolean'
		? reportInvalid(result)
		: result.then(reportInvalid);
}

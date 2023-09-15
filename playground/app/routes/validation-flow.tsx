import { FormState, conform, useForm } from '@conform-to/react';
import { parse } from '@conform-to/zod';
import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import { Playground, Field } from '~/components';

const schema = z
	.object({
		email: z
			.string({ required_error: 'Email is required' })
			.email('Email is invalid'),
	})
	.and(
		z
			.object({
				password: z
					.string({ required_error: 'Password is required' })
					.min(8, 'Password is too short'),
				confirmPassword: z.string({
					required_error: 'Confirm password is required',
				}),
			})
			.refine((data) => data.password === data.confirmPassword, {
				message: 'Password does not match',
				path: ['confirmPassword'],
			}),
	);

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url);
	const search = z.object({
		noClientValidate: z.preprocess((value) => value === 'yes', z.boolean()),
		showInputWithNoName: z.preprocess((value) => value === 'yes', z.boolean()),
		shouldValidate: z.enum(['onSubmit', 'onBlur', 'onInput']).optional(),
		shouldRevalidate: z.enum(['onSubmit', 'onBlur', 'onInput']).optional(),
	});

	return json(search.parse(Object.fromEntries(url.searchParams)));
}

export async function action({ request }: ActionArgs) {
	const formData = await request.formData();
	const submission = parse(formData, { schema });

	return json(submission.revise());
}

export default function ValidationFlow() {
	const {
		noClientValidate,
		shouldValidate,
		shouldRevalidate,
		showInputWithNoName,
	} = useLoaderData<typeof loader>();
	const lastResult = useActionData<typeof action>();
	const form = useForm({
		lastResult,
		shouldValidate,
		shouldRevalidate,
		onValidate: !noClientValidate
			? ({ formData }) => parse(formData, { schema })
			: undefined,
	});

	return (
		<Form method="post" {...conform.form(form)}>
			<FormState formId={form.id} />
			<Playground title="Validation Flow" lastSubmission={lastResult}>
				<Field label="Email" config={form.fields.email}>
					<input {...conform.input(form.fields.email, { type: 'email' })} />
				</Field>
				<Field label="Password" config={form.fields.password}>
					<input
						{...conform.input(form.fields.password, { type: 'password' })}
					/>
				</Field>
				<Field label="Confirm password" config={form.fields.confirmPassword}>
					<input
						{...conform.input(form.fields.confirmPassword, {
							type: 'password',
						})}
					/>
				</Field>
				{showInputWithNoName ? (
					<Field label="Input with no name">
						<input type="text" name="" />
					</Field>
				) : null}
			</Playground>
		</Form>
	);
}

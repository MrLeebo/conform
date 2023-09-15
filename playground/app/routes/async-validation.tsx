import { FormState, conform, useForm } from '@conform-to/react';
import { parse, refine } from '@conform-to/zod';
import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import { Playground, Field } from '~/components';

function createSchema(
	intent: string,
	constraints: {
		isEmailUnique?: (email: string) => Promise<boolean>;
	} = {},
) {
	return z.object({
		email: z
			.string({ required_error: 'Email is required' })
			.email({ message: 'Email is invalid' })
			// Pipe another schema so it runs only if it is a valid email
			.pipe(
				z.string().superRefine((email, ctx) =>
					refine(ctx, {
						validate: () => constraints.isEmailUnique?.(email),
						when: intent === 'validate/email' || intent === null,
						message: 'Email is already used',
					}),
				),
			),
		title: z
			.string({ required_error: 'Title is required' })
			.max(20, 'Title is too long'),
	});
}

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url);

	return {
		noClientValidate: url.searchParams.get('noClientValidate') === 'yes',
	};
}

export async function action({ request }: ActionArgs) {
	const formData = await request.formData();
	const submission = await parse(formData, {
		schema: (intent) =>
			createSchema(intent, {
				isEmailUnique(email) {
					return new Promise((resolve) => {
						setTimeout(() => {
							// Only `hey@conform.guide` is unique
							resolve(email === 'hey@conform.guide');
						}, Math.random() * 500);
					});
				},
			}),
		async: true,
	});

	return json(submission.revise());
}

export default function EmployeeForm() {
	const { noClientValidate } = useLoaderData<typeof loader>();
	const lastResult = useActionData<typeof action>();
	const form = useForm({
		lastResult,
		onValidate: !noClientValidate
			? ({ formData }) =>
					parse(formData, {
						schema: (intent) => createSchema(intent),
					})
			: undefined,
	});

	return (
		<Form method="post" {...conform.form(form)}>
			<FormState formId={form.id} />
			<Playground title="Employee Form" lastSubmission={lastResult}>
				<Field label="Email" config={form.fields.email}>
					<input
						{...conform.input(form.fields.email, { type: 'email' })}
						autoComplete="off"
					/>
				</Field>
				<Field label="Title" config={form.fields.title}>
					<input {...conform.input(form.fields.title, { type: 'text' })} />
				</Field>
			</Playground>
		</Form>
	);
}

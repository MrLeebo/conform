import { FormState, conform, useForm, intent } from '@conform-to/react';
import { parse } from '@conform-to/zod';
import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import { Playground, Field } from '~/components';

const schema = z.object({
	name: z.string({ required_error: 'Name is required' }),
	message: z.string({ required_error: 'Message is required' }),
});

export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url);

	return {
		noClientValidate: url.searchParams.get('noClientValidate') === 'yes',
	};
}

export async function action({ request }: ActionArgs) {
	const formData = await request.formData();
	const submission = parse(formData, { schema });

	return json(submission.revise());
}

export default function Validate() {
	const { noClientValidate } = useLoaderData<typeof loader>();
	const lastResult = useActionData();
	const form = useForm({
		lastResult,
		onValidate: !noClientValidate
			? ({ formData }) => parse(formData, { schema })
			: undefined,
	});

	return (
		<Form method="post" {...conform.form(form)}>
			<FormState formId={form.id} />
			<Playground title="Validate" lastSubmission={lastResult}>
				<Field label="Name" config={form.fields.name}>
					<input {...conform.input(form.fields.name, { type: 'text' })} />
				</Field>
				<Field label="Message" config={form.fields.message}>
					<textarea {...conform.textarea(form.fields.message)} />
				</Field>
				<div className="flex flex-row gap-2">
					<button
						className="rounded-md border p-2 hover:border-black"
						{...intent.validate(form.fields.name)}
					>
						Validate Name
					</button>
					<button
						className="rounded-md border p-2 hover:border-black"
						{...intent.validate(form.fields.message)}
					>
						Validate Message
					</button>
				</div>
			</Playground>
		</Form>
	);
}

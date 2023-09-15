export type Pretty<T> = { [K in keyof T]: T[K] } & {};

export type Primitive = null | undefined | string | number | boolean | Date;

export type KeysOf<T> = T extends any ? keyof T : never;

export type KeyType<T, K extends KeysOf<T>> = T extends { [k in K]?: any }
	? T[K]
	: undefined;

export type DefaultValue<Schema> = Schema extends Primitive
	? Schema | string
	: Schema extends File
	? undefined
	: Schema extends Array<infer InnerType>
	? Array<DefaultValue<InnerType>>
	: Schema extends Record<string, any>
	? { [Key in KeysOf<Schema>]?: DefaultValue<KeyType<Schema, Key>> }
	: any;

export type FieldName<Type> = string & { __type?: Type };

export type FieldElement =
	| HTMLInputElement
	| HTMLSelectElement
	| HTMLTextAreaElement;

export type FormControl = FieldElement | HTMLButtonElement;

export type Submitter = HTMLInputElement | HTMLButtonElement;

export type Form = {
	attributes: FormAttributes;
	initialValue: Record<string, Primitive | Primitive[]>;
	error: Record<string, string[]>;
	state: FormState;
};

export type FormContext = {
	intent: string | null;
	state: FormState;
	data: Record<string, unknown>;
	fields: string[];
};

export type Entry = {
	form: Form;
	subscribers: Array<{
		shouldNotify: (update: Update) => boolean;
		callback: () => void;
	}>;
};

export type Update =
	| {
			type: 'error';
			name: string;
			prev?: string[];
			next: string[];
	  }
	| {
			type: 'list';
			name: string;
			prev?: Array<string>;
			next: Array<string>;
	  }
	| {
			type: 'validated';
			name: string;
			prev?: boolean;
			next: boolean;
	  };

export type Constraint = {
	required?: boolean;
	minLength?: number;
	maxLength?: number;
	min?: string | number;
	max?: string | number;
	step?: string | number;
	multiple?: boolean;
	pattern?: string;
};

export type FormAttributes = {
	defaultValue: Record<string, Primitive | Primitive[]>;
	constraint: Record<string, Constraint>;
};

export type FormState = {
	validated: Record<string, boolean>;
	listKeys: Record<string, Array<string>>;
};

export type SubmissionContext = {
	form: HTMLFormElement;
	submitter: HTMLInputElement | HTMLButtonElement | null;
	formData: FormData;
};

export type Submission<Output> =
	| {
			status: 'pending' | 'rejected';
			error: Record<string, string[]>;
			revise(): SubmissionResult;
	  }
	| {
			status: 'accepted';
			value: Output;
			reject(
				options:
					| {
							formErrors: string[];
							fieldErrors?: Record<string, string[]>;
					  }
					| {
							formErrors?: string[];
							fieldErrors: Record<string, string[]>;
					  },
			): SubmissionResult;
			reset(): SubmissionResult;
	  };

export type SubmissionResult = {
	status: 'pending' | 'rejected' | 'accepted';
	initialValue?: Record<string, string | string[]>;
	error?: Record<string, string[]>;
	state?: FormState;
};

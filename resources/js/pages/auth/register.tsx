import { Form, Head } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
};

const ACCOUNT_TYPES: [value: string, title: string, description: string][] = [
    ['passenger', 'Passenger', 'Find seats on trips'],
    ['driver', 'Driver', 'Offer seats, earn'],
];

const PASSWORD_CHECKS: [label: string, test: (value: string) => boolean][] = [
    ['At least 8 characters', (v) => v.length >= 8],
    ['An uppercase and a lowercase letter', (v) => /\p{Ll}/u.test(v) && /\p{Lu}/u.test(v)],
    ['A number', (v) => /\d/.test(v)],
    ['A special character (e.g. ! @ # $ %)', (v) => /[^\p{L}\p{N}\s]/u.test(v)],
];

function Required() {
    return (
        <span className="text-destructive" aria-hidden="true">
            *
        </span>
    );
}

export default function Register({ passwordRules }: Props) {
    const [password, setPassword] = useState('');

    return (
        <>
            <Head title="Register" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
                transform={(data) => ({
                    ...data,
                    first_name: String(data.first_name ?? '').trim(),
                    last_name: String(data.last_name ?? '').trim(),
                    middle_initial: String(data.middle_initial ?? '')
                        .trim()
                        .replace(/\.$/, ''),
                    email: String(data.email ?? '').trim(),
                })}
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <p className="text-xs text-muted-foreground">
                                Fields marked with <Required /> are required.
                            </p>

                            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_5rem]">
                                <div className="grid gap-2">
                                    <Label htmlFor="first_name">
                                        First name <Required />
                                    </Label>
                                    <Input
                                        id="first_name"
                                        type="text"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="given-name"
                                        name="first_name"
                                        maxLength={100}
                                        placeholder="Juan"
                                        aria-invalid={!!errors.first_name}
                                    />
                                    <InputError message={errors.first_name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="last_name">
                                        Last name <Required />
                                    </Label>
                                    <Input
                                        id="last_name"
                                        type="text"
                                        required
                                        tabIndex={2}
                                        autoComplete="family-name"
                                        name="last_name"
                                        maxLength={100}
                                        placeholder="Dela Cruz"
                                        aria-invalid={!!errors.last_name}
                                    />
                                    <InputError message={errors.last_name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="middle_initial">M.I.</Label>
                                    <Input
                                        id="middle_initial"
                                        type="text"
                                        tabIndex={3}
                                        autoComplete="additional-name"
                                        name="middle_initial"
                                        maxLength={2}
                                        placeholder="A"
                                        className="uppercase"
                                        aria-invalid={!!errors.middle_initial}
                                    />
                                    <InputError message={errors.middle_initial} />
                                </div>
                            </div>

                            <fieldset className="grid gap-2">
                                <legend className="mb-1 text-sm font-medium">
                                    Choose Account Type <Required />
                                </legend>
                                <div className="grid grid-cols-2 gap-3">
                                    {ACCOUNT_TYPES.map(([value, title, description], i) => (
                                        <label
                                            key={value}
                                            className="cursor-pointer rounded-xl border p-3 text-sm has-[:checked]:border-ocean has-[:checked]:bg-ocean/10"
                                        >
                                            <input
                                                type="radio"
                                                name="account_type"
                                                value={value}
                                                defaultChecked={i === 0}
                                                required
                                                className="sr-only"
                                            />
                                            <span className="block font-semibold">
                                                {title}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {description}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <InputError message={errors.account_type} />
                            </fieldset>

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    Email address <Required />
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={4}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                    aria-invalid={!!errors.email}
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone_number">
                                    Mobile number (optional)
                                </Label>
                                <Input
                                    id="phone_number"
                                    type="tel"
                                    tabIndex={5}
                                    autoComplete="tel"
                                    name="phone_number"
                                    placeholder="09171234567"
                                    aria-invalid={!!errors.phone_number}
                                />
                                <InputError message={errors.phone_number} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    Password <Required />
                                </Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={6}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Password"
                                    passwordrules={passwordRules}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    aria-invalid={!!errors.password}
                                />
                                <ul className="grid gap-1 text-xs" aria-live="polite">
                                    {PASSWORD_CHECKS.map(([label, test]) => {
                                        const ok = test(password);
                                        return (
                                            <li
                                                key={label}
                                                className={
                                                    ok
                                                        ? 'flex items-center gap-1.5 text-green-600'
                                                        : 'flex items-center gap-1.5 text-muted-foreground'
                                                }
                                            >
                                                {ok ? (
                                                    <Check className="size-3.5" />
                                                ) : (
                                                    <X className="size-3.5" />
                                                )}
                                                {label}
                                            </li>
                                        );
                                    })}
                                </ul>
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password <Required />
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={7}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
                                    aria-invalid={!!errors.password_confirmation}
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                tabIndex={8}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Create account
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={9}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create an account',
    description: 'Enter your details below to create your account',
};

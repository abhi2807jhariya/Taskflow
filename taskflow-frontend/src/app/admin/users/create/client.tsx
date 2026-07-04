"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    ArrowLeft,
    Eye,
    EyeOff,
    KeyRound,
    Mail,
    Phone,
    Send,
    ShieldCheck,
    Sparkles,
    User,
    UserPlus,
} from "lucide-react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

interface UserFormData {
    fullName: string;
    mobileNumber: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface CreatedUser {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    profileImage: string | null;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface CreateUserResponse {
    message: string;
    user: CreatedUser;
}

const initialFormData: UserFormData = {
    fullName: "",
    mobileNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
};

export default function CreateUserPage() {
    const router = useRouter();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userName, setUserName] = useState("Admin");

    const [formData, setFormData] =
        useState<UserFormData>(initialFormData);

    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const storedUser =
            localStorage.getItem("taskflow_user") ||
            sessionStorage.getItem("taskflow_user");

        if (!storedUser) {
            setUserName("Admin");
            return;
        }

        try {
            const parsedUser = JSON.parse(storedUser);

            setUserName(
                parsedUser.fullName ||
                    parsedUser.name ||
                    "Admin"
            );
        } catch {
            setUserName("Admin");
        }
    }, []);

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = event.target;

        let updatedValue = value;

        if (name === "mobileNumber") {
            updatedValue = value.replace(/\D/g, "");
        }

        setFormData((previous) => ({
            ...previous,
            [name]: updatedValue,
        }));
    };

    const validateForm = (): string | null => {
        if (
            !formData.fullName.trim() ||
            !formData.mobileNumber.trim() ||
            !formData.email.trim() ||
            !formData.password ||
            !formData.confirmPassword
        ) {
            return "Please fill in all required fields.";
        }

        if (formData.fullName.trim().length < 2) {
            return "Full name must contain at least 2 characters.";
        }

        if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) {
            return "Please enter a valid 10-digit Indian mobile number.";
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                formData.email.trim()
            )
        ) {
            return "Please enter a valid email address.";
        }

        if (formData.password.length < 8) {
            return "Password must contain at least 8 characters.";
        }

        if (formData.password !== formData.confirmPassword) {
            return "Password and confirm password do not match.";
        }

        return null;
    };

    const getToken = (): string | null => {
        return (
            localStorage.getItem("taskflow_token") ||
            sessionStorage.getItem("taskflow_token")
        );
    };

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const validationError = validateForm();

        if (validationError) {
            toast.error(validationError);
            return;
        }

        try {
            setIsSubmitting(true);

            const token = getToken();

            const apiUrl =
                process.env.NEXT_PUBLIC_API_URL ||
                "http://localhost:5000";

            const response =
                await axios.post<CreateUserResponse>(
                    `${apiUrl}/users`,
                    {
                        fullName: formData.fullName.trim(),
                        phoneNumber:
                            formData.mobileNumber.trim(),
                        email: formData.email
                            .trim()
                            .toLowerCase(),
                        password: formData.password,
                        confirmPassword:
                            formData.confirmPassword,
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",

                            ...(token
                                ? {
                                      Authorization: `Bearer ${token}`,
                                  }
                                : {}),
                        },
                    }
                );

            const createdUserName =
                response.data.user?.fullName ||
                formData.fullName.trim();

            toast.success(
                `${createdUserName} created successfully`
            );

            setFormData(initialFormData);
            setShowPassword(false);
            setShowConfirmPassword(false);

            window.setTimeout(() => {
                router.push("/admin/users");
            }, 2200);
        } catch (error: unknown) {
            let errorMessage =
                "Unable to create user. Please try again.";

            if (axios.isAxiosError(error)) {
                const backendMessage =
                    error.response?.data?.message;

                if (Array.isArray(backendMessage)) {
                    errorMessage = backendMessage.join(" ");
                } else if (
                    typeof backendMessage === "string"
                ) {
                    errorMessage = backendMessage;
                } else if (!error.response) {
                    errorMessage =
                        "Backend server is not reachable. Please make sure the backend is running on port 5000.";
                }
            }

            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
            <Toaster
                position="top-right"
                reverseOrder={false}
                gutter={10}
                containerStyle={{
                    top: 20,
                    right: 20,
                    zIndex: 999999,
                }}
                toastOptions={{
                    duration: 3000,

                    style: {
                        minWidth: "300px",
                        borderRadius: "14px",
                        background: "#ffffff",
                        color: "#0f172a",
                        padding: "14px 18px",
                        fontSize: "14px",
                        fontWeight: "600",
                        border: "1px solid #e2e8f0",
                        boxShadow:
                            "0 15px 35px rgba(15, 23, 42, 0.18)",
                    },

                    success: {
                        duration: 3000,

                        iconTheme: {
                            primary: "#059669",
                            secondary: "#ffffff",
                        },
                    },

                    error: {
                        duration: 4000,

                        iconTheme: {
                            primary: "#dc2626",
                            secondary: "#ffffff",
                        },
                    },
                }}
            />

            {/* Header */}
            <div className="relative z-50 shrink-0">
                <Header
                    userName={userName}
                    setSidebarOpen={setSidebarOpen}
                />
            </div>

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
                {/* Mobile overlay */}
                {sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden"
                        onClick={() =>
                            setSidebarOpen(false)
                        }
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`
                        fixed inset-y-0 left-0 z-40 w-64
                        transform bg-slate-950 pt-16
                        transition-transform duration-300
                        md:relative md:translate-x-0 md:pt-0
                        ${
                            sidebarOpen
                                ? "translate-x-0"
                                : "-translate-x-full"
                        }
                    `}
                >
                    <Sidebar />
                </aside>

                {/* Main area */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <main className="flex-1 overflow-y-auto">
                        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
                            {/* Top navigation */}
                            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <Link
                                        href="/admin/users"
                                        className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to users
                                    </Link>

                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                                        Create New User
                                    </h1>

                                    <p className="mt-1 text-sm text-slate-500 sm:text-base">
                                        Add a new team member and
                                        provide their login
                                        credentials.
                                    </p>
                                </div>

                                <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 sm:flex">
                                    <ShieldCheck className="h-4 w-4" />
                                    Secure account creation
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                                {/* Left information panel */}
                                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-6 text-white shadow-xl shadow-emerald-950/10 sm:p-8">
                                    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />

                                    <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-white/10" />

                                    <div className="relative">
                                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                                            <UserPlus className="h-7 w-7" />
                                        </div>

                                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                                            <Sparkles className="h-4 w-4" />
                                            New team member
                                        </div>

                                        <h2 className="mt-3 text-2xl font-bold leading-tight">
                                            Create a secure
                                            TaskFlow account
                                        </h2>

                                        <p className="mt-3 text-sm leading-6 text-emerald-50/90">
                                            The user will log in
                                            with the registered
                                            email or mobile number
                                            and temporary password.
                                        </p>

                                        <div className="mt-8 space-y-4">
                                            <InfoStep
                                                number="1"
                                                title="Create account"
                                                description="Enter the user's basic details."
                                            />

                                            <InfoStep
                                                number="2"
                                                title="Send credentials"
                                                description="Login details will be sent through email or SMS."
                                            />

                                            <InfoStep
                                                number="3"
                                                title="User changes password"
                                                description="The user can change the temporary password after login."
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Form panel */}
                                <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                                    <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                                <User className="h-5 w-5" />
                                            </div>

                                            <div>
                                                <h2 className="font-bold text-slate-900">
                                                    User information
                                                </h2>

                                                <p className="text-sm text-slate-500">
                                                    All fields are
                                                    required to
                                                    create the
                                                    account.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <form
                                        onSubmit={handleSubmit}
                                        className="space-y-6 p-5 sm:p-8"
                                    >
                                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                            <FormInput
                                                label="Full Name"
                                                name="fullName"
                                                type="text"
                                                placeholder="Enter full name"
                                                value={
                                                    formData.fullName
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                icon={
                                                    <User className="h-5 w-5" />
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                            />

                                            <FormInput
                                                label="Mobile Number"
                                                name="mobileNumber"
                                                type="tel"
                                                placeholder="Enter mobile number"
                                                value={
                                                    formData.mobileNumber
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                icon={
                                                    <Phone className="h-5 w-5" />
                                                }
                                                maxLength={10}
                                                disabled={
                                                    isSubmitting
                                                }
                                            />
                                        </div>

                                        <FormInput
                                            label="Email Address"
                                            name="email"
                                            type="email"
                                            placeholder="Enter email address"
                                            value={
                                                formData.email
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            icon={
                                                <Mail className="h-5 w-5" />
                                            }
                                            disabled={
                                                isSubmitting
                                            }
                                        />

                                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                            <PasswordInput
                                                label="Temporary Password"
                                                name="password"
                                                placeholder="Create password"
                                                value={
                                                    formData.password
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                visible={
                                                    showPassword
                                                }
                                                onToggle={() =>
                                                    setShowPassword(
                                                        (
                                                            previous
                                                        ) =>
                                                            !previous
                                                    )
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                            />

                                            <PasswordInput
                                                label="Confirm Password"
                                                name="confirmPassword"
                                                placeholder="Confirm password"
                                                
                                                value={
                                                    formData.confirmPassword
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                visible={
                                                    showConfirmPassword
                                                }
                                                onToggle={() =>
                                                    setShowConfirmPassword(
                                                        (
                                                            previous
                                                        ) =>
                                                            !previous
                                                    )
                                                }
                                                disabled={
                                                    isSubmitting
                                                }
                                            />
                                        </div>

                                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                                            <div className="flex gap-3">
                                                <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                                                <p className="text-sm leading-6 text-amber-800">
                                                    This password is
                                                    temporary. The
                                                    user can change
                                                    it later from
                                                    the User
                                                    Dashboard.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                                            <Link
                                                href="/admin/users"
                                                className="cursor-pointer inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                Cancel
                                            </Link>

                                            <button
                                                type="submit"
                                                disabled={
                                                    isSubmitting
                                                }
                                                className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                        Creating
                                                        User...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send className="h-4 w-4" />
                                                        Create User
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </section>
                            </div>
                        </div>
                    </main>

                    <div className="shrink-0">
                        <Footer />
                    </div>
                </div>
            </div>
        </div>
    );
}

interface FormInputProps {
    label: string;
    name: string;
    type: string;
    placeholder: string;
    value: string;

    onChange: (
        event: React.ChangeEvent<HTMLInputElement>
    ) => void;

    icon: React.ReactNode;
    maxLength?: number;
    disabled?: boolean;
}

function FormInput({
    label,
    name,
    type,
    placeholder,
    value,
    onChange,
    icon,
    maxLength,
    disabled = false,
}: FormInputProps) {
    return (
        <div>
            <label
                htmlFor={name}
                className="mb-2 block text-sm font-semibold text-slate-700"
            >
                {label}
                <span className="ml-1 text-red-500">*</span>
            </label>

            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    {icon}
                </div>

                <input
                    id={name}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    autoComplete="off"
                    disabled={disabled}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
            </div>
        </div>
    );
}

interface PasswordInputProps {
    label: string;
    name: string;
    placeholder: string;
    value: string;
    visible: boolean;
    onToggle: () => void;

    onChange: (
        event: React.ChangeEvent<HTMLInputElement>
    ) => void;

    disabled?: boolean;
}

function PasswordInput({
    label,
    name,
    placeholder,
    value,
    visible,
    onToggle,
    onChange,
    disabled = false,
}: PasswordInputProps) {
    return (
        <div>
            <label
                htmlFor={name}
                className="mb-2 block text-sm font-semibold text-slate-700"
            >
                {label}
                <span className="ml-1 text-red-500">*</span>
            </label>

            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <KeyRound className="h-5 w-5" />
                </div>

                <input
                    id={name}
                    name={name}
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoComplete="new-password"
                    disabled={disabled}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                    type="button"
                    onClick={onToggle}
                    disabled={disabled}
                    aria-label={
                        visible
                            ? "Hide password"
                            : "Show password"
                    }
                    className="cursor-pointer absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {visible ? (
                        <EyeOff className="h-5 w-5" />
                    ) : (
                        <Eye className="h-5 w-5" />
                    )}
                </button>
            </div>
        </div>
    );
}

interface InfoStepProps {
    number: string;
    title: string;
    description: string;
}

function InfoStep({
    number,
    title,
    description,
}: InfoStepProps) {
    return (
        <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold ring-1 ring-white/20">
                {number}
            </div>

            <div>
                <p className="text-sm font-bold">
                    {title}
                </p>

                <p className="mt-1 text-sm leading-5 text-emerald-50/80">
                    {description}
                </p>
            </div>
        </div>
    );
}

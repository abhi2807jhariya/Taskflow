"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";

import {
  ArrowLeft,
  Camera,
  ImagePlus,
  LoaderCircle,
  Mail,
  Phone,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import Header from "@/src/components/layout/Header";
import Sidebar from "@/src/components/layout/Sidebar";
import Footer from "@/src/components/layout/Footer";

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  profileImage?: string | null;
  role: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminResponse {
  message?: string;
  user: AdminUser;
}

interface BackendErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

interface EditProfileForm {
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  profileImage?: string;
}

const AvatarEditor = dynamic(
  () => import("react-avatar-editor"),
  {
    ssr: false,
  },
);



const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function getToken(): string | null {
  return (
    localStorage.getItem("taskflow_token") ||
    sessionStorage.getItem("taskflow_token")
  );
}

function getStoredAdmin(): AdminUser | null {
  const storedAdmin =
    localStorage.getItem("taskflow_user") ||
    sessionStorage.getItem("taskflow_user");

  if (!storedAdmin) {
    return null;
  }

  try {
    return JSON.parse(storedAdmin) as AdminUser;
  } catch {
    return null;
  }
}

function saveUserToStorage(updatedAdmin: AdminUser) {
  const storageKey = "taskflow_user";

  const localAdminText =
    localStorage.getItem(storageKey);

  const sessionAdminText =
    sessionStorage.getItem(storageKey);

  const updateStorage = (
    storage: Storage,
    currentAdminText: string | null,
  ) => {
    let currentAdmin: Record<string, unknown> = {};

    if (currentAdminText) {
      try {
        currentAdmin = JSON.parse(currentAdminText);
      } catch {
        currentAdmin = {};
      }
    }

    storage.setItem(
      storageKey,
      JSON.stringify({
        ...currentAdmin,
        ...updatedAdmin,
      }),
    );
  };

  if (localAdminText) {
    updateStorage(localStorage, localAdminText);
  }

  if (sessionAdminText) {
    updateStorage(sessionStorage, sessionAdminText);
  }

  if (!localAdminText && !sessionAdminText) {
    if (localStorage.getItem("taskflow_token")) {
      updateStorage(localStorage, null);
    } else {
      updateStorage(sessionStorage, null);
    }
  }
}

function getProfileImageUrl(
  profileImage: string | null | undefined,
  apiUrl: string,
): string | null {
  if (!profileImage) {
    return null;
  }

  if (
    profileImage.startsWith("http://") ||
    profileImage.startsWith("https://") ||
    profileImage.startsWith("data:") ||
    profileImage.startsWith("blob:")
  ) {
    return profileImage;
  }

  return `${apiUrl}${
    profileImage.startsWith("/") ? "" : "/"
  }${profileImage}`;
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (
    !axios.isAxiosError<BackendErrorResponse>(error)
  ) {
    return fallbackMessage;
  }

  const message = error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(" ");
  }

  if (typeof message === "string") {
    return message;
  }

  if (!error.response) {
    return "Backend server is not reachable.";
  }

  if (error.response.status === 413) {
    return "Image request is too large. Please select another image.";
  }

  return fallbackMessage;
}

export default function EditAdminProfileClient() {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(null);
    const editorRef = useRef<any>(null);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [admin, setAdmin] =
    useState<AdminUser | null>(null);

  const [formData, setFormData] =
    useState<EditProfileForm>({
      fullName: "",
      email: "",
      phoneNumber: "",
      profileImage: "",
    });

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isCompressing, setIsCompressing] =
    useState(false);

  const [imageError, setImageError] =
    useState(false);

    const [selectedImage, setSelectedImage] =
  useState<File | null>(null);

const [scale, setScale] =
  useState(1.2);

  const [
    selectedImageFile,
    setSelectedImageFile,
  ] = useState<File | null>(null);

  const [
    previewImageUrl,
    setPreviewImageUrl,
  ] = useState<string | null>(null);

  const [
    removeImageRequested,
    setRemoveImageRequested,
  ] = useState(false);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000";

  useEffect(() => {
    const fetchAdmin = async () => {
      const token = getToken();

      if (!token) {
        toast.error(
          "Admin login information was not found.",
        );

        setIsLoading(false);
        router.replace("/login");
        return;
      }

      try {
        setIsLoading(true);

        const response =
          await axios.get<AdminResponse>(
            `${apiUrl}/auth/profile`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

        const fetchedAdmin =
          response.data.user;

        setAdmin(fetchedAdmin);

        setFormData({
          fullName:
            fetchedAdmin.fullName || "",
          email:
            fetchedAdmin.email || "",
          phoneNumber:
            fetchedAdmin.phoneNumber || "",
          profileImage:
            fetchedAdmin.profileImage || "",
        });

        saveUserToStorage(fetchedAdmin);
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(
            error,
            "Unable to load admin profile.",
          ),
        );

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          router.replace("/login");
          return;
        }

        const storedAdmin = getStoredAdmin();

        if (storedAdmin) {
          setAdmin(storedAdmin);

          setFormData({
            fullName:
              storedAdmin.fullName || "",
            email:
              storedAdmin.email || "",
            phoneNumber:
              storedAdmin.phoneNumber || "",
            profileImage:
              storedAdmin.profileImage || "",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAdmin();
  }, [apiUrl, router]);

  useEffect(() => {
    setImageError(false);
  }, [
    formData.profileImage,
    previewImageUrl,
  ]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: undefined,
    }));
  };

  const handlePhoneChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const numbersOnly =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 10);

    setFormData((previous) => ({
      ...previous,
      phoneNumber: numbersOnly,
    }));

    setErrors((previous) => ({
      ...previous,
      phoneNumber: undefined,
    }));
  };

const handleImageChange = (
  event: ChangeEvent<HTMLInputElement>,
) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!allowedTypes.includes(file.type)) {
    setErrors((previous) => ({
      ...previous,
      profileImage:
        "Only JPG, PNG and WEBP images are allowed.",
    }));

    event.target.value = "";
    return;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    setErrors((previous) => ({
      ...previous,
      profileImage:
        "Profile image must be 5 MB or smaller.",
    }));

    event.target.value = "";
    return;
  }

  setErrors((previous) => ({
    ...previous,
    profileImage: undefined,
  }));

  setSelectedImage(file);
  setScale(1.2);
  setRemoveImageRequested(false);
  setImageError(false);

  event.target.value = "";
};

const handleCropSave = () => {
  if (!editorRef.current) {
    return;
  }

  try {
    setIsCompressing(true);

    const canvas =
      editorRef.current.getImageScaledToCanvas();

    canvas.toBlob(
      (blob: Blob | null) => {
        if (!blob) {
          setIsCompressing(false);

          toast.error(
            "Unable to crop profile image.",
          );

          return;
        }

        const croppedFile = new File(
          [blob],
          `admin-profile-${Date.now()}.png`,
          {
            type: "image/png",
          },
        );

        const newPreviewUrl =
          URL.createObjectURL(blob);

        setPreviewImageUrl(
          (previousUrl) => {
            if (previousUrl) {
              URL.revokeObjectURL(
                previousUrl,
              );
            }

            return newPreviewUrl;
          },
        );

        setSelectedImageFile(
          croppedFile,
        );

        setSelectedImage(null);
        setScale(1.2);
        setRemoveImageRequested(false);
        setImageError(false);
        setIsCompressing(false);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      "image/png",
    );
  } catch {
    setIsCompressing(false);

    toast.error(
      "Unable to crop profile image.",
    );
  }
};

const cancelImageCrop = () => {
  setSelectedImage(null);
  setScale(1.2);

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
};

const removeProfileImage = () => {
  if (previewImageUrl) {
    URL.revokeObjectURL(
      previewImageUrl,
    );
  }

  setPreviewImageUrl(null);
  setSelectedImage(null);
  setSelectedImageFile(null);
  setRemoveImageRequested(true);
  setScale(1.2);

  setFormData((previous) => ({
    ...previous,
    profileImage: "",
  }));

  setErrors((previous) => ({
    ...previous,
    profileImage: undefined,
  }));

  setImageError(false);

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
};

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const fullName =
      formData.fullName.trim();

    const email =
      formData.email
        .trim()
        .toLowerCase();

    if (!fullName) {
      newErrors.fullName =
        "Full name is required.";
    } else if (fullName.length < 3) {
      newErrors.fullName =
        "Full name must contain at least 3 characters.";
    }

    if (!email) {
      newErrors.email =
        "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      newErrors.email =
        "Please enter a valid email address.";
    }

    if (
      formData.phoneNumber &&
      !/^[0-9]{10}$/.test(
        formData.phoneNumber,
      )
    ) {
      newErrors.phoneNumber =
        "Mobile number must contain exactly 10 digits.";
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
    );
  };

  const hasChanges = (): boolean => {
    if (!admin) {
      return false;
    }

    return (
      formData.fullName.trim() !==
        admin.fullName ||
      formData.email
        .trim()
        .toLowerCase() !==
        admin.email.toLowerCase() ||
      formData.phoneNumber.trim() !==
        (admin.phoneNumber || "") ||
      selectedImageFile !== null ||
      removeImageRequested
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !admin ||
      isSubmitting ||
      isCompressing
    ) {
      return;
    }

    if (!validateForm()) {
      toast.error(
        "Please correct the form errors.",
      );
      return;
    }

    if (!hasChanges()) {
      toast.error("No changes were made.");
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error(
        "Login session not found. Please login again.",
      );

      router.replace("/login");
      return;
    }

    try {
      setIsSubmitting(true);

      const profileResponse =
        await axios.patch<AdminResponse>(
          `${apiUrl}/auth/profile`,
          {
            fullName:
              formData.fullName.trim(),

            email:
              formData.email
                .trim()
                .toLowerCase(),

            phoneNumber:
              formData.phoneNumber.trim() ||
              null,

            ...(removeImageRequested && {
              profileImage: null,
            }),
          },
          {
            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      let updatedAdmin =
        profileResponse.data.user;

      if (selectedImageFile) {
        const imageFormData =
          new FormData();

        imageFormData.append(
          "profileImage",
          selectedImageFile,
        );

        const imageResponse =
          await axios.patch<AdminResponse>(
            `${apiUrl}/auth/profile-image`,
            imageFormData,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        updatedAdmin =
          imageResponse.data.user;
      }

      setAdmin(updatedAdmin);

      setFormData({
        fullName:
          updatedAdmin.fullName || "",
        email:
          updatedAdmin.email || "",
        phoneNumber:
          updatedAdmin.phoneNumber || "",
        profileImage:
          updatedAdmin.profileImage || "",
      });

      setSelectedImageFile(null);
      setPreviewImageUrl(null);
      setRemoveImageRequested(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      saveUserToStorage(updatedAdmin);

      window.dispatchEvent(
        new CustomEvent(
          "taskflow-profile-updated",
          {
            detail: {
              fullName:
                updatedAdmin.fullName,

              profileImage:
                updatedAdmin.profileImage ||
                null,
            },
          },
        ),
      );

      toast.success(
        profileResponse.data.message ||
          "Admin profile updated successfully.",
      );

      window.setTimeout(() => {
        router.push(
          "/admin/settings/profile",
        );

        router.refresh();
      }, 1000);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          "Unable to update admin profile.",
        ),
      );

      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        router.replace("/login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (
      !admin ||
      isSubmitting ||
      isCompressing
    ) {
      return;
    }

    setSelectedImage(null);
setScale(1.2);
    setPreviewImageUrl(null);
    setSelectedImageFile(null);
    setRemoveImageRequested(false);

    setFormData({
      fullName: admin.fullName || "",
      email: admin.email || "",
      phoneNumber:
        admin.phoneNumber || "",
      profileImage:
        admin.profileImage || "",
    });

    setErrors({});
    setImageError(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resolvedStoredImage =
    getProfileImageUrl(
      formData.profileImage,
      apiUrl,
    );

  const resolvedProfileImage =
    previewImageUrl ||
    resolvedStoredImage;

  const adminName =
    formData.fullName ||
    admin?.fullName ||
    "Admin";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{
          top: 20,
          right: 20,
          zIndex: 999999,
        }}
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "14px",
            background: "#ffffff",
            color: "#0f172a",
            padding: "14px 18px",
            fontSize: "14px",
            fontWeight: "600",
            border:
              "1px solid #e2e8f0",
            boxShadow:
              "0 15px 35px rgba(15, 23, 42, 0.18)",
          },
        }}
      />

      {/* Header */}
      <div className="relative z-50 shrink-0">
        <Header
          userName={adminName}
          profileImage={
            resolvedProfileImage || null
          }
          setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Sidebar and Content */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}

        <aside
          className={`
            fixed inset-y-0 left-0 z-40 h-full w-64
            bg-white pt-16
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

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto w-full max-w-5xl">
              {isLoading ? (
                <LoadingState />
              ) : !admin ? (
                <AdminNotFound />
              ) : (
                <>
                  {/* Heading */}
                  <div className="mb-6">
                    <Link
                      href="/admin/settings/profile"
                      className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-violet-700"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to admin profile
                    </Link>

                    <h1 className="text-2xl font-bold text-slate-900 md:text-2xl">
                      Edit Admin Profile
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                      Update your profile image and
                      personal information.
                    </p>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]"
                  >
{/* Profile Image Card */}
<section className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
  <h2 className="text-center font-bold text-slate-900">
    Profile Image
  </h2>

  <input
    ref={fileInputRef}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleImageChange}
    disabled={
      isSubmitting ||
      isCompressing
    }
    className="hidden"
  />

  {selectedImage ? (
    <div className="mt-6 flex flex-col items-center">
      <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex justify-center overflow-hidden">
          <AvatarEditor
            ref={editorRef}
            image={selectedImage}
            width={180}
            height={180}
            border={20}
            borderRadius={999}
            scale={scale}
            rotate={0}
            color={[
              255,
              255,
              255,
              0.7,
            ]}
          />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              Zoom
            </span>

            <span className="text-xs font-semibold text-violet-600">
              {scale.toFixed(1)}x
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={scale}
            onChange={(event) =>
              setScale(
                Number(
                  event.target.value,
                ),
              )
            }
            disabled={isCompressing}
            className="w-full accent-violet-600"
          />
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={cancelImageCrop}
            disabled={isCompressing}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCropSave}
            disabled={isCompressing}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCompressing ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Cropping...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Crop & Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ) : (
    <>
      <div className="relative mx-auto mt-6 h-32 w-32">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-violet-100 ring-4 ring-violet-50">
          {resolvedProfileImage &&
          !imageError ? (
            <img
              src={resolvedProfileImage}
              alt={`${adminName} profile`}
              className="h-full w-full object-cover"
              onError={() =>
                setImageError(true)
              }
            />
          ) : (
            <span className="text-3xl font-bold text-violet-700">
              {getInitials(adminName)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={
            isSubmitting ||
            isCompressing
          }
          className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-violet-600 text-white shadow-lg transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Change profile image"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={
            isSubmitting ||
            isCompressing
          }
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" />
          Choose Image
        </button>

        {resolvedProfileImage && (
          <button
            type="button"
            onClick={removeProfileImage}
            disabled={
              isSubmitting ||
              isCompressing
            }
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Remove Image
          </button>
        )}
      </div>
    </>
  )}

  <p className="mt-4 text-center text-xs leading-5 text-slate-500">
    JPG, PNG or WEBP. Maximum size:
    5 MB. Select an image and adjust
    the crop before saving.
  </p>

  {errors.profileImage && (
    <p className="mt-2 text-center text-xs font-medium text-red-600">
      {errors.profileImage}
    </p>
  )}
</section>

                    {/* Profile Form */}
                    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
                        <h2 className="font-bold text-slate-900">
                          Personal Information
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Edit your admin account
                          details.
                        </p>
                      </div>

                      <div className="space-y-5 p-5 sm:p-7">
                        <FormField
                          label="Full Name"
                          htmlFor="fullName"
                          error={errors.fullName}
                        >
                          <div className="relative">
                            <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                              id="fullName"
                              name="fullName"
                              type="text"
                              value={
                                formData.fullName
                              }
                              onChange={
                                handleChange
                              }
                              disabled={
                                isSubmitting
                              }
                              className={inputClass(
                                Boolean(
                                  errors.fullName,
                                ),
                              )}
                              placeholder="Enter admin name"
                              autoComplete="name"
                            />
                          </div>
                        </FormField>

                        <FormField
                          label="Email Address"
                          htmlFor="email"
                          error={errors.email}
                        >
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                              id="email"
                              name="email"
                              type="email"
                              value={
                                formData.email
                              }
                              onChange={
                                handleChange
                              }
                              disabled={
                                isSubmitting
                              }
                              className={inputClass(
                                Boolean(
                                  errors.email,
                                ),
                              )}
                              placeholder="Enter email address"
                              autoComplete="email"
                            />
                          </div>
                        </FormField>

                        <FormField
                          label="Mobile Number"
                          htmlFor="phoneNumber"
                          error={
                            errors.phoneNumber
                          }
                        >
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                            <input
                              id="phoneNumber"
                              name="phoneNumber"
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              value={
                                formData.phoneNumber
                              }
                              onChange={
                                handlePhoneChange
                              }
                              disabled={
                                isSubmitting
                              }
                              className={inputClass(
                                Boolean(
                                  errors.phoneNumber,
                                ),
                              )}
                              placeholder="Enter mobile number"
                              autoComplete="tel"
                            />
                          </div>
                        </FormField>

                        {/* Form Actions */}
                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                          <Link
                            href="/admin/settings/profile"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </Link>

                          <button
                            type="button"
                            onClick={handleReset}
                            disabled={
                              isSubmitting ||
                              isCompressing ||
                              !hasChanges()
                            }
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reset
                          </button>

                          <button
                            type="submit"
                            disabled={
                              isSubmitting ||
                              isCompressing ||
                              !hasChanges()
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <>
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : isCompressing ? (
                              <>
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </section>
                  </form>
                </>
              )}
            </div>
          </main>

          {/* Footer */}
          <div className="shrink-0">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}

        <span className="ml-1 text-red-500">
          *
        </span>
      </label>

      {children}

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-violet-600" />

        <p className="mt-3 text-sm font-semibold text-slate-600">
          Loading admin profile...
        </p>
      </div>
    </div>
  );
}

function AdminNotFound() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <UserRound className="mx-auto h-12 w-12 text-slate-300" />

      <h1 className="mt-4 text-xl font-bold text-slate-900">
        Admin profile not found
      </h1>

      <p className="mt-2 text-sm text-slate-500">
        Unable to find the logged-in admin
        profile.
      </p>

      <Link
        href="/admin/settings/profile"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Profile
      </Link>
    </div>
  );
}

function inputClass(
  hasError: boolean,
): string {
  return `
    h-12 w-full rounded-xl border bg-white
    pl-12 pr-4 text-sm font-medium text-slate-800
    outline-none transition
    placeholder:text-slate-400
    disabled:cursor-not-allowed disabled:bg-slate-100
    ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
        : "border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
    }
  `;
}

function getInitials(
  fullName: string,
): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");
}

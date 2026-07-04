"use client";

import { type ChangeEvent, type ElementType, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Mail, Phone, Save, Trash2, UserRound } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import dynamic from "next/dynamic";
import type { AvatarEditorRef } from "react-avatar-editor";

const AvatarEditor = dynamic(() => import("react-avatar-editor"), {
  ssr: false,
});

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  profileImage: string | null;
  role: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileApiResponse {
  message?: string;
  user?: UserProfile;
  data?:
    | UserProfile
    | {
        user?: UserProfile;
      };
}

interface EditProfileForm {
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImage: string | null;
}

const emptyForm: EditProfileForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  profileImage: null,
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function getToken(): string | null {
  return localStorage.getItem("taskflow_token") || sessionStorage.getItem("taskflow_token") || localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || localStorage.getItem("token") || sessionStorage.getItem("token");
}

function getApiUser(responseData: unknown): UserProfile | null {
  if (typeof responseData !== "object" || responseData === null) {
    return null;
  }

  const data = responseData as ProfileApiResponse & Partial<UserProfile>;

  if (typeof data.user === "object" && data.user !== null) {
    return data.user;
  }

  if (typeof data.data === "object" && data.data !== null) {
    if ("user" in data.data && typeof data.data.user === "object" && data.data.user !== null) {
      return data.data.user;
    }

    if ("id" in data.data) {
      return data.data as UserProfile;
    }
  }

  if (typeof data.id === "string" && typeof data.fullName === "string") {
    return data as UserProfile;
  }

  return null;
}

async function readResponseData(response: Response): Promise<unknown> {
  const responseText = await response.text();

  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      message: responseText,
    };
  }
}

function getErrorMessage(responseData: unknown, fallbackMessage: string): string {
  if (typeof responseData !== "object" || responseData === null) {
    return fallbackMessage;
  }

  const errorData = responseData as {
    message?: string | string[];
  };

  if (Array.isArray(errorData.message)) {
    return errorData.message.join(" ");
  }

  if (typeof errorData.message === "string") {
    return errorData.message;
  }

  return fallbackMessage;
}

function updateStoredUser(updatedUser: UserProfile) {
  const storageKey = "taskflow_user";

  const localUserText = localStorage.getItem(storageKey);

  const sessionUserText = sessionStorage.getItem(storageKey);

  const updateStorage = (storage: Storage, currentUserText: string | null) => {
    let currentUser: Record<string, unknown> = {};

    if (currentUserText) {
      try {
        currentUser = JSON.parse(currentUserText);
      } catch {
        currentUser = {};
      }
    }

    storage.setItem(
      storageKey,
      JSON.stringify({
        ...currentUser,
        ...updatedUser,
      }),
    );
  };

  if (localUserText) {
    updateStorage(localStorage, localUserText);
  }

  if (sessionUserText) {
    updateStorage(sessionStorage, sessionUserText);
  }

  // Agar user object kisi storage me nahi mila,
  // token ki storage ke according save hoga.
  if (!localUserText && !sessionUserText) {
    if (localStorage.getItem("taskflow_token")) {
      updateStorage(localStorage, null);
    } else {
      updateStorage(sessionStorage, null);
    }
  }
}

export default function EditUserProfilePage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<AvatarEditorRef | null>(null);

  const [formData, setFormData] = useState<EditProfileForm>(emptyForm);

  const [originalFormData, setOriginalFormData] = useState<EditProfileForm>(emptyForm);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);

  const [removeImageRequested, setRemoveImageRequested] = useState(false);

  const [scale, setScale] = useState(1.2);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    const controller = new AbortController();

    const fetchProfile = async () => {
      const token = getToken();

      if (!token) {
        toast.error("Login session not found. Please login again.");

        setLoading(false);
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);

        const response = await fetch(`${apiUrl}/auth/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const responseData = await readResponseData(response);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Your login session has expired. Please login again.");
          }

          throw new Error(getErrorMessage(responseData, "Unable to load profile."));
        }

        const user = getApiUser(responseData);

        if (!user) {
          throw new Error("Profile information was not returned by the server.");
        }

        const loadedForm: EditProfileForm = {
          fullName: user.fullName || "",
          email: user.email || "",
          phoneNumber: user.phoneNumber || "",
          profileImage: user.profileImage ?? null,
        };

        setFormData(loadedForm);
        setOriginalFormData(loadedForm);

        updateStoredUser(user);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load profile.";

        toast.error(message);

        if (message.toLowerCase().includes("session")) {
          router.replace("/login");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      controller.abort();
    };
  }, [apiUrl, router]);

  const initials = useMemo(() => {
    const names = formData.fullName.trim().split(/\s+/).filter(Boolean);

    if (names.length === 0) {
      return "U";
    }

    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }

    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
  }, [formData.fullName]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    if (name === "phoneNumber") {
      const numbersOnly = value.replace(/\D/g, "");

      setFormData((previous) => ({
        ...previous,
        phoneNumber: numbersOnly.slice(0, 15),
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG and WEBP images are allowed.");

      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Profile image must be 5 MB or smaller.");

      event.target.value = "";
      return;
    }

    setSelectedImage(file);
    setScale(1.2);
  };

  const handleCropSave = () => {
    if (!editorRef.current) return;

    const canvas = editorRef.current.getImageScaledToCanvas();

    canvas.toBlob((blob: Blob | null) => {
      if (!blob) {
        toast.error("Unable to process profile image.");
        return;
      }

      const croppedFile = new File([blob], `profile-${Date.now()}.png`, {
        type: "image/png",
      });

      const previewUrl = URL.createObjectURL(blob);

      setCroppedImageFile(croppedFile);
      setRemoveImageRequested(false);

      setFormData((previous) => ({
        ...previous,
        profileImage: previewUrl,
      }));

      setSelectedImage(null);
      setScale(1.2);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }, "image/png");
  };

  const cancelImageCrop = () => {
    setSelectedImage(null);
    setScale(1.2);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeProfileImage = () => {
    if (formData.profileImage?.startsWith("blob:")) {
      URL.revokeObjectURL(formData.profileImage);
    }

    setFormData((previous) => ({
      ...previous,
      profileImage: null,
    }));

    setSelectedImage(null);
    setCroppedImageFile(null);
    setRemoveImageRequested(true);
    setScale(1.2);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setFormData(originalFormData);
    setSelectedImage(null);
    setScale(1.2);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const fullName = formData.fullName.trim();

    const email = formData.email.trim().toLowerCase();

    const phoneNumber = formData.phoneNumber.replace(/\D/g, "").trim();

    if (fullName.length < 2) {
      toast.error("Full name must be at least 2 characters.");
      return;
    }

    if (!email) {
      toast.error("Email address is required.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (phoneNumber && !/^\d{10,15}$/.test(phoneNumber)) {
      toast.error("Mobile number must contain 10 to 15 digits.");
      return;
    }

    const token = getToken();

    if (!token) {
      toast.error("Login session not found. Please login again.");

      router.replace("/login");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${apiUrl}/auth/profile`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          fullName,
          email,
          phoneNumber: phoneNumber || null,

          ...(removeImageRequested && {
            profileImage: null,
          }),
        }),
      });

      const responseData = await readResponseData(response);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your login session has expired. Please login again.");
        }

        throw new Error(getErrorMessage(responseData, "Unable to update profile."));
      }

      let updatedUser = getApiUser(responseData);

      if (!updatedUser) {
        throw new Error("Updated profile information was not returned.");
      }

      if (croppedImageFile) {
        const imageFormData = new FormData();

        imageFormData.append("profileImage", croppedImageFile);

        const imageResponse = await fetch(`${apiUrl}/auth/profile-image`, {
          method: "PATCH",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: imageFormData,
        });

        const imageResponseData = await readResponseData(imageResponse);

        if (!imageResponse.ok) {
          throw new Error(getErrorMessage(imageResponseData, "Profile details updated, but image upload failed."));
        }

        const imageUpdatedUser = getApiUser(imageResponseData);

        if (imageUpdatedUser) {
          updatedUser = imageUpdatedUser;
        }
      }

      updateStoredUser(updatedUser);

      window.dispatchEvent(
        new CustomEvent("taskflow-profile-updated", {
          detail: {
            fullName: updatedUser.fullName,
            profileImage: updatedUser.profileImage || null,
          },
        }),
      );

      const updatedForm: EditProfileForm = {
        fullName: updatedUser.fullName || fullName,

        email: updatedUser.email || email,

        phoneNumber: updatedUser.phoneNumber || "",

        profileImage: updatedUser.profileImage ?? null,
      };

      setFormData(updatedForm);
      setOriginalFormData(updatedForm);
      setCroppedImageFile(null);
      setRemoveImageRequested(false);

      toast.success("Profile updated successfully");

      window.setTimeout(() => {
        router.push("/user/settings/profile");

        router.refresh();
      }, 700);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update profile.";

      toast.error(message);

      if (message.toLowerCase().includes("session")) {
        router.replace("/login");
      }
    } finally {
      setSaving(false);
    }
  };

  const displayProfileImage = getProfileImageUrl(formData.profileImage, apiUrl);

  return (
    <>
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
            minWidth: "280px",
            borderRadius: "14px",
            background: "#ffffff",
            color: "#0f172a",
            padding: "14px 18px",
            fontSize: "14px",
            fontWeight: "600",
            border: "1px solid #e2e8f0",
            boxShadow: "0 15px 35px rgba(15, 23, 42, 0.18)",
          },
        }}
      />

      {loading ? (
        <div className="flex min-h-[450px] flex-col items-center justify-center">
          <LoaderCircle className="h-10 w-10 animate-spin text-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-600">Loading profile...</p>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Page heading */}
          <div className="flex items-start gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-2xl">Edit Profile</h1>

              <p className="mt-1 text-sm text-slate-500">Update your personal and contact information.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {/* Gradient header */}
            <div className="h-32 bg-gradient-to-br from-[#0B2F7A] via-[#0D8CFF] to-[#10C9A7]" />

            <div className="-mt-16 p-5 sm:p-6">
              {/* Profile image */}
              <div className="flex flex-col items-center">
                {selectedImage ? (
                  <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <AvatarEditor ref={editorRef} image={selectedImage} width={180} height={180} border={20} borderRadius={999} scale={scale} rotate={0} color={[255, 255, 255, 0.7]} />

                    <div className="mt-5 w-full">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Zoom</span>

                        <span className="text-xs font-semibold text-blue-600">{scale.toFixed(1)}x</span>
                      </div>

                      <input type="range" min="1" max="3" step="0.1" value={scale} onChange={(event) => setScale(Number(event.target.value))} className="w-full accent-blue-600" />
                    </div>

                    <div className="mt-5 flex w-full flex-col gap-3 sm:flex-row">
                      <button type="button" onClick={cancelImageCrop} className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
                        Cancel
                      </button>

                      <button type="button" onClick={handleCropSave} className="h-11 flex-1 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700">
                        Crop & Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-blue-100 to-emerald-100 text-4xl font-extrabold text-blue-700 shadow-lg">
                        {formData.profileImage ? <img src={displayProfileImage || ""} alt={formData.fullName || "Profile"} className="h-full w-full object-cover" /> : initials}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving}
                        className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-md transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Change profile image"
                      >
                        <Camera className="h-4 w-4" />
                      </button>

                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="hidden" />
                    </div>

                    <p className="mt-3 text-xs text-slate-500">PNG, JPG or WEBP. Maximum size 5 MB.</p>

                    {formData.profileImage && (
                      <button
                        type="button"
                        onClick={removeProfileImage}
                        disabled={saving}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove photo
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Form fields */}
              <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <FormInput label="Full Name" name="fullName" value={formData.fullName} icon={UserRound} placeholder="Enter full name" onChange={handleInputChange} disabled={saving} required />

                <FormInput label="Email Address" name="email" type="email" value={formData.email} icon={Mail} placeholder="Enter email address" onChange={handleInputChange} disabled={saving} required />

                <FormInput label="Mobile Number" name="phoneNumber" type="tel" value={formData.phoneNumber} icon={Phone} placeholder="Enter mobile number" onChange={handleInputChange} inputMode="numeric" maxLength={15} disabled={saving} />
              </div>

              {/* Buttons */}
              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/user/settings/profile")}
                  disabled={saving}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0B2F7A] via-[#0D8CFF] to-[#10C9A7] px-6 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Saving...
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
          </form>
        </div>
      )}
    </>
  );
}

interface FormInputProps {
  label: string;
  name: string;
  value: string;
  icon: ElementType;

  onChange: (event: ChangeEvent<HTMLInputElement>) => void;

  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;

  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search" | "url";
}

function FormInput({ label, name, value, icon: Icon, onChange, type = "text", placeholder, required = false, disabled = false, maxLength, inputMode }: FormInputProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}

        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          inputMode={inputMode}
          onChange={onChange}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>
    </div>
  );
}

function getProfileImageUrl(profileImage: string | null, apiUrl: string): string | null {
  if (!profileImage) {
    return null;
  }

  if (profileImage.startsWith("data:") || profileImage.startsWith("blob:") || profileImage.startsWith("http://") || profileImage.startsWith("https://")) {
    return profileImage;
  }

  if (profileImage.startsWith("/uploads/")) {
    return `${apiUrl}${profileImage}`;
  }

  return profileImage;
}

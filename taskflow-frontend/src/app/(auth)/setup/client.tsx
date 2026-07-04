"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  User,
  Mail,
  Eye,
  EyeOff,
  Lock,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";

const AvatarEditor = dynamic(() => import("react-avatar-editor"), {
  ssr: false,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SetupForm() {
  const router = useRouter();
  const editorRef = useRef<any>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [scale, setScale] = useState(1.2);

  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  const [setupCode, setSetupCode] = useState("");

  /*
   * Check whether the first admin already exists.
   * If setup is complete, prevent access to /setup.
   */
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/setup-status`);

        if (response.data.isSetupDone) {
          router.replace("/login");
          return;
        }

        setCheckingSetup(false);
      } catch (error) {
        console.error("Setup status check failed:", error);

        setApiError("Backend server se connection nahi ho pa raha hai.");

        setCheckingSetup(false);
      }
    };

    checkSetupStatus();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setSelectedImage(file);
    setPreview(null);
  };

  const handleCropSave = () => {
    if (!editorRef.current) return;

    const canvas = editorRef.current.getImageScaledToCanvas();

    const croppedImage = canvas.toDataURL("image/png");

    setPreview(croppedImage);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setPasswordError("");
    setApiError("");

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (!setupCode.trim()) {
      setApiError("Private setup code is required");
      return;
    }

    setLoading(true);

    const formData = {
      systemName: "TaskFlow System",
      adminName: fullName.trim(),
      adminEmail: email.trim().toLowerCase(),
      adminPassword: password,
      profileImage: preview,
      setupCode: setupCode.trim(),
    };

    try {
      const response = await axios.post(`${API_URL}/auth/setup`, formData);

      if (response.status === 200 || response.status === 201) {
        toast.success("Setup completed successfully!");

        setTimeout(() => {
          router.replace("/login");
        }, 800);
      }
    } catch (error: any) {
      const message = error.response?.data?.message;

      setApiError(
        Array.isArray(message)
          ? message.join(", ")
          : message || "Setup failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-slate-500">Checking setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Toaster position="top-right" reverseOrder={false} />
      <div className="w-full bg-white border border-slate-200 shadow-lg rounded-3xl overflow-hidden grid lg:grid-cols-2">
        {/* Left Section */}
        <div className="hidden lg:flex flex-col justify-center items-center bg-green-50 p-12 border-r border-green-100">
          <div className="w-24 h-24 rounded-3xl bg-green-600 flex items-center justify-center mb-6">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">TaskFlow</h1>

          <p className="text-slate-500 text-center mt-4 max-w-sm">
            Setup your first administrator account and start managing projects,
            tasks and teams efficiently.
          </p>

          <div className="mt-10 w-72 h-72 rounded-full bg-green-100 flex items-center justify-center">
            <ShieldCheck className="w-32 h-32 text-green-600" />
          </div>
        </div>

        {/* Right Section */}
        <div className="p-4 md:p-6">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              Initial Setup
            </span>

            <h2 className="text-2xl font-bold text-slate-900 mt-2">
              Create Admin Account
            </h2>

            <p className="text-slate-500 mt-2">
              Create your first administrator account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Full Name
              </label>

              <div className="mt-2 relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);

                    if (apiError) {
                      setApiError("");
                    }
                  }}
                  placeholder="Enter full name"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Email Address
              </label>

              <div className="mt-2 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);

                    if (apiError) {
                      setApiError("");
                    }
                  }}
                  placeholder="Enter email address"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            {/* Profile Image */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Profile Image
              </label>

              <div className="mt-2 border-2 border-dashed border-slate-300 rounded-2xl p-6">
                {!selectedImage && !preview && (
                  <label className="flex flex-col items-center cursor-pointer">
                    <ImageIcon className="w-10 h-10 text-slate-400" />

                    <span className="mt-3 text-sm text-slate-500">
                      Upload profile image
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}

                {selectedImage && !preview && (
                  <div className="flex flex-col items-center gap-4">
                    <AvatarEditor
                      ref={editorRef}
                      image={selectedImage}
                      width={180}
                      height={180}
                      border={20}
                      borderRadius={999}
                      scale={scale}
                    />

                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="w-full accent-green-600"
                    />

                    <button
                      type="button"
                      onClick={handleCropSave}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition"
                    >
                      Crop & Save
                    </button>
                  </div>
                )}

                {preview && (
                  <div className="flex flex-col items-center gap-4">
                    <img
                      src={preview}
                      alt="Profile preview"
                      className="w-28 h-28 rounded-full object-cover border-4 border-green-500"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null);
                        setSelectedImage(null);
                        setScale(1.2);
                      }}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      Change Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Password
              </label>

              <div className="mt-2 relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);

                    if (passwordError) {
                      setPasswordError("");
                    }

                    if (apiError) {
                      setApiError("");
                    }
                  }}
                  placeholder="Enter password"
                  className={`w-full pl-12 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 ${
                    passwordError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-200 focus:ring-green-500"
                  }`}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Confirm Password
              </label>

              <div className="mt-2 relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);

                    if (passwordError) {
                      setPasswordError("");
                    }

                    if (apiError) {
                      setApiError("");
                    }
                  }}
                  placeholder="Confirm password"
                  className={`w-full pl-12 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 ${
                    passwordError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-200 focus:ring-green-500"
                  }`}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {passwordError && (
                <p className="mt-2 text-sm text-red-500">{passwordError}</p>
              )}
            </div>

            {/* Private Setup Code */}
            <div>
              <label
                htmlFor="setupCode"
                className="text-sm font-medium text-slate-700"
              >
                Private Setup Code
              </label>

              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                <input
                  id="setupCode"
                  type="password"
                  value={setupCode}
                  onChange={(event) => {
                    setSetupCode(event.target.value);

                    if (apiError) {
                      setApiError("");
                    }
                  }}
                  placeholder="Enter private setup code"
                  required
                  className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* API Error */}
            {apiError && (
              <p className="text-sm text-red-500 text-center font-medium bg-red-50 py-2.5 px-3 rounded-xl border border-red-100">
                {apiError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Create Admin Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

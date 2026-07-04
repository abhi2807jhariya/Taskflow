"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import Image from "next/image";

import {
  ChevronDown,
  Menu,
  User,
} from "lucide-react";

import Logout from "@/src/app/admin/logout";

interface StoredUser {
  fullName?: string;
  name?: string;
  profileImage?: string | null;
  role?: string;
}

interface HeaderProps {
  userName?: string;
  userRole?: string;
  profileImage?: string | null;
  handleLogout?: () => void;

  setSidebarOpen?: Dispatch<
    SetStateAction<boolean>
  >;
}

/*
 * Database role ko header me
 * readable role name me convert karega.
 */
function getRoleLabel(
  role?: string,
): string {
  const normalizedRole =
    role?.trim().toLowerCase();

  if (normalizedRole === "admin") {
    return "Administrator";
  }

  return "Team Member";
}

export default function Header({
  userName = "User",
  userRole = "user",
  profileImage = null,
  setSidebarOpen,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] =
    useState(false);

  const [headerUserName, setHeaderUserName] =
    useState(userName);

  const [headerUserRole, setHeaderUserRole] =
    useState(userRole);

  const [
    headerProfileImage,
    setHeaderProfileImage,
  ] = useState<string | null>(
    profileImage,
  );

  const [imageError, setImageError] =
    useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  /*
   * Storage se logged-in admin ya user ki
   * name, role aur profile image read karega.
   */
  useEffect(() => {
    const storedUser =
      localStorage.getItem(
        "taskflow_user",
      ) ||
      sessionStorage.getItem(
        "taskflow_user",
      );

    if (!storedUser) {
      setHeaderUserName(userName);
      setHeaderUserRole(userRole);

      setHeaderProfileImage(
        profileImage,
      );

      return;
    }

    try {
      const parsedUser: StoredUser =
        JSON.parse(storedUser);

      const storedRole =
        parsedUser.role || userRole;

      const defaultName =
        storedRole
          .trim()
          .toLowerCase() === "admin"
          ? "Admin"
          : "User";

      setHeaderUserName(
        parsedUser.fullName ||
          parsedUser.name ||
          userName ||
          defaultName,
      );

      setHeaderUserRole(storedRole);

      setHeaderProfileImage(
        parsedUser.profileImage !==
          undefined
          ? parsedUser.profileImage
          : profileImage,
      );
    } catch (error) {
      console.error(
        "Unable to read stored user:",
        error,
      );

      setHeaderUserName(userName);
      setHeaderUserRole(userRole);

      setHeaderProfileImage(
        profileImage,
      );
    }
  }, [
    userName,
    userRole,
    profileImage,
  ]);

  /*
   * Image URL change hone par
   * image error reset hogi.
   */
  useEffect(() => {
    setImageError(false);
  }, [headerProfileImage]);

  /*
   * Dropdown ke bahar click karne par
   * dropdown close hoga.
   */
  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  const apiUrl =
    process.env
      .NEXT_PUBLIC_API_URL ||
    "http://localhost:5000";

  /*
   * Backend relative image path ko
   * complete URL me convert karega.
   */
  const resolvedProfileImage =
    headerProfileImage &&
    !headerProfileImage.startsWith(
      "http",
    ) &&
    !headerProfileImage.startsWith(
      "data:",
    ) &&
    !headerProfileImage.startsWith(
      "blob:",
    )
      ? `${apiUrl}${
          headerProfileImage.startsWith(
            "/",
          )
            ? ""
            : "/"
        }${headerProfileImage}`
      : headerProfileImage;

  const initials = headerUserName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");

  const roleLabel =
    getRoleLabel(headerUserRole);

  return (
    <header className="relative flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile sidebar button */}
        <button
          type="button"
          onClick={() =>
            setSidebarOpen?.(
              (previous) => !previous,
            )
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 md:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Logo */}
        <div className="flex items-center">
          <div className="relative h-[70px] w-[150px]">
            <Image
              src="/assets/logos/taskflow-log.png"
              alt="TaskFlow Logo"
              fill
              sizes="150px"
              priority
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-3">
        <div
          ref={dropdownRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() =>
              setDropdownOpen(
                (previous) =>
                  !previous,
              )
            }
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-100"
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
          >
            <ProfileAvatar
              imageUrl={
                resolvedProfileImage
              }
              imageError={imageError}
              onImageError={() =>
                setImageError(true)
              }
              initials={initials}
              userName={headerUserName}
              sizeClass="h-9 w-9"
            />

            <div className="hidden max-w-32 text-left sm:block">
              <p className="truncate text-sm font-semibold text-slate-800">
                {headerUserName}
              </p>

              <p className="truncate text-xs font-medium text-slate-500">
                {roleLabel}
              </p>
            </div>

            <ChevronDown
              className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
                dropdownOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-[9999] mt-3 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              {/* Logged-in user info */}
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <ProfileAvatar
                  imageUrl={
                    resolvedProfileImage
                  }
                  imageError={
                    imageError
                  }
                  onImageError={() =>
                    setImageError(true)
                  }
                  initials={initials}
                  userName={
                    headerUserName
                  }
                  sizeClass="h-11 w-11"
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {headerUserName}
                  </p>

                  <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                    {roleLabel}
                  </p>
                </div>
              </div>

              <Logout
                onBeforeLogout={() =>
                  setDropdownOpen(false)
                }
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface ProfileAvatarProps {
  imageUrl?: string | null;
  imageError: boolean;
  onImageError: () => void;
  initials: string;
  userName: string;
  sizeClass: string;
}

function ProfileAvatar({
  imageUrl,
  imageError,
  onImageError,
  initials,
  userName,
  sizeClass,
}: ProfileAvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 ${sizeClass}`}
    >
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={`${userName} profile`}
          className="h-full w-full object-cover"
          onError={onImageError}
        />
      ) : initials ? (
        <span className="text-xs font-bold text-green-700">
          {initials}
        </span>
      ) : (
        <User className="h-5 w-5 text-green-600" />
      )}
    </div>
  );
}

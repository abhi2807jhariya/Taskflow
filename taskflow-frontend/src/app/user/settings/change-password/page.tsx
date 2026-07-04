    import type { Metadata } from "next";
    import ChangePasswordPage from "./client";
    
    export const metadata: Metadata = {
    title: {
        default: "Change Password",
        template: "%s | TaskFlow",
    },
    };

    export default function ChangePassword() {
    return (
    <>
    <ChangePasswordPage/>
    </>
    );
    }
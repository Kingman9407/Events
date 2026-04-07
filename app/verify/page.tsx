"use client";
import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "@/lib/firebase";

const VerifyPage: NextPage = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<boolean>(false);
    const [emailFallback, setEmailFallback] = useState<string>("");
    const [needsEmail, setNeedsEmail] = useState<boolean>(false);
    const router = useRouter();

    useEffect(() => {
        const verifyLink = async () => {
            if (isSignInWithEmailLink(auth, window.location.href)) {
                const storedEmail = window.localStorage.getItem("emailForSignIn");
                if (!storedEmail) {
                    setNeedsEmail(true);
                    setLoading(false);
                    return;
                }
                await completeSignIn(storedEmail);
            } else {
                setError("Invalid or expired sign-in link.");
                setLoading(false);
            }
        };

        verifyLink();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const completeSignIn = async (email: string) => {
        setLoading(true);
        setError("");
        try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem("emailForSignIn");
            setSuccess(true);
            setTimeout(() => router.push("/scanner"), 1500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error signing in");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = () => {
        if (!emailFallback || !/\S+@\S+\.\S+/.test(emailFallback)) {
            setError("Please enter a valid email address");
            return;
        }
        completeSignIn(emailFallback);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
            <div className="absolute w-80 h-80 bg-emerald-900/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-sm">
                <div className="bg-[#111118] border border-white/8 rounded-3xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="mb-8">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg
              transition-all duration-500 ${success
                                ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-900/40"
                                : error
                                    ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-900/40"
                                    : "bg-gradient-to-br from-blue-500 to-indigo-500 shadow-blue-900/40"
                            }`}>
                            {success ? (
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : error ? (
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {success ? "Identity Verified!" : error ? "Verification Failed" : "Verifying Guardian"}
                        </h1>
                        <p className="text-white/40 text-sm mt-1">
                            {success
                                ? "Redirecting to the pickup scanner…"
                                : error
                                    ? "There was a problem with your sign-in link"
                                    : needsEmail
                                        ? "Please confirm your email address to continue"
                                        : "Verifying your guardian sign-in link…"}
                        </p>
                    </div>

                    {needsEmail && !success && !loading && (
                        <div className="mb-6 space-y-3">
                            <label className="text-xs font-medium text-white/50 uppercase tracking-widest">
                                Confirm Guardian Email
                            </label>
                            <input
                                type="email"
                                placeholder="guardian@example.com"
                                value={emailFallback}
                                onChange={(e) => setEmailFallback(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                                className="w-full bg-white/5 border border-white/10 text-white
                  placeholder-white/20 rounded-2xl px-4 py-3.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/60
                  focus:border-blue-500/40 transition-all"
                            />
                            <button
                                onClick={handleEmailSubmit}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600
                  hover:from-blue-500 hover:to-indigo-500
                  text-white font-semibold rounded-2xl py-3.5 text-sm
                  transition-all duration-200 active:scale-95 shadow-lg shadow-blue-900/30 mt-2"
                            >
                                Complete Guardian Sign In
                            </button>
                        </div>
                    )}

                    {error && (
                        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20
              rounded-xl px-3 py-2 mb-4 text-center">
                            {error}
                        </p>
                    )}

                    {!success && !needsEmail && (
                        <div className="flex justify-center mb-4">
                            {loading ? (
                                <span className="w-8 h-8 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
                            ) : null}
                        </div>
                    )}

                    <button
                        onClick={() => router.push("/")}
                        className="w-full mt-3 text-white/25 hover:text-white/50 text-sm transition-colors"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyPage;

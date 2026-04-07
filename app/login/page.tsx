"use client";
import type { NextPage } from "next";
import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

const LoginPage: NextPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError("");

        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            saveSession({
                name: user.displayName || "Guardian User",
                email: user.email || "",
                picture: user.photoURL || ""
            });
            
            router.push("/");
        } catch (err: unknown) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Failed to sign in with Google. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
            <div className="absolute w-80 h-80 bg-emerald-900/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-sm">
                <div className="bg-[#111118] border border-white/8 rounded-3xl p-8 shadow-2xl">
                    <div className="mb-8">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-500 shadow-blue-900/40">
                             <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Event Registration
                        </h1>
                        <p className="text-white/40 text-sm mt-1">
                            Sign in to secure your spot
                        </p>
                    </div>

                    <div className="space-y-4">
                        {error && (
                            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                                {error}
                            </p>
                        )}

                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full h-10 bg-white hover:bg-[#f8f9fa] border border-[#dadce0] rounded-[4px] text-[#3c4043] font-medium text-[14px] transition-all flex items-center justify-center shadow-sm disabled:opacity-50"
                            style={{ fontFamily: "'Roboto', arial, sans-serif", letterSpacing: "0.25px" }}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-gray-300 border-t-[#4285F4] rounded-full animate-spin" />
                            ) : (
                                <div className="flex items-center w-full relative">
                                    <div className="w-10 h-10 absolute left-0 flex flex-shrink-0 items-center justify-center p-2.5">
                                        <svg className="w-full h-full" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                    </div>
                                    <span className="flex-grow text-center">Continue with Google</span>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;

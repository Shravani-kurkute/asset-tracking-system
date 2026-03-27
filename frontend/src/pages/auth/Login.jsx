// Login page for authenticating into the asset tracking system.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, LogIn, Shield } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please fill in all fields");
            return;
        }
        setLoading(true);
        try {
            const userData = await login(email, password);
            toast.success(`Welcome back, ${userData.full_name}!`);
            navigate("/dashboard");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (demoEmail) => {
        setEmail(demoEmail);
        setPassword("Admin@1234");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full opacity-5 blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full opacity-5 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">

                {/* Logo + Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg shadow-primary-600/30 mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Asset Tracker</h1>
                    <p className="text-blue-300 mt-1 text-sm">
                        Industrial Asset Management System
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
                    <h2 className="text-xl font-semibold text-white mb-6">Sign in to continue</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 
                                           text-white placeholder-blue-300/50 text-sm
                                           focus:outline-none focus:ring-2 focus:ring-primary-500 
                                           focus:border-transparent transition-all"
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPw ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-11 rounded-xl bg-white/10 border border-white/20 
                                               text-white placeholder-blue-300/50 text-sm
                                               focus:outline-none focus:ring-2 focus:ring-primary-500 
                                               focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-500 
                                       disabled:opacity-60 disabled:cursor-not-allowed
                                       text-white font-semibold rounded-xl
                                       transition-all duration-200 flex items-center justify-center gap-2
                                       shadow-lg shadow-primary-600/30"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <LogIn className="w-4 h-4" />
                            )}
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    {/* Demo accounts */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-xs text-blue-300 font-medium mb-3">Quick Demo Login:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: "System Admin", email: "admin@company.com" },
                                { label: "Department Admin", email: "deptadmin@company.com" },
                                { label: "Employee", email: "employee@company.com" },
                                { label: "Management", email: "management@company.com" },
                            ].map((d) => (
                                <button
                                    key={d.label}
                                    type="button"
                                    onClick={() => fillDemo(d.email)}
                                    className="px-3 py-2 text-xs bg-white/10 hover:bg-white/20 
                                               text-blue-200 rounded-lg border border-white/10
                                               transition-all text-left"
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-blue-400/60 mt-6">
                    © 2026 Asset Tracker · All rights reserved
                </p>
            </div>
        </div>
    );
}

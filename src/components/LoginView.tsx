import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, User, Mail, Lock } from 'lucide-react';

export const LoginView = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    
    // Form States
    const [identifier, setIdentifier] = useState(''); // Email or Username for Login
    const [password, setPassword] = useState('');
    
    // Sign Up specific states
    const [newEmail, setNewEmail] = useState('');
    const [newUsername, setNewUsername] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            let loginEmail = identifier.trim();

            // 1. If identifier is NOT an email, look up the email via username
            if (!loginEmail.includes('@')) {
                // Determine if it's a username lookup
                const { data, error: profileError } = await supabase
                    .from('profiles')
                    .select('email')
                    .ilike('username', loginEmail) // Case-insensitive lookup
                    .single();

                if (profileError || !data) {
                    // Start generic error to avoid enumeration, or specific if debugging
                    throw new Error("Username not found. Please try your email address.");
                }
                loginEmail = data.email;
            }

            // 2. Sign in with the resolved email
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password,
            });

            if (authError) throw authError;

        } catch (err: unknown) {
            if (err instanceof Error) {
                // Handle "Email not confirmed" specifically if possible, though Supabase returns generic "Invalid login credentials" often for safety
                if (err.message.includes("Email not confirmed")) {
                     setError("Please confirm your email address before logging in.");
                } else {
                     setError(err.message || "Failed to sign in");
                }
            } else {
                setError("Failed to sign in");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        // Create User
        // We pass the username in "options.data" so the Postgres Trigger can save it to the profile
        // We also explicitly set the Redirect URL to your production domain
        const { error } = await supabase.auth.signUp({
            email: newEmail,
            password,
            options: {
                data: {
                    username: newUsername
                },
                emailRedirectTo: 'https://cleaning.johnnyautomates.com' 
            }
        });

        if (error) {
            setError(error.message);
        } else {
            setSuccessMsg("Account created! Please check your email to confirm your account before logging in.");
            setIsSignUp(false);
            setIdentifier(newUsername); // Pre-fill login
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-100">
                <div className="flex justify-center mb-6">
                    <div className="bg-teal-50 p-4 rounded-full">
                        <Shield className="w-8 h-8 text-teal-600" />
                    </div>
                </div>
                
                <h1 className="text-2xl font-serif text-center text-stone-800 mb-2">
                    {isSignUp ? "Create Account" : "Welcome Home"}
                </h1>
                <p className="text-center text-stone-500 mb-8 text-sm">
                    {isSignUp ? "Join the household to start cleaning." : "Please sign in to access EasyClean."}
                </p>

                {successMsg && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm text-center">
                        {successMsg}
                    </div>
                )}

                {isSignUp ? (
                    /* SIGN UP FORM */
                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Email</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-3.5 text-stone-400" />
                                <input 
                                    type="email" required
                                    className="w-full pl-10 bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm"
                                    value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Username</label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-3.5 text-stone-400" />
                                <input 
                                    type="text" required
                                    className="w-full pl-10 bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm"
                                    value={newUsername} onChange={e => setNewUsername(e.target.value)}
                                    placeholder="johndoe"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Password</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute left-3 top-3.5 text-stone-400" />
                                <input 
                                    type="password" required
                                    className="w-full pl-10 bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">{error}</div>}
                        <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-100 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? 'Creating...' : 'Sign Up'}
                        </button>
                    </form>
                ) : (
                    /* LOGIN FORM */
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Email or Username</label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-3.5 text-stone-400" />
                                <input 
                                    type="text" required
                                    className="w-full pl-10 bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm"
                                    value={identifier} onChange={e => setIdentifier(e.target.value)}
                                    placeholder="name@example.com or johndoe"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Password</label>
                            <div className="relative">
                                <Lock className="w-4 h-4 absolute left-3 top-3.5 text-stone-400" />
                                <input 
                                    type="password" required
                                    className="w-full pl-10 bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">{error}</div>}
                        <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-100 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccessMsg(null); }} className="text-stone-400 text-sm hover:text-teal-600 transition-colors">
                        {isSignUp ? "Already have an account? Sign In" : "Need an account? Create one"}
                    </button>
                </div>
            </div>
        </div>
    );
};
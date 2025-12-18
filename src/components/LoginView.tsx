import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield } from 'lucide-react';

export const LoginView = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) setError(error.message);
        setLoading(false);
    };

    const handleSignUp = async () => {
        setLoading(true);
        setError(null);
        // Basic signup - ideally you disable this in production after you both sign up
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) setError(error.message);
        else alert("Account created! Check your email to confirm.");
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
                <h1 className="text-2xl font-serif text-center text-stone-800 mb-2">Welcome Home</h1>
                <p className="text-center text-stone-500 mb-8 text-sm">Please sign in to access EasyClean.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Email</label>
                        <input 
                            type="email" 
                            required
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">Password</label>
                        <input 
                            type="password" 
                            required
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-100 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button onClick={handleSignUp} className="text-stone-400 text-sm hover:text-teal-600 transition-colors">
                        Create new account
                    </button>
                </div>
            </div>
        </div>
    );
};
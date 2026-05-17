import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Activity, Lock, Mail, AlertCircle, Heart } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setAuth(data.token, data.user as Parameters<typeof setAuth>[1]);
        setLocation("/dashboard");
      },
      onError: () => {
        setError("Invalid email or password. Please try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full border border-primary-foreground" />
          <div className="absolute top-40 left-40 w-96 h-96 rounded-full border border-primary-foreground" />
          <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full border border-primary-foreground" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-foreground/10 rounded-lg">
              <Activity className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-primary-foreground tracking-tight">MediFlow</span>
          </div>
        </div>
        <div className="relative z-10">
          <blockquote className="text-primary-foreground/90">
            <p className="text-2xl font-light leading-relaxed mb-4">
              "Precision in every appointment. Clarity in every decision."
            </p>
            <footer className="text-primary-foreground/60 text-sm">
              Trusted by 200+ healthcare facilities worldwide
            </footer>
          </blockquote>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: "Appointments", value: "2.4M+" },
            { label: "Doctors", value: "12K+" },
            { label: "Hospitals", value: "200+" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 bg-primary-foreground/10 rounded-xl">
              <div className="text-2xl font-bold text-primary-foreground">{stat.value}</div>
              <div className="text-xs text-primary-foreground/60 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">MediFlow</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Sign in to your healthcare dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" data-testid="login-error">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="you@hospital.com"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="••••••••"
                  required
                  data-testid="input-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="button-submit"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </button>

            <div className="text-center text-sm text-muted-foreground">
              Default credentials: <span className="text-foreground font-medium">admin@generalhospital.com</span> / <span className="text-foreground font-medium">admin123</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

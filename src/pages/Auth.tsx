import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import loginBg from "@/assets/login-bg.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Supabase auth integration
    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Visual Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        <img
          src={loginBg}
          alt="NONFICTION LMS"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/20 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <h1 className="font-display text-4xl tracking-wider text-primary-foreground">
              NONFICTION
            </h1>
            <p className="mt-1 text-sm tracking-[0.3em] text-primary-foreground/70 uppercase">
              Learning Management System
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="font-display text-3xl leading-snug text-primary-foreground">
              배움은<br />
              가장 아름다운<br />
              성장입니다
            </h2>
            <p className="text-sm text-primary-foreground/60 max-w-xs leading-relaxed">
              NONFICTION 사내교육 플랫폼에서 당신의 전문성을 키워보세요.
            </p>
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-16">
        <div className="w-full max-w-md space-y-10">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <h1 className="font-display text-2xl tracking-wider text-foreground">
              NONFICTION
            </h1>
          </div>

          {/* Desktop Logo */}
          <div className="hidden lg:block">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              NONFICTION Education
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">로그인</h2>
            <p className="text-sm text-muted-foreground">
              사내교육 시스템에 접속합니다
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="name@nonfiction.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11 bg-secondary border-0 rounded-xl text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-foreground/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-11 pr-11 bg-secondary border-0 rounded-xl text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-foreground/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-foreground focus:ring-foreground/20"
                />
                <span className="text-sm text-muted-foreground">아이디 저장</span>
              </label>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                비밀번호 찾기
              </button>
            </div>

            <Button
              type="submit"
              variant="login"
              size="xl"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  로그인 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  로그인
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-xs text-muted-foreground/60">
              NONFICTION Internal Education Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

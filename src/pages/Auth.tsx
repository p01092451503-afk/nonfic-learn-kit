import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import loginBg from "@/assets/login-bg.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: fullName },
          },
        });
        if (error) throw error;
        toast({
          title: "가입 완료",
          description: "이메일 인증 링크를 확인해 주세요.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Visual Panel (white/light background) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-white">
        <img
          src={loginBg}
          alt="NONFICTION LMS"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          width={1920}
          height={1080}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <h1 className="font-display text-4xl tracking-wider text-foreground">
              NONFICTION
            </h1>
            <p className="mt-1 text-sm tracking-[0.3em] text-foreground/50 uppercase">
              Learning Management System
            </p>
          </div>
          <div className="space-y-4">
            <h2 className="font-display text-3xl leading-snug text-foreground">
              배움은<br />
              가장 아름다운<br />
              성장입니다
            </h2>
            <p className="text-sm text-foreground/50 max-w-xs leading-relaxed">
              NONFICTION 사내교육 플랫폼에서 당신의 전문성을 키워보세요.
            </p>
          </div>
        </div>
      </div>

      {/* Right - Form (warm/beige background) */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-16 bg-white">
        <div className="w-full max-w-md space-y-10">
          <div className="lg:hidden text-center">
            <h1 className="font-display text-2xl tracking-wider text-foreground">NONFICTION</h1>
          </div>
          <div className="hidden lg:block">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">NONFICTION Education</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              {isSignUp ? "계정 만들기" : "로그인"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "사내교육 시스템에 가입합니다" : "사내교육 시스템에 접속합니다"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">이름</label>
                  <Input
                    type="text"
                    placeholder="홍길동"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 bg-white border border-border rounded-xl text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-foreground/20"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">이메일</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="name@nonfiction.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11 bg-white border border-border rounded-xl text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-foreground/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">비밀번호</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-11 pr-11 bg-white border border-border rounded-xl text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-foreground/20"
                    required
                    minLength={6}
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

            {!isSignUp && (
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
                <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  비밀번호 찾기
                </button>
              </div>
            )}

            <Button type="submit" variant="login" size="xl" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  처리 중...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isSignUp ? "가입하기" : "로그인"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="text-center space-y-3">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 가입하기"}
            </button>
            <p className="text-xs text-muted-foreground/60">NONFICTION Internal Education Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type SessionState = "checking" | "valid" | "invalid";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [linkError, setLinkError] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      // 1) Check for hash-based error (e.g. expired/invalid link)
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const errDesc = hashParams.get("error_description") || hashParams.get("error");
      if (errDesc) {
        if (!mounted) return;
        setLinkError(decodeURIComponent(errDesc.replace(/\+/g, " ")));
        setSessionState("invalid");
        return;
      }

      // 2) PKCE flow: ?code=xxx → exchange for session
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        // Clean the URL regardless
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.hash);
        if (error) {
          if (!mounted) return;
          setLinkError(error.message);
          setSessionState("invalid");
          return;
        }
      }

      // 3) Implicit/hash flow: type=recovery means link is valid
      const type = hashParams.get("type");
      if (type === "recovery") {
        if (!mounted) return;
        setSessionState("valid");
        return;
      }

      // 4) Fallback: if a session already exists (PASSWORD_RECOVERY or exchange done), allow update
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setSessionState("valid");
      } else {
        setSessionState("invalid");
      }
    };

    validate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && mounted) {
        setSessionState("valid");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "오류", description: "비밀번호가 일치하지 않습니다.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "오류", description: "비밀번호는 6자 이상이어야 합니다.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Sign out so the user is forced to log in with the new password
      await supabase.auth.signOut();
      toast({ title: "완료", description: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요." });
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({ title: "오류", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionState === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="h-5 w-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <span className="text-sm">링크 확인 중...</span>
        </div>
      </div>
    );
  }

  if (sessionState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <h2 className="text-xl font-semibold text-foreground">비밀번호 재설정 링크가 유효하지 않습니다</h2>
          <p className="text-sm text-muted-foreground">
            {linkError
              ? "재설정 링크가 만료되었거나 이미 사용된 링크입니다. 비밀번호 찾기를 다시 시도해 주세요."
              : "유효한 재설정 링크가 아닙니다. 이메일에서 링크를 다시 확인해 주세요."}
          </p>
          <Button variant="login" size="xl" onClick={() => navigate("/")} className="rounded-full">
            로그인으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl tracking-wider text-foreground">NONFICTION</h1>
          <h2 className="text-xl font-semibold text-foreground">새 비밀번호 설정</h2>
          <p className="text-sm text-muted-foreground">새로운 비밀번호를 입력해 주세요.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="새 비밀번호 (6자 이상)"
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
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보이기"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 pl-11 bg-white border border-border rounded-xl text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-foreground/20"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" variant="login" size="xl" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                처리 중...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                비밀번호 변경
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

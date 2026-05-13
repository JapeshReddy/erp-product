import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, storeSession } from "@/services/authService";
import { validateSignIn } from "@/hooks/useFormValidation";
import { ROUTES } from "@/constants/auth";
import type { SignInFormData, FormErrors } from "@/types/auth";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
// inside useSignIn():

export interface UseSignInReturn {
  formData: SignInFormData;
  formErrors: FormErrors;
  submitError: string | null;
  isLoading: boolean;
  touched: Record<string, boolean>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (field: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  getError: (field: keyof FormErrors) => string | null;
}

const DEFAULTS: SignInFormData = {
  email: "",
  password: "",
  rememberMe: false,
};

export function useSignIn(): UseSignInReturn {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignInFormData>(DEFAULTS);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { setUser } = useAuth();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSubmitError(null);
  }, []);

  const handleBlur = useCallback(
    (field: string) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      setFormErrors(validateSignIn(formData));
    },
    [formData],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setHasSubmitted(true);
      setTouched({ email: true, password: true });

      const errors = validateSignIn(formData);
      setFormErrors(errors);
      if (Object.keys(errors).length > 0) return;

      setIsLoading(true);
      setSubmitError(null);

      try {
        const response = await loginUser({
          email: formData.email,
          password: formData.password,
        });

        if (!response.success) {
          setSubmitError(response.message ?? "Login failed. Please try again.");
          return;
        }

        // Store session tokens (sessionStorage, never localStorage)
        if (response.session) {
          storeSession(response.session);
          await supabase.auth.setSession({
            access_token: response.session.access_token,
            refresh_token: response.session.refresh_token,
          });
        }
        if (response.data) {
          setUser({
            user_id: response.data.user_id,
            client_id: response.data.client_id,
            client_name: response.data.client_name,
            role: response.data.role,
          });
        }
        navigate(ROUTES.DASHBOARD);
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Network error. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [formData, navigate],
  );

  const getError = useCallback(
    (field: keyof FormErrors): string | null => {
      return touched[field as string] || hasSubmitted
        ? (formErrors[field as string]?.message ?? null)
        : null;
    },
    [formErrors, touched, hasSubmitted],
  );

  return {
    formData,
    formErrors,
    submitError,
    isLoading,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    getError,
  };
}

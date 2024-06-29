import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RegisterForm from "../../components/RegisterForm/RegisterForm";
import LoginForm from "../../components/LoginForm/LoginForm";
import spectraLogo from "../../assets/images/logos/dell-spectra-logo-dark.svg";
import useAuth from "../../hooks/useAuth"; // Import the useAuth hook
import "./AuthPage.scss";

export const AuthPage = () => {
  const navigate = useNavigate();
  const loggedIn = useAuth(); // Use the useAuth hook

  useEffect(() => {
    if (loggedIn) {
      navigate("/dashboard");
    }
  }, [loggedIn, navigate]);

  return (
    <div className="auth-page">
      <div className="login-wrapper">
        <div className="molecule-1"></div>
        <div className="molecule-2"></div>
        <div className="molecule-3"></div>
        <div className="molecule-4"></div>
        <div className="molecule-5"></div>
        <div className="molecule-6"></div>
        <div className="molecule-7"></div>
        <div className="molecule-8"></div>
        <div className="molecule-9"></div>
        <div className="login-form__wrapper">
          <h1 className="login-form__heading">Sign In</h1>
          <div className="login-form__container">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="register-wrapper">
        <div className="register-container">
          <div className="spectra-container">
            <Link to="/" >
              <img src={spectraLogo} className="register-logo" alt="dell spectra brand logo" title="Head back to the landing page"/>
            </Link>
          </div>
          <div className="auth-form">
            <h1 className="auth-form__heading">Create an account</h1>
            <div className="auth-form__container">
              <RegisterForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
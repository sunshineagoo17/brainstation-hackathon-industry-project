import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import ErrorMessage from "../ErrorMessage/ErrorMessage";
import "./LoginForm.scss";

const url = process.env.REACT_APP_BASE_URL;

const LoginForm = () => {
  const [errors, setErrors] = useState({});
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleInput = (event) => {
    const { name, value } = event.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
    setErrors({
      ...errors,
      [name]: "",
    });
  };

  const validate = () => {
    let formErrors = {};
    if (!formValues.email) formErrors.email = "Email is required.";
    if (!formValues.password) formErrors.password = "Password is required.";
    return formErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formErrors = validate();
    setErrors(formErrors);
    if (Object.keys(formErrors).length === 0) {
      try {
        const loginPayload = {
          email: formValues.email,
          password: formValues.password,
        };
        const response = await axios.post(`${url}/auth/login`, loginPayload);
        const userId = response.data.id;
        const message = response.data.message;
  
        if (response.data.success) {
          localStorage.setItem("jwt", response.data.token);
          navigate(`/dashboard/${userId}`); // Navigate to dashboard after successful login
        } else {
          setErrors({ form: message });
        }
      } catch (error) {
        console.error("Login error:", error);
        if (error.response) {
          // The request was made and the server responded with a status code
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
          console.error("Response headers:", error.response.headers);
          setErrors({ form: error.response.data.message || "Unable to Login User." });
        } else if (error.request) {
          // The request was made but no response was received
          console.error("Request data:", error.request);
          setErrors({ form: "No response from server. Please try again later." });
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("Error message:", error.message);
          setErrors({ form: "Login request failed. Please try again." });
        }
      }
    }
  };  

  const handleShowPassword = async (event) => {
    event.preventDefault();
    setShowPassword(!showPassword);
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-form__fields">
        <label htmlFor="email" className="login-form__fields--label">
          Email
        </label>
        <div className="login-email__wrapper">
          <input
            className="login-form__fields--input"
            type="email"
            name="email"
            placeholder="employee@dell.com"
            onChange={handleInput}
            value={formValues.email}
          />
          {errors.email && <ErrorMessage message={errors.email} />}
        </div>
        <label htmlFor="password" className="login-form__fields--label">
          Password
        </label>
        <div className="login-password__wrapper">
          <div className="login-password__container">
            <input
              className="login-form__fields--input password-field"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="**********"
              onChange={handleInput}
              value={formValues.password}
              autoComplete="off"
            />
            <button className="show-password" onClick={handleShowPassword}>
              {showPassword ? (
                <span className="show-password__hide">Hide</span>
              ) : (
                <span className="show-password__show">Show</span>
              )}
            </button>
          </div>
          {errors.password && <ErrorMessage message={errors.password} />}
          {errors.form && <ErrorMessage message={errors.form} />}
        </div>
      </div>
      <a
        className="forgot-password"
        href="https://www.dell.com/dci/idp/dwa/forgotpassword?response_type=id_token&client_id=228467e4-d9b6-4b04-8a11-45e1cc9f786d&redirect_uri=https://www.dell.com/identity/global/in/228467e4-d9b6-4b04-8a11-45e1cc9f786d&scope=openid&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256&tag=cid%3d7bb7b782-5a5d-4fc9-8256-b82ba7cb6003%2caid%3d7d51a773-0eca-42fb-9a89-b0510c6787ce&nonce=zhblrzcwyjpwe1dmjeeyeswd&state=aHR0cHM6Ly93d3cuZGVsbC5jb20vSWRlbnRpdHkvZ2xvYmFsL0luLzdiYjdiNzgyLTVhNWQtNGZjOS04MjU2LWI4MmJhN2NiNjAwMz9jPWNhJmw9ZW4mcj1jYSZzPWNvcnAmYWN0aW9uPXJlZ2lzdGVyJnJlZGlyZWN0VXJsPWh0dHBzOiUyRiUyRnd3dy5kZWxsLmNvbSUyRmVuLWNhJTNGX2dsJTNEMSo2dHV1OHYqX3VwKk1RLi4lMjZnY2xpZCUzRENqMEtDUWp3dmItekJoQ21BUklzQUFmVUkydGx1WWtUSVVwZk00amVEb0pLYUFMNDIydWxZVHl0bmw1TDQ5ZkpPbWJVSEZiSEFEZ3ZLT0FhQWwzQUVBTHdfd2NCJTI2Z2Nsc3JjJTNEYXcuZHM%3d"
      >
        Forgot Password?
      </a>
      <button
        className="login-form__submit"
        type="submit"
        onSubmit={handleSubmit}
      >
        <span className="login-button__text">Sign In</span>
      </button>
    </form>
  );
};

export default LoginForm;
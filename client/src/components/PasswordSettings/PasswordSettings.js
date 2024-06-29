import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import UpdateButtons from "../UpdateButtons/UpdateButtons";
import ErrorMessage from "../ErrorMessage/ErrorMessage";
import "./PasswordSettings.scss";

// Base URL from environment variables
const url = process.env.REACT_APP_BASE_URL;

const PasswordSettings = () => {
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState({});
  const [formValues, setFormValues] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const { userId } = useParams();
  const navigate = useNavigate();
  const loggedIn = useAuth();

  useEffect(() => {
    if (!loggedIn) {
      navigate("/login");
    }
  }, [loggedIn, navigate]);

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
    if (!formValues.current_password) {
      formErrors.current_password = "Current Password is required.";
    }
    if (!formValues.new_password) {
      formErrors.new_password = "New Password is required.";
    }
    if (!formValues.confirm_password) {
      formErrors.confirm_password = "Please Confirm your New Password.";
    }
    if (formValues.new_password !== formValues.confirm_password) {
      formErrors.confirm_password = "Passwords do not match.";
    }
    return formErrors;
  };

  const handleShowPassword = (event) => {
    event.preventDefault();
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formErrors = validate();
    setErrors(formErrors);
    if (Object.keys(formErrors).length === 0) {
      try {
        const updatePayload = {
          current_password: formValues.current_password,
          new_password: formValues.new_password,
        };
        
        // Get the JWT token from local storage
        const token = localStorage.getItem("jwt");
        
        // Include the token in the headers
        const response = await axios.put(
          `${url}/dashboard/${userId}/password`,
          updatePayload,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          alert("Password Successfully Changed.");
          navigate(`/dashboard/${userId}/settings?tab=profile`);
        } else {
          setErrors({ form: response.data.message });
        }
      } catch (error) {
        console.error("Error updating password:", error);
        setErrors({ form: "Unable to Update Password." });
      }
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Get the JWT token from local storage
        const token = localStorage.getItem("jwt");

        const response = await axios.get(
          `${url}/dashboard/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error("Error retrieving user data: ", error);
      }
    };

    fetchUser();
  }, [userId]);

  return (
    <>
      <form className="password-form" onSubmit={handleSubmit}>
        <div className="password-form__heading-container">
          <h1 className="password-form__heading">
            {user.first_name} {user.last_name}
          </h1>
          <h4 className="password-form__heading--title">Administrator</h4>
        </div>
        <div className="password-inputs">
          <div className="password-inputs__container">
            <label
              htmlFor="current_password"
              className="password-inputs__container--label"
            >
              Current Password
            </label>
            <div className="register-password__wrapper">
              <div className="register-password__container password-toggle">
                <input
                  className="password-inputs__container--field"
                  name="current_password"
                  type={showPassword ? "text" : "password"}
                  placeholder="**********"
                  onChange={handleInput}
                  value={formValues.current_password}
                  autoComplete="off"
                />
                <button
                  className="show-password password-toggle__button"
                  onClick={handleShowPassword}
                >
                  {showPassword ? (
                    <span className="show-password__hide">Hide</span>
                  ) : (
                    <span className="show-password__show">Show</span>
                  )}
                </button>
              </div>
              {errors.current_password && (
                <ErrorMessage message={errors.current_password} isSecondary />
              )}
            </div>
          </div>
          <div className="password-inputs__container">
            <label
              htmlFor="new_password"
              className="password-inputs__container--label"
            >
              New Password
            </label>
            <input
              className="password-inputs__container--field"
              type="password"
              name="new_password"
              placeholder="Choose a new password"
              onChange={handleInput}
              value={formValues.new_password}
              autoComplete="off"
            />
            {errors.new_password && (
              <ErrorMessage message={errors.new_password} isSecondary />
            )}
          </div>
          <div className="password-inputs__container">
            <label
              htmlFor="confirm_password"
              className="password-inputs__container--label"
            >
              Confirm Password
            </label>
            <input
              className="password-inputs__container--field"
              name="confirm_password"
              type="password"
              placeholder="Confirm new password"
              onChange={handleInput}
              value={formValues.confirm_password}
              autoComplete="off"
            />
            {errors.confirm_password && (
              <ErrorMessage message={errors.confirm_password} isSecondary />
            )}
          </div>
        </div>
        {errors.form && <ErrorMessage message={errors.form} isSecondary />}
      </form>
      <div className="update-buttons">
        <UpdateButtons handleSubmit={handleSubmit} userId={userId} />
      </div>
    </>
  );
};

export default PasswordSettings;
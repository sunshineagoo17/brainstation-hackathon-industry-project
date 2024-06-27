import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import axios from "axios";
import searchIcon from "../../assets/icons/search-icon.svg";
import accountIcon from "../../assets/icons/person-icon.svg";
import alertIcon from "../../assets/icons/alert-icon.svg";
import "./Header.scss";

// Base Url for get requests
const url = process.env.REACT_APP_BASE_URL;

const Header = ({ userId }) => {
  const [isTyping, setIsTyping] = useState(false);
  const loggedIn = useAuth();
  const userNameRef = useRef(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (loggedIn && userId) {
        try {
          const response = await axios.get(`${url}/dashboard/${userId}`);
          formatUserName(response.data.first_name, response.data.last_name);
        } catch (error) {
          console.error(`Error fetching user data: ${error.message}`);
        }
      } else {
        console.log('LoggedIn:', loggedIn, 'UserId:', userId);
      }
    };

    const calculateTextWidth = (text) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.font = "400 0.83rem Arial"; // Match the font properties
      return context.measureText(text).width;
    };

    const formatUserName = (firstName, lastName) => {
      const fullName = `${firstName} ${lastName}`;
      const containerWidth = 60; // Fixed width of the container in px

      if (calculateTextWidth(fullName) <= containerWidth) {
        setDisplayName(fullName);
      } else {
        const lastInitial = `${lastName.charAt(0)}.`;
        const adjustedName = `${firstName} ${lastInitial}`;
        setDisplayName(adjustedName);
      }
    };

    fetchUserData();
  }, [userId, loggedIn]);

  return (
    <header className="header-bar">
      <div className="header-wrapper">
        <div className="header-wrapper__search">
          <img
            src={searchIcon}
            className="header-wrapper__search--icon"
            alt="magnifying glass search icon"
          />
          <input
            className={`header-wrapper__search--input ${
              isTyping ? "typing" : ""
            }`}
            type="search"
            placeholder="Search"
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
          />
        </div>
        <div className="header-wrapper__content">
          <Link
            to={`/dashboard/${userId}/settings?tab=alerts`}
            className="alerts-link"
          >
            <img
              src={alertIcon}
              className="alerts-link__icon"
              alt="bell icon for the alert icon"
            />
          </Link>
          <div className="user-info">
            <div
              className="user-info__titles"
              ref={userNameRef}
              style={{
                maxWidth: "60px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <h5 className="user-info__titles--name">{displayName}</h5>
              <p className="user-info__titles--position">Admin</p>
            </div>
            <div className="img-cont">
              <img
                src={accountIcon}
                className="user-info__icon"
                alt="person outline account icon"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

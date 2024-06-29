import { useEffect, useState } from "react";

const useAuth = () => {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    console.log("Token in useAuth hook:", token); // Debug log for token
    if (token) {
      setLoggedIn(true);
    } else {
      setLoggedIn(false);
    }
    console.log("LoggedIn state in useAuth hook:", !!token); // Debug log for loggedIn state
  }, []);

  return loggedIn;
};

export default useAuth;
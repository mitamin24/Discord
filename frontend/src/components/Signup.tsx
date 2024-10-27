import axios from "axios";
import { useState } from "react";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");

  return (
    <div
      className="min-h-screen flex items-center justify-center text-white relative"
      style={{
        background: "linear-gradient(145deg, #000000 30%, #130F40 100%)",
      }}
    >
      {/* Popup */}
      {showPopup && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-50">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform ${
              popupType === "success" ? "bg-green-500" : "bg-red-500"
            } text-white text-sm`}
          >
            {popupMessage}
          </div>
        </div>
      )}

      <div
        className="bg-black/50 backdrop-blur-lg p-9 rounded-lg shadow-lg w-96"
        style={{
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="flex justify-center">
          <h1 className="text-3xl font-extrabold mb-3">Sign up</h1>
        </div>

        <div className="flex justify-center">
          <form className="space-y-4 md:space-y-6">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                Your email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                className="bg-gray-900 p-1 rounded-lg"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                Username
              </label>
              <input
                type="text"
                name="username"
                id="username"
                className="bg-gray-900 p-1 rounded-lg"
                placeholder="Username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                placeholder="••••••••"
                className="bg-gray-900 p-1 rounded-lg"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full text-white bg-gray-900 hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-transform duration-200 transform hover:scale-105 active:scale-95"
              onClick={async (e) => {
                e.preventDefault(); // Prevent default form submission
                try {
                  const response = await axios.post("http://localhost:3001/api/auth/signup", {
                    email,
                    username,
                    password,
                  });

                  setPopupMessage("Signup successful!");
                  setPopupType("success");
                  setShowPopup(true);

                  setTimeout(() => {
                    setShowPopup(false);
                  }, 3000);
                } catch (error) {
                  setPopupMessage("Signup failed. Please try again.");
                  setPopupType("error");
                  setShowPopup(true);

                  // Hide the popup after 3 seconds
                  setTimeout(() => {
                    setShowPopup(false);
                  }, 3000);
                }
              }}
            >
              Create an account
            </button>

            <p className="text-sm font-light text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <a
                href="/signin"
                className="font-medium text-primary-600 hover:underline dark:text-primary-500"
              >
                Login here
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;

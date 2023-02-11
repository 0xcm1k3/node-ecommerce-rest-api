import { postData, getData, validateToken } from "./functions.js";
const login = async (e) => {
  e.preventDefault();
  const response = await postData("/auth/login", e);
  if (response?.message == "success") {
    localStorage.setItem("token", response.token);
    alert("user logged in!");
    const tokenStatus = await validateToken();
    if (tokenStatus?.role == "admin") {
      window.location = "/admin-dashboard.html";
      return;
    }
  } else {
    alert(response?.error ?? "response OK");
  }
};

const register = async (e) => {
  e.preventDefault();
  const response = await postData("/auth/register", e);
  console.log(response);
  if (response.message == "success") {
    alert("user registered!");
  } else {
    console.log(response);
    alert(response?.message ?? "response OK");
  }
};

window.onload = async () => {
  if (localStorage.getItem("token")) {
    const tokenStatus = await validateToken();
    if (tokenStatus.error) {
      localStorage.removeItem("token");
      return;
    }
    if (tokenStatus?.role == "admin") {
      window.location = "/admin-dashboard.html";
      return;
    } else if (tokenStatus?.role == "merchant") {
      window.location = "/merchant-dashboard.html";
      return;
    }
    window.location = "/dashboard.html";
    return;
  }
  if (document.getElementById("login_form")) {
    document.getElementById("login_form").onsubmit = login;
  }
  if (document.getElementById("register_form")) {
    document.getElementById("register_form").onsubmit = register;
  }
};

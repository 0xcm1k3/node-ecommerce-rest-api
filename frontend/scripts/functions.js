axios.defaults.baseURL = "http://localhost:6969";

export let postData = async (endpoint, eventTarget, data) => {
  let formFields = new FormData(eventTarget?.currentTarget);
  try {
    const response = await axios.post(
      endpoint,

      data ? data : Object.fromEntries(formFields.entries()),
      {
        headers: {
          Authorization: localStorage.getItem("token") ?? "",
        },
      }
    );
    return response.data;
  } catch (e) {
    console.log(e.response.data.error || e.message);
    return { error: e.response.data.error || e.message };
  }
};

export let uploadFile = async (endpoint, eventTarget) => {
  let formData = new FormData();

  formData.append("upload", eventTarget.target.files[0]);

  try {
    const response = await axios.post(
      endpoint,

      formData,
      {
        headers: {
          Authorization: localStorage.getItem("token") ?? "",
        },
      }
    );
    return response.data;
  } catch (e) {
    console.log(e?.response?.data?.error || e.message);
    return { error: e?.response?.data?.error || e.message };
  }
};
export let putData = async (endpoint, eventTarget) => {
  let formFields = new FormData(eventTarget.currentTarget);
  try {
    const response = await axios.put(
      endpoint,

      Object.fromEntries(formFields.entries()),
      {
        headers: {
          Authorization: localStorage.getItem("token") ?? "",
        },
      }
    );
    return response.data;
  } catch (e) {
    console.log(e.response.data.error || e.message);
    return { error: e.response.data.error || e.message };
  }
};
export let getData = async (endpoint) => {
  try {
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: localStorage.getItem("token") ?? "",
      },
    });
    return response.data;
  } catch (e) {
    console.log(e.response.data.error || e.message);
    return { error: e.response.data.error || e.message };
  }
};
export let deleteData = async (endpoint) => {
  try {
    const response = await axios.delete(endpoint, {
      headers: {
        Authorization: localStorage.getItem("token") ?? "",
      },
    });
    return response.data;
  } catch (e) {
    console.log(e.response.data.error || e.message);
    return { error: e.response.data.error || e.message };
  }
};
export let validateToken = async () => {
  if (!localStorage.getItem("token")) {
    // redirect to login
    window.location = "/index.html";
    return;
  }

  const response = await getData("/auth/token");
  if (response?.message != "success") {
    alert(response.error);
    localStorage.removeItem("token");
    // redirect to login page
    window.location = "/index.html";
    return;
  }

  return response;
};

export let getCurrentProfile = async () => {
  const response = await getData("/users/my");
  document.getElementById("welcome_text").innerText =
    response?.full_name ?? "N/A";
  document.getElementById("email_address_text").innerText =
    response?.email_address ?? "joe@example.com";
};

import {
  validateToken,
  postData,
  putData,
  getData,
  deleteData,
  uploadFile,
  getCurrentProfile,
} from "./functions.js ";

window.editUser = async (id) => {
  const full_name = document.getElementById("full_name_input");
  const email_address = document.getElementById("email_address_input");
  const role = document.getElementById("role_dropdown");

  const getUserInfo = await getData(`/users/${id}`);

  if (getUserInfo.error) {
    alert(getUserInfo.error);
    return;
  }

  full_name.value = getUserInfo.full_name;
  email_address.value = getUserInfo.email_address;
  role.value = getUserInfo.role;
  const addUserBlock = document.getElementById("add_user_block");
  const usersTable = document.getElementById("users_table");
  if (usersTable.style.display != "none") {
    usersTable.style.display = "none";
  }
  if (addUserBlock.style.display != "none") {
    addUserBlock.style.display = "none";
    return;
  }
  addUserBlock.style.display = "block";

  document.getElementById("add_user_form").onsubmit = async (e) => {
    e.preventDefault();
    const response = await putData(`/users/${id}`, e);
    if (response.error) {
      alert(response.error);
      return;
    }
    alert("user updated!");
    editUser(id);
  };
};
window.removeUser = async (id) => {
  const response = await deleteData(`/users/${id}`);
  if (response.error) {
    alert(response.error);
    return;
  }
  document.getElementById("row_" + id).remove();
  alert("user deleted!");
};

const getUsers = async () => {
  const usersTable = document.getElementById("users_table");
  if (usersTable.style.display != "none") {
    usersTable.style.display = "none";
    return;
  }
  const addUserBlock = document.getElementById("add_user_block");
  if (addUserBlock.style.display != "none") {
    addUserBlock.style.display = "none";
  }
  const response = await getData("/users/all");
  if (response) {
    usersTable.style.display = "block";
  }
  response?.users.forEach((user, index) => {
    let row = usersTable.insertRow();
    row.setAttribute("id", `row_${user.ID}`);
    Object.keys(user).forEach((key, key_index) => {
      if (key == "ID") {
        return;
      }
      let cell = row.insertCell();
      cell.innerText = user[key] ?? "-";
      if (key_index == Object.keys(user).length - 1) {
        let actions = row.insertCell();

        actions.innerHTML = `<button onclick='editUser(${user.ID})'>+</button><button  onclick='removeUser(
          ${user.ID}
          )'>-</button>`;
      }
    });
  }) ?? "No users";
};

const addUser = async (e) => {
  e.preventDefault();
  const response = await postData("/users/new", e);
  if (response.error) {
    alert(response.error);
    return;
  }

  alert("user added!");
  document.getElementById("add_user_form").reset();
};

const loadProducts = async () => {
  const response = await getData("/products/all");

  if (response.error) {
    alert(response.error);
    return;
  }
  const productsListDOM = document.getElementById("products_list");
  response?.products.forEach((p) => {
    productsListDOM.innerHTML += `<article id="product_${p.product_id}">
    <center>
    <br>
    <img src="${p.product_image}" width=100 height=100>
    <div class="text">
    <br>
    <br>
    <form id="product_form_${p.product_id}">
    <input type="hidden" value="${p.product_image}" id="product_image_${p.product_id}"/>
    <input type="text" id="product_name_${p.product_id}" value="${p.product_name}" disabled / >
    <input type="text"  value="${p.product_category}" disabled / >
    <input type="text" id="product_price_${p.product_id}"value="${p.product_price}" disabled / >
    <label id="merchant_label">MERCHANT: </label>  
    </div>
      <button onclick="editProduct(${p.product_id})">EDIT</button>
      </form>
      <button onclick="deleteProduct(${p.product_id})">DELETE</button>
  </center>
  <br>
    
  </article>`;
  });
};

const addProduct = async (e) => {
  e.preventDefault();

  const response = await postData("/products/new", e);

  if (response.error) {
    alert(response.error);
    return;
  }

  alert("product added successfully!");

  window.location.reload();
};

const uploadProductImage = async (e) => {
  e.preventDefault();
  const response = await uploadFile("/uploads/upload", e);

  if (response.error) {
    alert(response.error);
    return;
  }

  document.getElementById("product_image_url").value = response.imageURL;
  alert("image uploaded!");
};

window.editProduct = async (id) => {
  const productImage = document.getElementById(`product_image_${id}`);
  const productName = document.getElementById(`product_name_${id}`);
  const productPrice = document.getElementById(`product_price_${id}`);
  if (productName.hasAttribute("disabled")) {
    productName.removeAttribute("disabled");
    productPrice.removeAttribute("disabled");
    productImage.type = "text";
    const merchants = await getData("/users/all");
    if (merchants.error) {
      console.log("failed to load merchants");
      return;
    }
    const productOwnersDropDown = document.createElement("select");
    // productOwnersDropDown.name = "product_owner";
    document
      .getElementById("merchant_label")
      .appendChild(productOwnersDropDown);
    productOwnersDropDown.id = `product_owner_${id}`;
    merchants?.users
      .filter((user) => user.role?.toLowerCase() == "merchant")
      .forEach((merchant) => {
        const option = document.createElement("option");
        option.value = merchant.ID;
        option.text = `${merchant.full_name} (${merchant.email_address})`;
        productOwnersDropDown.add(option, 0);
      });
    return;
  }
  console.log({
    product_name: productName.value,
    product_image: productImage.value,
    product_price: productPrice.value,
    product_owner: document.getElementById(`product_owner_${id}`).value,
  });
  const response = await postData(`/products/${id}`, undefined, {
    product_name: productName.value,
    product_image: productImage.value,
    product_price: productPrice.value,
    product_owner: document.getElementById(`product_owner_${id}`).value,
  });

  if (response.error) {
    alert(response.error);
    return;
  }

  alert("product edited!");
  productName.disabled = true;
  productPrice.disabled = true;
  productImage.type = "hidden";
  document.getElementById(`product_owner_${id}`).remove();
};

window.deleteProduct = async (id) => {
  const response = await deleteData(`/products/${id}`);
  if (response.error) {
    alert(response.error);
    return;
  }
  document.getElementById("product_" + id).remove();
  alert("product deleted!");
};
window.onload = async () => {
  const tokenStatus = await validateToken();

  if (tokenStatus.error) {
    console.log(tokenStatus.error);
    alert(tokenStatus.error);
    window.location = "/index.html";
    return;
  }

  if (tokenStatus?.role != "admin") {
    alert("you dont have permission to visit this page!");
    window.location = "/index.html";
    return;
  } else if (tokenStatus?.role == "merchant") {
    window.location = "/merchant-dashboard.html";
    return;
  }

  getCurrentProfile();
  loadProducts();

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("token");
      window.location = "/index.html";
    };
  }
  const viewUsersBtn = document.getElementById("view_users_btn");
  if (viewUsersBtn) {
    viewUsersBtn.onclick = getUsers;
  }
  const addUserBlock = document.getElementById("add_user_block");
  const addUserBtn = document.getElementById("add_user_btn");
  const addUserForm = document.getElementById("add_user_form");
  const usersTable = document.getElementById("users_table");
  if (addUserBtn) {
    addUserForm.onsubmit = addUser;
    addUserBtn.onclick = () => {
      addUserForm.reset();
      if (usersTable.style.display != "none") {
        usersTable.style.display = "none";
      }
      if (addUserBlock.style.display != "none") {
        addUserBlock.style.display = "none";
        return;
      }
      addUserBlock.style.display = "block";
    };
  }
  const addProductBlock = document.getElementById("add_product_block");
  const addProductBtn = document.getElementById("add_product_btn");
  const addProductForm = document.getElementById("add_product_form");
  const uploadImage = document.getElementById("product_image_input");
  if (addProductBtn) {
    addProductForm.onsubmit = addProduct;
    uploadImage.onchange = uploadProductImage;
    addProductBtn.onclick = async () => {
      addProductForm.reset();
      if (usersTable.style.display != "none") {
        usersTable.style.display = "none";
      }
      if (addProductBlock.style.display != "none") {
        addProductBlock.style.display = "none";
        return;
      }
      if (addUserBlock.style.display != "none") {
        addUserBlock.style.display = "none";
      }
      if (addUserBlock.style.display != "none") {
        addUserBlock.style.display = "none";
      }
      addProductBlock.style.display = "block";

      const merchants = await getData("/users/all");
      if (merchants.error) {
        console.log("failed to load merchants");
        return;
      }
      const productOwnersDropDown = document.createElement("select");
      productOwnersDropDown.name = "product_owner";
      document.getElementById("owner_label").appendChild(productOwnersDropDown);
      merchants?.users
        .filter((user) => user.role?.toLowerCase() == "merchant")
        .forEach((merchant) => {
          const option = document.createElement("option");
          option.value = merchant.ID;
          option.text = `${merchant.full_name} (${merchant.email_address})`;
          productOwnersDropDown.add(option, 0);
        });
    };
  }
};

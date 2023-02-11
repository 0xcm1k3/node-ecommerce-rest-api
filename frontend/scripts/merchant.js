import {
  validateToken,
  postData,
  putData,
  getData,
  deleteData,
  uploadFile,
  getCurrentProfile,
} from "./functions.js ";

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
const loadProducts = async () => {
  const response = await getData("/products/my");

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
window.onload = async () => {
  const tokenStatus = await validateToken();

  if (tokenStatus.error) {
    console.log(tokenStatus.error);
    alert(tokenStatus.error);
    window.location = "/index.html";
    return;
  }

  if (tokenStatus?.role != "merchant") {
    alert("you dont have permission to visit this page!");
    window.location = "/index.html";
    return;
  } else if (tokenStatus?.role == "admin") {
    window.location = "/admin-dashboard.html";
    return;
  }

  getCurrentProfile();
  loadProducts();

  const addProductBlock = document.getElementById("add_product_block");
  const addProductBtn = document.getElementById("add_product_btn");
  const addProductForm = document.getElementById("add_product_form");
  const uploadImage = document.getElementById("product_image_input");
  if (addProductBtn) {
    addProductForm.onsubmit = addProduct;
    uploadImage.onchange = uploadProductImage;
    addProductBtn.onclick = async () => {
      addProductForm.reset();
      if (addProductBlock.style.display != "none") {
        addProductBlock.style.display = "none";
        return;
      }

      addProductBlock.style.display = "block";
    };
  }
};

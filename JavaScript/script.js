// 初期値は適当に大阪周辺
var latitude = 34.702485;
var longitude = 135.495951;

const map = L.map("map").setView([latitude, longitude], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// webAPIを使って位置情報を取得ダイアログは自動で表示される
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
} else {
  alert("ブラウザは位置情報機能に対応していません。");
}

let clickedLatLng = null;

// DOM要素の取得
const overlay = document.getElementById("overlay");
const formContainer = document.getElementById("formContainer");
const titleInput = document.getElementById("titleInput");
const commentInput = document.getElementById("commentInput");
const imageInput = document.getElementById("imageInput");
const addBtn = document.getElementById("addBtn");
const cancelBtn = document.getElementById("cancelBtn");

map.on("click", function (e) {
  clickedLatLng = e.latlng;
  overlay.style.display = "block";
  formContainer.style.display = "block";
});

cancelBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  formContainer.style.display = "none";
  titleInput.value = "";
  commentInput.value = "";
  imageInput.value = "";
});

addBtn.addEventListener("click", () => {
  if (!clickedLatLng) return;

  const title = titleInput.value.trim();
  const comment = commentInput.value.trim();
  const file = imageInput.files[0];

  if (!title && !comment && !file) {
    alert("何か入力してください");
    return;
  }

  let imageHTML = "";
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imageHTML = `<img src="${e.target.result}" width="150"><br>`;
      addMarker(title, comment, imageHTML);
    };
    reader.readAsDataURL(file);
  } else {
    addMarker(title, comment, imageHTML);
  }

  overlay.style.display = "none";
  formContainer.style.display = "none";
  titleInput.value = "";
  commentInput.value = "";
  imageInput.value = "";
});

function addMarker(title, comment, imageHTML) {
  const popupHTML = `<b>${title}</b><br>${imageHTML}${comment}`;
  L.marker([clickedLatLng.lat, clickedLatLng.lng])
    .addTo(map)
    .bindPopup(popupHTML);
}

// 取得に成功した場合の処理
function successCallback(position) {
  latitude = position.coords.latitude;
  longitude = position.coords.longitude;
  console.log("Latitude: " + latitude + ", Longitude: " + longitude);

  // 地図の中心を現在地に設定
  map.setView([latitude, longitude], 13);
}

// 取得に失敗した場合の処理
function errorCallback(error) {
  let errorMessage = "位置情報の取得に失敗しました。";
  switch (error.code) {
    case error.PERMISSION_DENIED:
      errorMessage = "位置情報の利用が拒否されました。";
      break;
    case error.POSITION_UNAVAILABLE:
      errorMessage = "位置情報を特定できませんでした。";
      break;
    case error.TIMEOUT:
      errorMessage = "位置情報の取得がタイムアウトしました。";
      break;
  }
  alert(errorMessage);
}

// 初期値は適当に大阪周辺
let latitude = 34.702485;
let longitude = 135.495951;

const DEFAULT_ZOOM = 13; // 初期ズームレベル
const LOCATION_ZOOM = 16; // 現在地へ移動するときのズームレベル

const map = L.map("map").setView([latitude, longitude], DEFAULT_ZOOM);
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
const imagePreview = document.getElementById("imagePreview");

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) {
    imagePreview.src = "";
    imagePreview.style.display = "none";
    return;
  }

  const url = URL.createObjectURL(file);
  imagePreview.src = url;
  imagePreview.style.display = "block";
});

const addBtn = document.getElementById("addBtn");
const cancelBtn = document.getElementById("cancelBtn");
cancelBtn.addEventListener("click", () => {
  overlay.style.display = "none";
  formContainer.style.display = "none";
  titleInput.value = "";
  commentInput.value = "";
  imageInput.value = "";

  imagePreview.src = "";
  imagePreview.style.display = "none";
});


const myUserId = (() => {
  let id = localStorage.getItem("myUserId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("myUserId", id);
  }
  return id;
})();


map.on("click", function (e) {
  const t = e.originalEvent?.target;
  if (t && (t.closest(".leaflet-popup") || t.closest("#formContainer"))) return;
  
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

addBtn.addEventListener("click", async () => {
  if (!clickedLatLng) return;

  const title = titleInput.value.trim();
  const comment = commentInput.value.trim();
  const file = imageInput.files[0];

  if (!title && !comment && !file) {
    alert("何か入力してください");
    return;
  }

  let imageDataUrl = "";
  if (file) {
    imageDataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  const m = {
    id: uid(),
    ownerId: myUserId,
    lat: clickedLatLng.lat,
    lng: clickedLatLng.lng,
    title,
    comment,
    imageDataUrl,
    likes: 0,
    liked: false
  };

  markersData.push(m);
  saveMarkers();
  addMarkerFromData(m);

  overlay.style.display = "none";
  formContainer.style.display = "none";
  titleInput.value = "";
  commentInput.value = "";
  imageInput.value = "";
});


function addMarkerFromData(m) {
  const marker = L.marker([m.lat, m.lng]).addTo(map);

  marker.on("popupopen", () => {
  const popupEl = marker.getPopup().getElement();
  if (!popupEl) return;

  popupEl.addEventListener("click", (ev) => {
    const likeBtn = ev.target.closest(".like-btn");
    const deleteBtn = ev.target.closest(".delete-btn");

    L.DomEvent.stop(ev);

    if (likeBtn) {
      const id = likeBtn.dataset.id;
      const target = markersData.find(x => x.id === id);
      if (!target) return;

      target.liked = !target.liked;
      target.likes += target.liked ? 1 : -1;
      if (target.likes < 0) target.likes = 0;

      saveMarkers();
      marker.setPopupContent(makePopupHTML(target));
      return;
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      const idx = markersData.findIndex(x => x.id === id);
      if (idx === -1) return;

      if (!confirm("このマーカーを削除しますか？")) return;

      markersData.splice(idx, 1);
      saveMarkers();
      map.removeLayer(marker);
    }
  });
});

  marker.bindPopup(makePopupHTML(m));
}


// 取得に成功した場合の処理
function successCallback(position) {
  latitude = position.coords.latitude;
  longitude = position.coords.longitude;
  console.log("Latitude: " + latitude + ", Longitude: " + longitude);

  // 地図の中心を現在地に設定
  map.setView([latitude, longitude], LOCATION_ZOOM);
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


//選んだ画像をユーザーアイコンに反映
const userAvatarInput = document.getElementById("userAvatarInput");
const userAvatar = document.getElementById("userAvatar");

userAvatarInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  userAvatar.src = url;
});

//ヘッダーbtn クリックしたら画面移動
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (!btn) return;
  const href = btn.dataset.href || btn.closest('.nav-buttons')?.dataset.href;
  if (!href) return;
  location.href = href;
});

const markersData = loadMarkers();

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function saveMarkers() {
  localStorage.setItem("markersData", JSON.stringify(markersData));
}

function loadMarkers() {
  try {
    return JSON.parse(localStorage.getItem("markersData")) || [];
  } catch {
    return [];
  }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function makePopupHTML(m) {
  const title = escapeHtml(m.title);
  const comment = escapeHtml(m.comment);

  const imageHTML = m.imageDataUrl
  ? `<img class="popup-img js-zoom-img" src="${m.imageDataUrl}" data-src="${m.imageDataUrl}" alt="">`
  : "";


  const heart = m.liked ? "♥" : "♡";
  const likedClass = m.liked ? "is-liked" : "";

  const deleteBtn =
    m.ownerId === myUserId
      ? `<button class="delete-btn" data-id="${m.id}">削除</button>`
      : "";

  return `
    <div class="popup">
      ${title ? `<div class="popup-title">${title}</div>` : ""}
      ${imageHTML}
      ${comment ? `<div class="popup-comment">${comment}</div>` : ""}
      <div class="popup-actions">
        <button class="like-btn ${likedClass}" data-id="${m.id}" type="button">
          <span class="like-heart">${heart}</span>
          <span class="like-text">いいね</span>
          <span class="like-count">${m.likes}</span>
        </button>
        ${deleteBtn}
      </div>
    </div>
  `;
}

markersData.forEach(m => addMarkerFromData(m));




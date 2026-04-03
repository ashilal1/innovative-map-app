import { DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM, LOCATION_ZOOM } from "./config.js";
import { openForm } from "./ui.js";

/* Leaflet map 初期化 */
export function initMap() {
  const map = L.map("map", {
    closePopupOnClick: false
  }).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  return map;
}

/* 地図クリックでフォームを開く */
export function setupMapClick(map) {
  map.on("click", (e) => {
    const t = e.originalEvent?.target;
    if (t && t.closest(".leaflet-popup")) return;

    openForm(e.latlng);
  });
}

/* 現在地取得（許可ダイアログはブラウザが出す） */
export function setupGeolocation(map) {
  if (!navigator.geolocation) {
    alert("ブラウザは位置情報機能に対応していません。");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      map.setView([lat, lng], LOCATION_ZOOM);
    },
    (error) => {
      let msg = "位置情報の取得に失敗しました。";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          msg = "位置情報の利用が拒否されました。";
          break;
        case error.POSITION_UNAVAILABLE:
          msg = "位置情報を特定できませんでした。";
          break;
        case error.TIMEOUT:
          msg = "位置情報の取得がタイムアウトしました。";
          break;
      }
      alert(msg);
    }
  );
}
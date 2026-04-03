import { state } from "./state.js";
import { initAuth } from "./auth.js";
import {
  ui,
  setupImagePreview,
  closeForm,
  lockAddButton,
  unlockAddButton,
  getFormValues
} from "./ui.js";
import { initMap, setupMapClick, setupGeolocation } from "./map.js";
import { loadMarkersFromDB, submitMarker } from "./markers.js";

/* 起動 */
await initAuth();

const map = initMap();
setupGeolocation(map);
setupMapClick(map);

setupImagePreview();
loadMarkersFromDB(map);

/* 追加ボタン */
ui.addBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  if (state.locked) return;
  lockAddButton();

  try {
    const { title, comment, file } = getFormValues();

    await submitMarker(map, {
      latlng: state.clickedLatLng,
      title,
      comment,
      file
    });

    closeForm();
  } catch (err) {
    unlockAddButton();

    if (
      err?.message === "empty" ||
      err?.message === "noclick" ||
      err?.message === "nologin" ||
      err?.message === "noloc"
    ) {
      return;
    }

    console.error(err);
    alert("投稿に失敗しました");
  }
});

/* キャンセル */
ui.cancelBtn.addEventListener("click", (e) => {
  e.preventDefault();
  state.activePinId = null;
  closeForm();
});

/* サイドバー遷移 */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (!btn) return;

  const href = btn.dataset.href || btn.closest(".nav-buttons")?.dataset.href;
  if (!href) return;

  location.href = href;
});

const authModal = document.getElementById("authModal");
const closeAuth = document.getElementById("closeAuth");

document.getElementById("userprofiles").addEventListener("click", () => {
  authModal.style.display = "flex";
});

closeAuth.addEventListener("click", () => {
  authModal.style.display = "none";
});

authModal.addEventListener("click", (e) => {
  if (e.target === authModal) {
    authModal.style.display = "none";
  }
});
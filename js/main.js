import { initUserId, state } from "./state.js";
import { ui, setupImagePreview, closeForm, lockAddButton, unlockAddButton, getFormValues } from "./ui.js";
import { initMap, setupMapClick, setupGeolocation } from "./map.js";
import { loadMarkersFromDB, submitMarker } from "./markers.js";

/* 起動 */
initUserId();

const map = initMap();
setupGeolocation(map);
setupMapClick(map);

setupImagePreview();
loadMarkersFromDB(map);

/* 追加ボタン：1回押したらロックして二重投稿防止 */
ui.addBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  if (state.locked) return;
  lockAddButton();

  try {
    const { title, comment, file } = getFormValues();
    await submitMarker(map, { latlng: state.clickedLatLng, title, comment, file });
    closeForm();
  } catch (err) {
    unlockAddButton();

    if (err?.message === "empty" || err?.message === "noclick") return;
    console.error(err);
    alert("投稿に失敗しました");
  }
});

/* キャンセル */
ui.cancelBtn.addEventListener("click", (e) => {
  e.preventDefault();
  closeForm();
});

/* ユーザーアイコン反映 */
const userAvatarInput = document.getElementById("userAvatarInput");
const userAvatar = document.getElementById("userAvatar");

userAvatarInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  userAvatar.src = URL.createObjectURL(file);
});

/* ヘッダーボタン遷移 */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (!btn) return;

  const href = btn.dataset.href || btn.closest(".nav-buttons")?.dataset.href;
  if (!href) return;

  location.href = href;
});

import { state } from "./state.js";

export const ui = {
  overlay: document.getElementById("overlay"),
  formContainer: document.getElementById("formContainer"),
  titleInput: document.getElementById("titleInput"),
  commentInput: document.getElementById("commentInput"),
  imageInput: document.getElementById("imageInput"),
  imagePreview: document.getElementById("imagePreview"),
  addBtn: document.getElementById("addBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
};

export function setupImagePreview() {
  ui.imageInput.addEventListener("change", () => {
    const file = ui.imageInput.files[0];

    // ファイルが無いならプレビュー消す
    if (!file) {
      ui.imagePreview.src = "";
      ui.imagePreview.style.display = "none";
      return;
    }

    // ローカル画像をプレビュー表示
    const url = URL.createObjectURL(file);
    ui.imagePreview.src = url;
    ui.imagePreview.style.display = "block";
  });
}

export function openForm(latlng) {
  // クリック地点を保存してフォームを表示
  state.clickedLatLng = latlng;
  ui.overlay.style.display = "block";
  ui.formContainer.style.display = "block";
}

export function closeForm() {
  // フォームを閉じて入力をリセット
  ui.overlay.style.display = "none";
  ui.formContainer.style.display = "none";

  ui.titleInput.value = "";
  ui.commentInput.value = "";
  ui.imageInput.value = "";

  ui.imagePreview.src = "";
  ui.imagePreview.style.display = "none";

  state.clickedLatLng = null;

  // 多重クリック防止ロック解除
  state.locked = false;
  ui.addBtn.disabled = false;
}

export function lockAddButton() {
  state.locked = true;
  ui.addBtn.disabled = true;
}

export function unlockAddButton() {
  state.locked = false;
  ui.addBtn.disabled = false;
}

export function getFormValues() {
  return {
    title: ui.titleInput.value.trim(),
    comment: ui.commentInput.value.trim(),
    file: ui.imageInput.files[0] || null,
  };
}

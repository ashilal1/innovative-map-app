export const state = {
  clickedLatLng: null,
  locked: false,
  myUserId: null,
  activePinId: null,
};

export function initUserId() {
  let id = localStorage.getItem("myUserId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("myUserId", id);
  }
  state.myUserId = id;
  return id;
}
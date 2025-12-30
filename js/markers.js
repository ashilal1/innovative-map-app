import { sb } from "./supabase.js";
import { state } from "./state.js";

/* 文字のエスケープ（XSS対策） */
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* ポップアップHTML生成 */
function makePopupHTML(m) {
  const title = escapeHtml(m.title);
  const comment = escapeHtml(m.comment);

  const imageHTML = m.imageDataUrl
    ? `<img class="popup-img js-zoom-img" src="${m.imageDataUrl}" data-src="${m.imageDataUrl}" alt="">`
    : "";

  const heart = m.liked ? "♥" : "♡";
  const likedClass = m.liked ? "is-liked" : "";

  const deleteBtn =
    m.ownerId === state.myUserId
      ? `<button class="delete-btn" data-id="${m.id}" type="button">削除</button>`
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

/* Leaflet marker を作って map に追加 */
export function addMarkerFromData(map, m) {
  const marker = L.marker([m.lat, m.lng]).addTo(map);

  // ポップアップ内の like/delete をイベント委譲で処理
  marker.on("popupopen", () => {
    const popupEl = marker.getPopup().getElement();
    if (!popupEl) return;

    popupEl.addEventListener("click", async (ev) => {
      const likeBtn = ev.target.closest(".like-btn");
      const deleteBtn = ev.target.closest(".delete-btn");
      if (!likeBtn && !deleteBtn) return;

      L.DomEvent.stop(ev);

      // いいね処理（クライアント側で +1/-1 → DB更新）
      if (likeBtn) {
        m.liked = !m.liked;
        m.likes += m.liked ? 1 : -1;
        if (m.likes < 0) m.likes = 0;

        const { error } = await sb.from("markers").update({ likes: m.likes }).eq("id", m.id);

        if (error) {
          console.error(error);
          alert("いいね更新に失敗しました");
          m.liked = !m.liked;
          m.likes += m.liked ? 1 : -1;
          return;
        }

        marker.setPopupContent(makePopupHTML(m));
        return;
      }

      // 削除処理（ownerのみ表示されるボタン）
      if (deleteBtn) {
        if (!confirm("このマーカーを削除しますか？")) return;

        const { error } = await sb.from("markers").delete().eq("id", m.id);

        if (error) {
          console.error(error);
          alert("削除に失敗しました");
          return;
        }

        map.removeLayer(marker);
      }
    });
  });

  marker.bindPopup(makePopupHTML(m));
}

/* 画像を DataURL に変換（簡易版：Storage化するならここを差し替える） */
async function fileToDataUrl(file) {
  if (!file) return "";
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* 投稿（INSERT）して、返ってきた行を map に追加する */
export async function submitMarker(map, { latlng, title, comment, file }) {
  if (!latlng) throw new Error("noclick");

  if (!title && !comment && !file) {
    alert("何か入力してください");
    throw new Error("empty");
  }

  const imageDataUrl = await fileToDataUrl(file);

  const { data, error } = await sb
    .from("markers")
    .insert([
      {
        owner_id: state.myUserId,
        lat: latlng.lat,
        lng: latlng.lng,
        title,
        comment,
        image_url: imageDataUrl,
        likes: 0,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  addMarkerFromData(map, {
    id: data.id,
    ownerId: data.owner_id,
    lat: data.lat,
    lng: data.lng,
    title: data.title ?? "",
    comment: data.comment ?? "",
    imageDataUrl: data.image_url ?? "",
    likes: data.likes ?? 0,
    liked: false,
  });
}

/* DBから全件ロードして map に追加 */
export async function loadMarkersFromDB(map) {
  const { data, error } = await sb.from("markers").select("*").order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    alert("マーカーの取得に失敗しました");
    return;
  }

  data.forEach((row) => {
    addMarkerFromData(map, {
      id: row.id,
      ownerId: row.owner_id,
      lat: row.lat,
      lng: row.lng,
      title: row.title ?? "",
      comment: row.comment ?? "",
      imageDataUrl: row.image_url ?? "",
      likes: row.likes ?? 0,
      liked: false,
    });
  });
}

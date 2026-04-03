import { sb } from "./supabase.js";
import { state } from "./state.js";
import { ui } from "./ui.js";

function createPinIcon(imageUrl) {
  return L.divIcon({
    className: "custom-pin",
    html: `
      <div class="pin-img-wrap">
        <div class="pin-img-circle">
          <img src="${imageUrl || "images/icons/pin-default.png"}" />
        </div>
      </div>
    `,
    iconSize: [56, 64],
    iconAnchor: [24, 24],
    popupAnchor: [0, 0]
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fileToDataUrl(file) {
  if (!file) return "";
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function fetchPosts(pinId, myUserId) {
  const { data: posts, error } = await sb
    .from("pin_posts")
    .select(`
      id,
      pin_id,
      user_id,
      title,
      image_url,
      comment,
      created_at,
      profiles:user_id (
        username,
        avatar_url
      )
    `)
    .eq("pin_id", pinId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const postIds = (posts ?? []).map((post) => post.id);

  if (!postIds.length) {
    return [];
  }

  const { data: likesRows, error: likesError } = await sb
    .from("post_likes")
    .select("post_id, user_id")
    .in("post_id", postIds);

  if (likesError) throw likesError;

  const likesMap = new Map();

  for (const row of likesRows ?? []) {
    if (!likesMap.has(row.post_id)) {
      likesMap.set(row.post_id, new Set());
    }
    likesMap.get(row.post_id).add(row.user_id);
  }

  return (posts ?? [])
    .map((post) => {
      const likedUsers = likesMap.get(post.id) ?? new Set();
      return {
        ...post,
        username: post.profiles?.username || "user",
        avatar_url: post.profiles?.avatar_url || "images/icons/user-default.svg",
        likes: likedUsers.size,
        liked: !!myUserId && likedUsers.has(myUserId)
      };
    })
    .sort((a, b) => {
      // いいね数で降順
      if (b.likes !== a.likes) return b.likes - a.likes;

      // 同数なら新しい順
      return new Date(b.created_at) - new Date(a.created_at);
    });
}

function makePostSection(post, myUserId) {
  if (!post) return "";

  const safeComment = escapeHtml(post.comment || "").replaceAll("\n", "<br>");
  const safeUsername = escapeHtml(post.username || "user");
  const heartClass = post.liked ? "is-liked" : "";
  const deleteBtn =
    post.user_id === myUserId
      ? `<button class="delete-post-btn" data-post-id="${post.id}" type="button">削除</button>`
      : "";

  return `
    <div class="popup-post-area">
      <div class="popup-user-row">
        <div class="popup-user-left">
          <img class="popup-user-avatar" src="${post.avatar_url || "images/icons/user-default.svg"}" alt="${safeUsername}">
          <div class="popup-user-texts">
            <div class="popup-user-name">${safeUsername}</div>
            <div class="popup-user-sub">${new Date(post.created_at).toLocaleDateString("ja-JP")}</div>
          </div>
        </div>
      </div>

      <div class="popup-actions top-actions">
        <button class="toggle-comment-btn" type="button">コメントを見る</button>
        <button class="like-btn ${heartClass}" data-post-id="${post.id}" type="button">
          <span class="like-heart"></span>
          <span class="like-text">いいね</span>
          <span class="like-count">${post.likes}</span>
        </button>
        ${deleteBtn}
      </div>

      <div class="popup-comment-box" hidden>
        ${safeComment || "コメントはまだありません"}
      </div>
    </div>
  `;
}

function makePopupHTML(pin, posts, index = 0, myUserId = null) {
  if (!posts.length) {
    const fallbackTitle = escapeHtml(pin.title || "スポット");
    return `
      <div class="popup pin-popup">
        <div class="popup-title">${fallbackTitle}</div>
        <div class="popup-comment empty-post-text">まだ投稿がありません</div>
        <div class="popup-actions">
          <button class="add-post-btn" data-pin-id="${pin.id}" type="button">この場所に投稿</button>
        </div>
      </div>
    `;
  }

  const safeIndex = Math.max(0, Math.min(index, posts.length - 1));
  const current = posts[safeIndex];
  const currentTitle = escapeHtml(current.title || pin.title || "スポット");
  const page = `${safeIndex + 1} / ${posts.length}`;
  const canMove = posts.length > 1;

  return `
    <div class="popup pin-popup">
      <div class="popup-title">${currentTitle}</div>

      <div class="gallery-wrap">
        <button class="gallery-btn prev-post-btn" type="button" ${canMove ? "" : "disabled"}>‹</button>
        <img class="popup-img gallery-img" src="${current.image_url || ""}" alt="投稿画像">
        <button class="gallery-btn next-post-btn" type="button" ${canMove ? "" : "disabled"}>›</button>
      </div>

      <div class="gallery-meta">${page}</div>
      ${makePostSection(current, myUserId)}

      <div class="popup-actions bottom-actions">
        <button class="add-post-btn" data-pin-id="${pin.id}" type="button">この場所に投稿</button>
      </div>
    </div>
  `;
}

function showAddPostForm(pinId) {
  state.activePinId = pinId;
  state.clickedLatLng = null;
  ui.overlay.style.display = "block";
  ui.formContainer.style.display = "block";
}

async function rerenderPopup(marker, pin, postsRef, indexRef) {
  postsRef.value = await fetchPosts(pin.id, state.myUserId);

  if (!postsRef.value.length) {
    indexRef.value = 0;
  } else if (indexRef.value > postsRef.value.length - 1) {
    indexRef.value = postsRef.value.length - 1;
  }

  marker.setPopupContent(makePopupHTML(pin, postsRef.value, indexRef.value, state.myUserId));
  marker.openPopup();
}

async function toggleLike(postId) {
  if (!state.myUserId) {
    alert("ログインしてください");
    return;
  }

  const { data: existing, error: existingError } = await sb
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", state.myUserId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error: deleteError } = await sb
      .from("post_likes")
      .delete()
      .eq("id", existing.id);

    if (deleteError) throw deleteError;
    return;
  }

  const { error: insertError } = await sb
    .from("post_likes")
    .insert([
      {
        post_id: postId,
        user_id: state.myUserId
      }
    ]);

  if (insertError) throw insertError;
}

async function deletePost(postId, pinId, marker, map) {
  if (!state.myUserId) {
    alert("ログインしてください");
    return { deleted: false, removedPin: false };
  }

  const { data: post, error: postError } = await sb
    .from("pin_posts")
    .select("id, user_id")
    .eq("id", postId)
    .maybeSingle();

  if (postError) throw postError;

  if (!post) {
    alert("投稿が見つかりません");
    return { deleted: false, removedPin: false };
  }

  if (post.user_id !== state.myUserId) {
    alert("自分の投稿だけ削除できます");
    return { deleted: false, removedPin: false };
  }

  if (!confirm("この投稿を削除しますか？")) {
    return { deleted: false, removedPin: false };
  }

  const { error: likeDeleteError } = await sb
    .from("post_likes")
    .delete()
    .eq("post_id", postId);

  if (likeDeleteError) throw likeDeleteError;

  const { error: deleteError } = await sb
    .from("pin_posts")
    .delete()
    .eq("id", postId);

  if (deleteError) throw deleteError;

  const { count, error: countError } = await sb
    .from("pin_posts")
    .select("*", { count: "exact", head: true })
    .eq("pin_id", pinId);

  if (countError) throw countError;

  if ((count || 0) === 0) {
    const { error: pinDeleteError } = await sb
      .from("pins")
      .delete()
      .eq("id", pinId);

    if (pinDeleteError) throw pinDeleteError;

    map.removeLayer(marker);
    return { deleted: true, removedPin: true };
  }

  return { deleted: true, removedPin: false };
}

function attachPopupEvents(map, marker, pin, postsRef, indexRef) {
  const popupEl = marker.getPopup()?.getElement();
  if (!popupEl) return;

  popupEl.onclick = async (e) => {
    const addBtn = e.target.closest(".add-post-btn");
    const prevBtn = e.target.closest(".prev-post-btn");
    const nextBtn = e.target.closest(".next-post-btn");
    const likeBtn = e.target.closest(".like-btn");
    const deleteBtn = e.target.closest(".delete-post-btn");
    const commentBtn = e.target.closest(".toggle-comment-btn");

    if (!addBtn && !prevBtn && !nextBtn && !likeBtn && !deleteBtn && !commentBtn) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    try {
      if (addBtn) {
        showAddPostForm(pin.id);
        return;
      }

      if (prevBtn && postsRef.value.length > 1) {
        indexRef.value = (indexRef.value - 1 + postsRef.value.length) % postsRef.value.length;
        marker.setIcon(createPinIcon(postsRef.value[0]?.image_url));

        marker.setPopupContent(makePopupHTML(pin, postsRef.value, indexRef.value, state.myUserId));
        marker.openPopup();
        return;
      }

      if (nextBtn && postsRef.value.length > 1) {
        indexRef.value = (indexRef.value + 1) % postsRef.value.length;
        marker.setIcon(createPinIcon(postsRef.value[0]?.image_url));

        marker.setPopupContent(makePopupHTML(pin, postsRef.value, indexRef.value, state.myUserId));
        marker.openPopup();
        return;
      }

      if (commentBtn) {
        const box = popupEl.querySelector(".popup-comment-box");
        if (!box) return;
        const isHidden = box.hasAttribute("hidden");
        if (isHidden) {
          box.removeAttribute("hidden");
          commentBtn.textContent = "コメントを閉じる";
        } else {
          box.setAttribute("hidden", "");
          commentBtn.textContent = "コメントを見る";
        }
        return;
      }

      if (likeBtn) {
        const postId = likeBtn.dataset.postId;
        if (!postId) return;
        await toggleLike(postId);
        await rerenderPopup(marker, pin, postsRef, indexRef);
        return;
      }

      if (deleteBtn) {
        const postId = deleteBtn.dataset.postId;
        if (!postId) return;

        const result = await deletePost(postId, pin.id, marker, map);
        if (!result.deleted) return;
        if (result.removedPin) return;

        await rerenderPopup(marker, pin, postsRef, indexRef);
      }
    } catch (error) {
      console.error(error);
      alert("処理に失敗しました");
    }
  };
}

export function addPinFromData(map, pin) {
  const marker = L.marker([pin.lat, pin.lng], {
    icon: createPinIcon()
  }).addTo(map);
  const postsRef = { value: [] };
  const indexRef = { value: 0 };

  marker.bindPopup(makePopupHTML(pin, [], 0, state.myUserId), {
    autoClose: false,
    closeOnClick: false
  });

  marker.on("click", async () => {
    try {
      postsRef.value = await fetchPosts(pin.id, state.myUserId);
      indexRef.value = 0;
      marker.setIcon(createPinIcon(postsRef.value[0]?.image_url));
      marker.setPopupContent(makePopupHTML(pin, postsRef.value, indexRef.value, state.myUserId));
      marker.openPopup();
    } catch (error) {
      console.error(error);
      alert("投稿の取得に失敗しました");
    }
  });

  marker.on("popupopen", () => {
    attachPopupEvents(map, marker, pin, postsRef, indexRef);
  });
}

export async function submitMarker(map, { latlng, title, comment, file }) {
  if (!state.myUserId) {
    alert("ログインしてください");
    throw new Error("nologin");
  }

  if (!latlng && !state.activePinId) {
    throw new Error("noclick");
  }

  if (!title && !comment && !file) {
    alert("何か入力してください");
    throw new Error("empty");
  }

  const imageDataUrl = await fileToDataUrl(file);

  if (state.activePinId) {
    const { data: pinRow, error: pinFetchError } = await sb
      .from("pins")
      .select("id, title")
      .eq("id", state.activePinId)
      .single();

    if (pinFetchError) throw pinFetchError;

    const { error } = await sb
      .from("pin_posts")
      .insert([
        {
          pin_id: state.activePinId,
          user_id: state.myUserId,
          title: title || pinRow.title || "スポット",
          image_url: imageDataUrl,
          comment
        }
      ]);

    if (error) throw error;

    state.activePinId = null;
    location.reload();
    return;
  }

  const baseTitle = title || "スポット";

  const { data: pinData, error: pinError } = await sb
    .from("pins")
    .insert([
      {
        lat: latlng.lat,
        lng: latlng.lng,
        title: baseTitle,
        creator_id: state.myUserId
      }
    ])
    .select()
    .single();

  if (pinError) throw pinError;

  const { error: postError } = await sb
    .from("pin_posts")
    .insert([
      {
        pin_id: pinData.id,
        user_id: state.myUserId,
        title: baseTitle,
        image_url: imageDataUrl,
        comment
      }
    ]);

  if (postError) throw postError;

  addPinFromData(map, {
    id: pinData.id,
    lat: pinData.lat,
    lng: pinData.lng,
    title: pinData.title ?? "スポット"
  });

  state.activePinId = null;
}

export async function loadMarkersFromDB(map) {
  const { data, error } = await sb
    .from("pins")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    alert("ピンの取得に失敗しました");
    return;
  }

  data.forEach((row) => {
    addPinFromData(map, {
      id: row.id,
      lat: row.lat,
      lng: row.lng,
      title: row.title ?? "スポット"
    });
  });
}